const std = @import("std");
const indexer = @import("indexer.zig");

pub const TextMatch = struct {
    file: []const u8,
    path: []const u8,
    line: usize,
    column: usize,
    line_text: []const u8,
};

pub const TextSearchResult = struct {
    matches: []const TextMatch,
    total_matches: usize,
    files_searched: usize,
    elapsed_ms: i64,
};

pub const TextSearchOptions = struct {
    case_sensitive: bool = false,
    whole_word: bool = false,
    max_results: usize = 100,
};

/// Files larger than this are memory-mapped instead of copied into a scratch
/// buffer. Small files are far cheaper to read into a reusable buffer than to
/// mmap, because each mapping costs an extra syscall pair and page faults.
const MAX_BUFFERED_FILE: usize = 8 * 1024 * 1024;

/// A NUL byte in the first chunk marks the file as binary and skips it.
const BINARY_SNIFF_BYTES: usize = 8192;
const MAX_PREVIEW_BYTES: usize = 240;

/// Upper bound on worker threads per search. The Io implementation keeps its
/// worker threads alive between requests, so this is warmed up by the first
/// search and reused afterwards.
const MAX_SHARDS: usize = 16;

const BINARY_EXTS = [_][]const u8{
    ".png", ".jpg", ".jpeg",  ".gif",  ".ico",   ".icns", ".webp", ".bmp",  ".avif",
    ".pdf", ".zip", ".tar",   ".gz",   ".7z",    ".rar",  ".wasm", ".node", ".exe",
    ".dll", ".so",  ".dylib", ".woff", ".woff2", ".ttf",  ".eot",  ".otf",  ".mp3",
    ".mp4", ".mov", ".avi",   ".mkv",  ".bin",   ".dat",  ".o",    ".a",
};

pub fn isBinaryExtension(path: []const u8) bool {
    const ext = std.Io.Dir.path.extension(path);
    for (BINARY_EXTS) |b| {
        if (std.ascii.eqlIgnoreCase(ext, b)) return true;
    }
    return false;
}

pub fn searchInLine(line: []const u8, query: []const u8, case_sensitive: bool) ?usize {
    if (query.len == 0 or line.len < query.len) return null;
    if (case_sensitive) {
        return std.mem.find(u8, line, query);
    } else {
        return std.ascii.findIgnoreCase(line, query);
    }
}

