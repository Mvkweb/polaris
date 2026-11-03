const std = @import("std");
const protocol = @import("protocol.zig");

fn entryLessThan(_: void, a: protocol.FileEntry, b: protocol.FileEntry) bool {
    if (a.is_dir != b.is_dir) {
        return a.is_dir and !b.is_dir; // Directories first
    }
    return std.ascii.lessThanIgnoreCase(a.name, b.name);
}

pub fn scanDirectory(
    allocator: std.mem.Allocator,
    io: std.Io,
    dir_path: []const u8,
) !protocol.ScanDirResult {
    const start_time = std.Io.Clock.awake.now(io);

    var dir = try std.Io.Dir.openDirAbsolute(io, dir_path, .{ .iterate = true });
    defer dir.close(io);

    var entries_list: std.ArrayList(protocol.FileEntry) = .empty;

    var iter = dir.iterate();
    while (try iter.next(io)) |entry| {
        // Skip current and parent directory pointers
        if (std.mem.eql(u8, entry.name, ".") or std.mem.eql(u8, entry.name, "..")) {
            continue;
        }

        const name_copy = try allocator.dupe(u8, entry.name);
        const full_path = try std.Io.Dir.path.join(allocator, &.{ dir_path, entry.name });
        const is_directory = (entry.kind == .directory);

        const ext = if (!is_directory)
            std.Io.Dir.path.extension(entry.name)
        else
            "";

        var file_size: u64 = 0;
        var modified_ms: i64 = 0;

        // Best-effort stat query (read-only)
        if (dir.statFile(io, entry.name, .{})) |st| {
            file_size = st.size;
            // stat modified timestamp in nanoseconds
            modified_ms = @truncate(@divTrunc(st.mtime.nanoseconds, std.time.ns_per_ms));
        } else |_| {}

        try entries_list.append(allocator, .{
            .name = name_copy,
            .path = full_path,
            .is_dir = is_directory,
            .size = file_size,
            .modified_ms = modified_ms,
            .extension = ext,
        });
    }

    const slice = try entries_list.toOwnedSlice(allocator);
    std.mem.sort(protocol.FileEntry, slice, {}, entryLessThan);

    const elapsed = start_time.durationTo(std.Io.Clock.awake.now(io));
    const elapsed_ms = elapsed.toMilliseconds();

    return protocol.ScanDirResult{
        .path = try allocator.dupe(u8, dir_path),
        .entries = slice,
        .total_count = slice.len,
        .elapsed_ms = elapsed_ms,
    };
}

test "entryLessThan sorting" {
    const a = protocol.FileEntry{
        .name = "folderA",
        .path = "/folderA",
        .is_dir = true,
        .size = 0,
        .modified_ms = 0,
    };
    const b = protocol.FileEntry{
        .name = "fileB.txt",
        .path = "/fileB.txt",
        .is_dir = false,
        .size = 10,
        .modified_ms = 0,
    };
    try std.testing.expect(entryLessThan({}, a, b));
    try std.testing.expect(!entryLessThan({}, b, a));
}
