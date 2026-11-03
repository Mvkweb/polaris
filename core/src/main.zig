const std = @import("std");
pub const protocol = @import("protocol.zig");
pub const indexer = @import("indexer.zig");
pub const matcher = @import("matcher.zig");
pub const text_search = @import("text_search.zig");

fn compareSearchResults(_: void, a: protocol.SearchResult, b: protocol.SearchResult) bool {
    return a.score > b.score;
}

pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const gpa = init.gpa;

    var index = indexer.WorkspaceIndex.init(gpa);
    defer index.deinit();

    var scratch_arena = std.heap.ArenaAllocator.init(gpa);
    defer scratch_arena.deinit();

    var text_engine = text_search.Engine.init();
    defer text_engine.deinit(gpa);

    var in_buf: [262144]u8 = undefined;
    var reader = std.Io.File.stdin().reader(io, &in_buf);

    var out_buf: [262144]u8 = undefined;
    var writer = std.Io.File.stdout().writer(io, &out_buf);
    const stdout = &writer.interface;

    while (try reader.interface.takeDelimiter('\n')) |raw_line| {
        defer _ = scratch_arena.reset(.retain_capacity);
        const scratch = scratch_arena.allocator();

        const line = std.mem.trimEnd(u8, raw_line, "\r \t");
        if (line.len == 0) continue;

        const req = protocol.parseRequest(scratch, line) catch |err| {
            try protocol.writeError(stdout, null, @errorName(err));
            try stdout.flush();
            continue;
        };

        if (std.mem.eql(u8, req.method, "ping")) {
            try protocol.writeResponse(stdout, req.id, protocol.PongResult{});
            try stdout.flush();
        } else if (std.mem.eql(u8, req.method, "index")) {
            const root_param = blk: {
                if (req.params) |p| {
                    if (p == .object) {
                        if (p.object.get("root")) |r| {
                            if (r == .string) break :blk r.string;
                        }
                    }
                }
                break :blk null;
            };

            var files_list: ?std.ArrayList([]const u8) = null;
            if (req.params) |p| {
                if (p == .object) {
                    if (p.object.get("files")) |f| {
                        if (f == .array) {
                            var list: std.ArrayList([]const u8) = .empty;
                            for (f.array.items) |item| {
                                if (item == .string) {
                                    try list.append(scratch, item.string);
                                }
                            }
                            files_list = list;
                        }
                    }
                }
            }

            if (root_param) |root| {
                const start: std.Io.Clock.Timestamp = .now(io, .awake);
                const count = blk: {
                    if (files_list) |files| {
                        break :blk index.indexFromList(root, files.items) catch |err| {
                            try protocol.writeError(stdout, req.id, @errorName(err));
                            try stdout.flush();
                            continue;
                        };
                    } else {
                        break :blk index.index(io, root) catch |err| {
                            try protocol.writeError(stdout, req.id, @errorName(err));
                            try stdout.flush();
                            continue;
                        };
                    }
                };
                const duration = start.untilNow(io);
                const elapsed_ms = duration.raw.toMilliseconds();

                try protocol.writeResponse(stdout, req.id, protocol.IndexResult{
                    .indexed_count = count,
                    .elapsed_ms = elapsed_ms,
                });
                try stdout.flush();
            } else {
                try protocol.writeError(stdout, req.id, "Missing 'root' parameter for index");
                try stdout.flush();
            }
        } else if (std.mem.eql(u8, req.method, "search")) {
            var query: []const u8 = "";
            var limit: usize = 60;

            if (req.params) |p| {
                if (p == .object) {
                    if (p.object.get("query")) |q| {
                        if (q == .string) query = q.string;
                    }
                    if (p.object.get("limit")) |l| {
                        if (l == .integer) {
                            if (l.integer > 0) {
                                limit = @intCast(@min(l.integer, 200));
                            }
                        }
                    }
                }
            }

            var results: std.ArrayList(protocol.SearchResult) = .empty;

            for (index.entries.items) |entry| {
                const match = matcher.scorePath(entry.relative_path, query);
                if (match.matched) {
                    try results.append(scratch, .{
                        .name = entry.name,
                        .path = entry.path,
                        .relativePath = entry.relative_path,
                        .score = match.score,
                    });
                }
            }

            // Sort results by score descending
            std.sort.pdq(protocol.SearchResult, results.items, {}, compareSearchResults);

            const final_count = @min(results.items.len, limit);
            const top_results = results.items[0..final_count];

            try protocol.writeResponse(stdout, req.id, top_results);
            try stdout.flush();
        } else if (std.mem.eql(u8, req.method, "search_text")) {
            var query: []const u8 = "";
            var case_sensitive: bool = false;
            var whole_word: bool = false;
            var max_results: usize = 200;

            if (req.params) |p| {
                if (p == .object) {
                    if (p.object.get("query")) |q| {
                        if (q == .string) query = q.string;
                    }
                    if (p.object.get("case_sensitive")) |c| {
                        if (c == .bool) case_sensitive = c.bool;
                    }
                    if (p.object.get("whole_word")) |w| {
                        if (w == .bool) whole_word = w.bool;
                    }
                    if (p.object.get("max_results")) |m| {
                        if (m == .integer and m.integer > 0) {
                            max_results = @intCast(@min(m.integer, 1000));
                        }
                    }
                }
            }

            if (query.len == 0) {
                try protocol.writeResponse(stdout, req.id, text_search.TextSearchResult{
                    .matches = &.{},
                    .total_matches = 0,
                    .files_searched = 0,
                    .elapsed_ms = 0,
                });
                try stdout.flush();
                continue;
            }

            const start: std.Io.Clock.Timestamp = .now(io, .awake);
            var matches: std.ArrayList(text_search.TextMatch) = .empty;

            const files_searched = try text_engine.search(
                scratch,
                gpa,
                io,
                index.entries.items,
                query,
                .{
                    .case_sensitive = case_sensitive,
                    .whole_word = whole_word,
                    .max_results = max_results,
                },
                &matches,
            );

            const duration = start.untilNow(io);
            const elapsed_ms = duration.raw.toMilliseconds();

            try protocol.writeResponse(stdout, req.id, text_search.TextSearchResult{
                .matches = matches.items,
                .total_matches = matches.items.len,
                .files_searched = files_searched,
                .elapsed_ms = elapsed_ms,
            });
            try stdout.flush();
        } else if (std.mem.eql(u8, req.method, "exit") or std.mem.eql(u8, req.method, "shutdown")) {
            try protocol.writeResponse(stdout, req.id, protocol.PongResult{ .status = "exiting" });
            try stdout.flush();
            break;
        } else {
            try protocol.writeError(stdout, req.id, "Unknown method");
            try stdout.flush();
        }
    }
}

test "main module builds and imports correctly" {
    _ = protocol;
    _ = indexer;
    _ = matcher;
    _ = text_search;
}