/// Reusable per-process state for full-text search.
///
/// The scratch buffers are deliberately kept alive between requests: they grow
/// to the largest file a worker sees and are then reused, so steady-state
/// searching does almost no allocation.
pub const Engine = struct {
    buffers: [MAX_SHARDS]std.ArrayList(u8),

    pub fn init() Engine {
        var engine: Engine = undefined;
        for (&engine.buffers) |*buffer| buffer.* = .empty;
        return engine;
    }

    pub fn deinit(self: *Engine, gpa: std.mem.Allocator) void {
        for (&self.buffers) |*buffer| buffer.deinit(gpa);
    }

    /// Scans the index using a sequential front shard plus parallel workers,
    /// appending at most `options.max_results` matches to `results` (allocated
    /// from `arena`, the per-request arena). Returns the number of files that
    /// were opened.
    pub fn search(
        self: *Engine,
        arena: std.mem.Allocator,
        gpa: std.mem.Allocator,
        io: std.Io,
        entries: []const indexer.FileEntry,
        query: []const u8,
        options: TextSearchOptions,
        results: *std.ArrayList(TextMatch),
    ) !usize {
        if (query.len == 0 or options.max_results == 0 or entries.len == 0) return 0;

        const cpu_count = std.Thread.getCpuCount() catch 1;
        const shard_count = @min(@min(cpu_count, MAX_SHARDS), entries.len);

        if (shard_count <= 1) return self.searchSequential(arena, gpa, io, entries, query, options, results);

        // Phase A: the first shard always runs on the calling thread. Common
        // queries usually fill their result budget here, which keeps the
        // early-exit behavior of the sequential scanner and avoids touching
        // any worker threads at all.
        const base = entries.len / shard_count;
        const extra = entries.len % shard_count;
        const front_len = base + @intFromBool(extra > 0);

        var front = Shard.init(gpa, &self.buffers[0], entries[0..front_len], query, options);
        defer front.deinit();
        front.run(io);

        var files_searched = front.files_searched;

        if (front.matches.items.len >= options.max_results or front_len == entries.len) {
            try appendShard(&front, arena, options.max_results, results);
            return files_searched;
        }

        // Phase B: the rest of the index is split across the remaining
        // workers. Each worker may only contribute what is still missing and
        // the group stops as soon as the budget is filled. Shard lists are
        // merged in index order, so results stay ordered by directory; the
        // exact matches near the cutoff may depend on which worker wins.
        const rest = entries[front_len..];
        const worker_count = @min(shard_count - 1, rest.len);
        if (worker_count == 0) {
            try appendShard(&front, arena, options.max_results, results);
            return files_searched;
        }

        const worker_options = TextSearchOptions{
            .case_sensitive = options.case_sensitive,
            .whole_word = options.whole_word,
            .max_results = options.max_results - front.matches.items.len,
        };

        // Shared remaining budget: as soon as the workers collectively find
        // enough matches, every worker stops instead of each one filling a
        // private quota. This keeps common queries close to the sequential
        // early-exit cost.
        var worker_found = std.atomic.Value(usize).init(0);
        const worker_limit = worker_options.max_results;

        var shards: [MAX_SHARDS]Shard = undefined;
        var shard_used: usize = 0;
        defer {
            for (shards[0..shard_used]) |*shard| shard.deinit();
        }

        const worker_base = rest.len / worker_count;
        const worker_extra = rest.len % worker_count;
        var cursor: usize = 0;
        for (0..worker_count) |index| {
            const len = worker_base + @intFromBool(index < worker_extra);
            const end = cursor + len;
            shards[index] = Shard.init(
                gpa,
                &self.buffers[index + 1],
                rest[cursor..end],
                query,
                worker_options,
            );
            shards[index].found = &worker_found;
            shards[index].limit = worker_limit;
            shard_used = index + 1;
            cursor = end;
        }

        var futures: [MAX_SHARDS]?std.Io.Future(void) = @splat(null);
        for (shards[0..worker_count], 0..) |*shard, index| {
            futures[index] = io.concurrent(Shard.run, .{ shard, io }) catch blk: {
                // No concurrency available (single-threaded build, resource
                // exhaustion): run this shard inline instead of failing.
                shard.run(io);
                break :blk null;
            };
        }
        for (futures[0..worker_count]) |*future| {
            if (future.*) |*pending| pending.await(io);
        }

        for (shards[0..worker_count]) |*shard| files_searched += shard.files_searched;

        try appendShard(&front, arena, options.max_results, results);
        outer: for (shards[0..worker_count]) |*shard| {
            for (shard.matches.items) |match| {
                if (results.items.len >= options.max_results) break :outer;
                try appendMatch(arena, match, results);
            }
        }
        return files_searched;
    }

    fn searchSequential(
        self: *Engine,
        arena: std.mem.Allocator,
        gpa: std.mem.Allocator,
        io: std.Io,
        entries: []const indexer.FileEntry,
        query: []const u8,
        options: TextSearchOptions,
        results: *std.ArrayList(TextMatch),
    ) !usize {
        var files_searched: usize = 0;
        for (entries) |entry| {
            if (results.items.len >= options.max_results) break;
            files_searched += 1;
            searchFile(arena, gpa, io, entry, query, options, &self.buffers[0], results) catch continue;
        }
        return files_searched;
    }
};

fn appendShard(
    shard: *Shard,
    arena: std.mem.Allocator,
    max_results: usize,
    results: *std.ArrayList(TextMatch),
) !void {
    for (shard.matches.items) |match| {
        if (results.items.len >= max_results) return;
        try appendMatch(arena, match, results);
    }
}

fn appendMatch(
    arena: std.mem.Allocator,
    match: TextMatch,
    results: *std.ArrayList(TextMatch),
) !void {
    try results.append(arena, .{
        .file = match.file,
        .path = match.path,
        .line = match.line,
        .column = match.column,
        .line_text = try arena.dupe(u8, match.line_text),
    });
}

const Shard = struct {
    arena: std.heap.ArenaAllocator,
    buffer: *std.ArrayList(u8),
    entries: []const indexer.FileEntry,
    query: []const u8,
    options: TextSearchOptions,
    matches: std.ArrayList(TextMatch),
    files_searched: usize,
    /// Shared count of matches found by all worker shards; null for the front
    /// shard, which runs alone and is bounded by its own options.
    found: ?*std.atomic.Value(usize) = null,
    limit: usize = 0,

    fn init(
        gpa: std.mem.Allocator,
        buffer: *std.ArrayList(u8),
        entries: []const indexer.FileEntry,
        query: []const u8,
        options: TextSearchOptions,
    ) Shard {
        return .{
            .arena = std.heap.ArenaAllocator.init(gpa),
            .buffer = buffer,
            .entries = entries,
            .query = query,
            .options = options,
            .matches = .empty,
            .files_searched = 0,
        };
    }

    fn run(self: *Shard, io: std.Io) void {
        const arena = self.arena.allocator();
        const gpa = self.arena.child_allocator;
        for (self.entries) |entry| {
            if (self.matches.items.len >= self.options.max_results) break;
            if (self.found) |found| {
                if (found.load(.monotonic) >= self.limit) break;
            }
            self.files_searched += 1;
            const before = self.matches.items.len;
            searchFile(arena, gpa, io, entry, self.query, self.options, self.buffer, &self.matches) catch {};
            if (self.found) |found| {
                const added = self.matches.items.len - before;
                if (added != 0) _ = found.fetchAdd(added, .monotonic);
            }
        }
    }

    fn deinit(self: *Shard) void {
        // Everything in `matches` and its strings lives in this arena.
        self.arena.deinit();
    }
};

pub fn searchFile(
    arena: std.mem.Allocator,
    gpa: std.mem.Allocator,
    io: std.Io,
    entry: indexer.FileEntry,
    query: []const u8,
    options: TextSearchOptions,
    scratch: *std.ArrayList(u8),
    results: *std.ArrayList(TextMatch),
) !void {
    if (isBinaryExtension(entry.path)) return;

    var file = std.Io.Dir.cwd().openFile(io, entry.path, .{}) catch return;
    defer file.close(io);

    const stat = file.stat(io) catch return;
    if (stat.kind != .file or stat.size == 0) return;
    const size = std.math.cast(usize, stat.size) orelse return;

    if (size > MAX_BUFFERED_FILE) {
        var mapping = file.createMemoryMap(io, .{
            .len = size,
            .protection = .{ .read = true, .write = false },
            .populate = false,
        }) catch return;
        defer mapping.destroy(io);
        try searchContent(arena, entry, mapping.memory, query, options, results);
        return;
    }

    try scratch.ensureTotalCapacity(gpa, size);
    scratch.items.len = size;

    var read_buf: [32768]u8 = undefined;
    var reader = file.reader(io, &read_buf);
    reader.interface.readSliceAll(scratch.items) catch return;

    try searchContent(arena, entry, scratch.items, query, options, results);
}

fn isWordChar(c: u8) bool {
    return std.ascii.isAlphanumeric(c) or c == '_';
}

fn isWordBoundary(content: []const u8, hit: usize, needle_len: usize) bool {
    if (hit > 0 and isWordChar(content[hit - 1])) return false;
    const after = hit + needle_len;
    if (after < content.len and isWordChar(content[after])) return false;
    return true;
}

pub fn sanitizeUtf8(arena: std.mem.Allocator, bytes: []const u8) ![]const u8 {
    if (std.unicode.utf8ValidateSlice(bytes)) {
        return arena.dupe(u8, bytes);
    }
    var out: std.ArrayList(u8) = .empty;
    var i: usize = 0;
    while (i < bytes.len) {
        const len = std.unicode.utf8ByteSequenceLength(bytes[i]) catch {
            try out.appendSlice(arena, "\xef\xbf\xbd");
            i += 1;
            continue;
        };
        if (i + len <= bytes.len and std.unicode.utf8ValidateSlice(bytes[i .. i + len])) {
            try out.appendSlice(arena, bytes[i .. i + len]);
            i += len;
        } else {
            try out.appendSlice(arena, "\xef\xbf\xbd");
            i += 1;
        }
    }
    return out.items;
}

/// Scans `content` once, reporting at most one match per line (the same
/// semantics as the previous line-by-line implementation).
fn searchContent(
    arena: std.mem.Allocator,
    entry: indexer.FileEntry,
    content: []const u8,
    query: []const u8,
    options: TextSearchOptions,
    results: *std.ArrayList(TextMatch),
) !void {
    if (query.len == 0 or content.len < query.len) return;

    // The previous per-line scanner could never match a query containing a
    // newline, because lines are split before matching. Preserve that contract.
    if (std.mem.findScalar(u8, query, '\n') != null) return;

    const sniff_len = @min(content.len, BINARY_SNIFF_BYTES);
    if (std.mem.findScalar(u8, content[0..sniff_len], 0) != null) return;

    var cursor: usize = 0;
    var line_start: usize = 0;
    var line_num: usize = 1;

    while (results.items.len < options.max_results) {
        const found = if (options.case_sensitive)
            indexOf(content, query, cursor)
        else
            indexOfIgnoreCase(content, query, cursor);
        const hit = found orelse return;

        // Advance the line bookkeeping to the line that contains `hit`.
        var scan = line_start;
        while (std.mem.findScalar(u8, content[scan..hit], '\n')) |offset| {
            scan += offset + 1;
            line_num += 1;
        }
        line_start = scan;

        if (options.whole_word and !isWordBoundary(content, hit, query.len)) {
            cursor = hit + 1;
            continue;
        }

        const newline = std.mem.findScalar(u8, content[hit..], '\n');
        const line_end = if (newline) |offset| hit + offset else content.len;
        const raw_line = content[line_start..line_end];
        const trimmed = std.mem.trimEnd(u8, raw_line, "\r");
        const preview_len = @min(trimmed.len, MAX_PREVIEW_BYTES);

        try results.append(arena, .{
            .file = entry.relative_path,
            .path = entry.path,
            .line = line_num,
            .column = hit - line_start + 1,
            .line_text = try sanitizeUtf8(arena, trimmed[0..preview_len]),
        });

        if (line_end >= content.len) return;
        // Only the first match of a line is reported, matching old behavior.
        cursor = line_end + 1;
    }
}

/// Case-sensitive substring search.
///
/// `std.mem.find` rebuilds a Boyer-Moore-Horspool table per call; calling it
/// per line was the dominant cost of the old scanner. This uses a SIMD
/// `findScalar` pass over the whole file for the rarest query byte, then
/// verifies only the candidates.
fn indexOf(content: []const u8, needle: []const u8, start: usize) ?usize {
    if (needle.len == 0) return start;
    if (needle.len > content.len) return null;
    if (start > content.len - needle.len) return null;

    const anchor_rel = chooseAnchor(needle, false);
    const anchor = needle[anchor_rel];
    var from = start + anchor_rel;

    while (from <= content.len) {
        const offset = std.mem.findScalar(u8, content[from..], anchor) orelse return null;
        const anchor_pos = from + offset;
        const candidate = anchor_pos - anchor_rel;
        if (candidate + needle.len <= content.len and
            std.mem.eql(u8, content[candidate..][0..needle.len], needle))
        {
            return candidate;
        }
        from = anchor_pos + 1;
    }
    return null;
}

/// Case-insensitive substring search with the same anchor strategy, scanning
/// for both case variants of the anchor byte and verifying with ASCII folding.
fn indexOfIgnoreCase(content: []const u8, needle: []const u8, start: usize) ?usize {
    if (needle.len == 0) return start;
    if (needle.len > content.len) return null;
    if (start > content.len - needle.len) return null;

    const anchor_rel = chooseAnchor(needle, true);
    const anchor_lower = std.ascii.toLower(needle[anchor_rel]);
    const anchor_upper = std.ascii.toUpper(anchor_lower);
    const first = start + anchor_rel;

    var lower_next = findByteFrom(content, anchor_lower, first);
    var upper_next = if (anchor_upper == anchor_lower)
        null
    else
        findByteFrom(content, anchor_upper, first);

    while (true) {
        const anchor_pos = blk: {
            if (lower_next) |lower| {
                if (upper_next) |upper| break :blk @min(lower, upper);
                break :blk lower;
            }
            break :blk upper_next orelse return null;
        };

        const candidate = anchor_pos - anchor_rel;
        if (candidate + needle.len <= content.len and
            std.ascii.eqlIgnoreCase(content[candidate..][0..needle.len], needle))
        {
            return candidate;
        }

        if (lower_next == anchor_pos) {
            lower_next = findByteFrom(content, anchor_lower, anchor_pos + 1);
        } else {
            upper_next = findByteFrom(content, anchor_upper, anchor_pos + 1);
        }
    }
}

fn findByteFrom(haystack: []const u8, byte: u8, from: usize) ?usize {
    if (from >= haystack.len) return null;
    const offset = std.mem.findScalar(u8, haystack[from..], byte) orelse return null;
    return from + offset;
}

/// Picks the query byte that is least common in source code, so the SIMD scan
/// rejects the file as quickly as possible and verification runs rarely.
fn chooseAnchor(needle: []const u8, ignore_case: bool) usize {
    var best_index: usize = 0;
    var best_score: u8 = std.math.maxInt(u8);
    for (needle, 0..) |byte, index| {
        const normalized = if (ignore_case) std.ascii.toLower(byte) else byte;
        const score = commonness(normalized);
        if (score < best_score) {
            best_score = score;
            best_index = index;
        }
    }
    return best_index;
}

/// Rough byte frequency in source code. Higher means more common.
fn commonness(byte: u8) u8 {
    return switch (byte) {
        ' ' => 250,
        '\n' => 245,
        '\t' => 200,
        'e' => 240,
        't' => 235,
        'a' => 230,
        'o' => 225,
        'i' => 220,
        'n' => 215,
        's' => 210,
        'r' => 205,
        'h' => 198,
        'l' => 195,
        'd' => 190,
        'c' => 185,
        'u' => 180,
        'm' => 175,
        'f' => 170,
        'p' => 165,
        'g' => 160,
        'w' => 155,
        'y' => 150,
        'b' => 145,
        'v' => 135,
        'k' => 120,
        'x' => 110,
        'j' => 100,
        'q' => 95,
        'z' => 90,
        '0'...'9' => 130,
        '_' => 150,
        '.' => 140,
        '/' => 135,
        '-' => 130,
        ':' => 125,
        ';' => 120,
        '(', ')', '{', '}', '[', ']', '<', '>', '=', '+', '*', '&', '|', '!', '?', ',', '"', '\'', '\\', '#', '$', '%', '@', '^', '~', '`' => 60,
        else => 40,
    };
}

test "searchInLine matching" {
    const line = "export function killAllTerminals(): void {";
    const m1 = searchInLine(line, "killallterminals", false);
    try std.testing.expectEqual(@as(?usize, 16), m1);

    const m2 = searchInLine(line, "killallterminals", true);
    try std.testing.expectEqual(@as(?usize, null), m2);

    const m3 = searchInLine(line, "killAllTerminals", true);
    try std.testing.expectEqual(@as(?usize, 16), m3);
}

test "searchContent reports one match per line with line and column" {
    const content =
        "first line\n" ++
        "const FileTree = makeTree()\n" ++
        "filetree again\n" ++
        "last\r\n";

    const entry = indexer.FileEntry{ .name = "test.ts", .path = "/x/test.ts", .relative_path = "test.ts" };

    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    var results: std.ArrayList(TextMatch) = .empty;
    try searchContent(arena.allocator(), entry, content, "filetree", .{ .max_results = 10 }, &results);

    try std.testing.expectEqual(@as(usize, 2), results.items.len);
    try std.testing.expectEqual(@as(usize, 2), results.items[0].line);
    try std.testing.expectEqual(@as(usize, 7), results.items[0].column);
    try std.testing.expectEqualStrings("const FileTree = makeTree()", results.items[0].line_text);
    try std.testing.expectEqual(@as(usize, 3), results.items[1].line);
    try std.testing.expectEqual(@as(usize, 1), results.items[1].column);
}

test "searchContent does not match across a newline" {
    const entry = indexer.FileEntry{ .name = "x", .path = "/x/x", .relative_path = "x" };
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    var results: std.ArrayList(TextMatch) = .empty;
    try searchContent(arena.allocator(), entry, "abc\ndef", "cd", .{}, &results);
    try std.testing.expectEqual(@as(usize, 0), results.items.len);
}

test "searchContent skips binary content" {
    const entry = indexer.FileEntry{ .name = "x", .path = "/x/x", .relative_path = "x" };
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    var results: std.ArrayList(TextMatch) = .empty;
    try searchContent(arena.allocator(), entry, "hello\x00needle", "needle", .{}, &results);
    try std.testing.expectEqual(@as(usize, 0), results.items.len);
}

const NaiveMatch = struct {
    line: usize,
    column: usize,
    text: []const u8,
};

fn naiveSearch(
    allocator: std.mem.Allocator,
    content: []const u8,
    query: []const u8,
    case_sensitive: bool,
    max_results: usize,
    out: *std.ArrayList(NaiveMatch),
) !void {
    var line_start: usize = 0;
    var line_num: usize = 1;
    while (line_start <= content.len and out.items.len < max_results) {
        const newline = std.mem.findScalar(u8, content[line_start..], '\n');
        const line_end = if (newline) |offset| line_start + offset else content.len;
        const line = content[line_start..line_end];
        if (searchInLine(line, query, case_sensitive)) |column| {
            const trimmed = std.mem.trimEnd(u8, line, "\r");
            const preview_len = @min(trimmed.len, MAX_PREVIEW_BYTES);
            try out.append(allocator, .{
                .line = line_num,
                .column = column + 1,
                .text = try allocator.dupe(u8, trimmed[0..preview_len]),
            });
        }
        if (newline == null) break;
        line_start = line_end + 1;
        line_num += 1;
    }
}

test "searchContent matches the naive line scanner on random input" {
    const alphabet = "abAB/_-. \r\nzZ9";
    var prng = std.Random.DefaultPrng.init(0x5eed);
    const random = prng.random();

    var case_index: usize = 0;
    for (0..300) |iteration| {
        var content_buf: [512]u8 = undefined;
        const content_len = random.intRangeAtMost(usize, 0, content_buf.len);
        for (content_buf[0..content_len]) |*byte| {
            byte.* = alphabet[random.intRangeLessThan(usize, 0, alphabet.len)];
        }

        var query_buf: [4]u8 = undefined;
        const query_len = random.intRangeAtMost(usize, 1, query_buf.len);
        for (query_buf[0..query_len]) |*byte| {
            byte.* = alphabet[random.intRangeLessThan(usize, 0, alphabet.len)];
        }

        const case_sensitive = (case_index & 1) == 0;
        case_index += 1;

        var naive_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        defer naive_arena.deinit();
        var naive: std.ArrayList(NaiveMatch) = .empty;
        try naiveSearch(naive_arena.allocator(), content_buf[0..content_len], query_buf[0..query_len], case_sensitive, 7, &naive);

        var actual_arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        defer actual_arena.deinit();
        var actual: std.ArrayList(TextMatch) = .empty;
        const entry = indexer.FileEntry{ .name = "f", .path = "/f", .relative_path = "f" };
        try searchContent(actual_arena.allocator(), entry, content_buf[0..content_len], query_buf[0..query_len], .{ .case_sensitive = case_sensitive, .max_results = 7 }, &actual);

        try std.testing.expectEqual(naive.items.len, actual.items.len);
        for (naive.items, actual.items) |expected, found| {
            try std.testing.expectEqual(expected.line, found.line);
            try std.testing.expectEqual(expected.column, found.column);
            try std.testing.expectEqualStrings(expected.text, found.line_text);
        }

        std.mem.doNotOptimizeAway(iteration);
    }
}

test "searchContent whole word boundary filtering" {
    const entry = indexer.FileEntry{ .name = "test.ts", .path = "/test.ts", .relative_path = "test.ts" };
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    const text =
        \\export function killAllTerminals(): void {}
        \\const term = Terminal;
        \\// (Terminal) instance
    ;

    var normal_results: std.ArrayList(TextMatch) = .empty;
    try searchContent(arena.allocator(), entry, text, "Terminal", .{ .whole_word = false }, &normal_results);
    try std.testing.expectEqual(@as(usize, 3), normal_results.items.len);

    var whole_results: std.ArrayList(TextMatch) = .empty;
    try searchContent(arena.allocator(), entry, text, "Terminal", .{ .whole_word = true }, &whole_results);
    try std.testing.expectEqual(@as(usize, 2), whole_results.items.len);
    try std.testing.expectEqual(@as(usize, 2), whole_results.items[0].line);
    try std.testing.expectEqual(@as(usize, 14), whole_results.items[0].column);
    try std.testing.expectEqual(@as(usize, 3), whole_results.items[1].line);
}

test "sanitizeUtf8 ensures valid UTF-8 output" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    const valid = "Hello, world! 🚀";
    const out1 = try sanitizeUtf8(arena.allocator(), valid);
    try std.testing.expectEqualStrings(valid, out1);

    const invalid = "Latin \xa0 char";
    const out2 = try sanitizeUtf8(arena.allocator(), invalid);
    try std.testing.expect(std.unicode.utf8ValidateSlice(out2));
}
