const std = @import("std");

pub const FileEntry = struct {
    name: []const u8,
    path: []const u8,
    relative_path: []const u8,
};

pub const WorkspaceIndex = struct {
    backing_allocator: std.mem.Allocator,
    arena: std.heap.ArenaAllocator,
    entries: std.ArrayList(FileEntry),
    root_path: []const u8,

    const IGNORED_NAMES = [_][]const u8{
        ".git",
        "node_modules",
        "out",
        "dist",
        "build",
        ".cache",
        "target",
        ".zig-cache",
        "zig-out",
        ".next",
        ".turbo",
        ".svn",
        ".hg",
        ".idea",
        ".vscode",
    };

    pub fn init(backing: std.mem.Allocator) WorkspaceIndex {
        return .{
            .backing_allocator = backing,
            .arena = std.heap.ArenaAllocator.init(backing),
            .entries = .empty,
            .root_path = "",
        };
    }

    pub fn deinit(self: *WorkspaceIndex) void {
        self.arena.deinit();
        self.* = undefined;
    }

    pub fn clear(self: *WorkspaceIndex) void {
        _ = self.arena.reset(.retain_capacity);
        self.entries = .empty;
        self.root_path = "";
    }

    pub fn isIgnored(name: []const u8) bool {
        for (IGNORED_NAMES) |ignored| {
            if (std.mem.eql(u8, name, ignored)) return true;
        }
        return false;
    }

    pub fn index(self: *WorkspaceIndex, io: std.Io, root: []const u8) !usize {
        self.clear();
        const alloc = self.arena.allocator();

        self.root_path = try alloc.dupe(u8, root);

        var root_dir = if (std.Io.Dir.path.isAbsolute(root))
            try std.Io.Dir.openDirAbsolute(io, root, .{ .iterate = true })
        else
            try std.Io.Dir.cwd().openDir(io, root, .{ .iterate = true });
        defer root_dir.close(io);

        try self.walk(io, root_dir, "");
        return self.entries.items.len;
    }

    pub fn indexFromList(self: *WorkspaceIndex, root: []const u8, files: []const []const u8) !usize {
        self.clear();
        const alloc = self.arena.allocator();
        self.root_path = try alloc.dupe(u8, root);

        for (files) |rel_path_raw| {
            if (rel_path_raw.len == 0) continue;
            const rel_path = try alloc.dupe(u8, rel_path_raw);
            for (rel_path) |*b| {
                if (b.* == '\\') b.* = '/';
            }
            const name = std.Io.Dir.path.basename(rel_path);
            const full_path = try std.Io.Dir.path.join(alloc, &.{ self.root_path, rel_path });
            try self.entries.append(alloc, .{
                .name = name,
                .path = full_path,
                .relative_path = rel_path,
            });
        }
        return self.entries.items.len;
    }

    fn walk(self: *WorkspaceIndex, io: std.Io, dir: std.Io.Dir, rel_dir: []const u8) !void {
        const alloc = self.arena.allocator();
        var iter = dir.iterate();

        while (try iter.next(io)) |entry| {
            if (isIgnored(entry.name)) continue;

            const rel_path = if (rel_dir.len == 0)
                try alloc.dupe(u8, entry.name)
            else
                try std.fmt.allocPrint(alloc, "{s}/{s}", .{ rel_dir, entry.name });

            // Normalize any backslashes to forward slashes for cross-platform UI consistency
            for (rel_path) |*b| {
                if (b.* == '\\') b.* = '/';
            }

            if (entry.kind == .directory) {
                var sub_dir = dir.openDir(io, entry.name, .{ .iterate = true }) catch continue;
                defer sub_dir.close(io);
                try self.walk(io, sub_dir, rel_path);
            } else if (entry.kind == .file or entry.kind == .sym_link) {
                const full_path = try std.Io.Dir.path.join(alloc, &.{ self.root_path, rel_path });
                const name = try alloc.dupe(u8, entry.name);

                try self.entries.append(alloc, .{
                    .name = name,
                    .path = full_path,
                    .relative_path = rel_path,
                });
            }
        }
    }
};

test "workspace indexer ignores hidden directories" {
    try std.testing.expect(WorkspaceIndex.isIgnored(".git"));
    try std.testing.expect(WorkspaceIndex.isIgnored("node_modules"));
    try std.testing.expect(WorkspaceIndex.isIgnored("out"));
    try std.testing.expect(WorkspaceIndex.isIgnored(".zig-cache"));
    try std.testing.expect(!WorkspaceIndex.isIgnored("src"));
    try std.testing.expect(!WorkspaceIndex.isIgnored("main.zig"));
}

test "workspace indexer indexFromList populates entries" {
    var index_obj = WorkspaceIndex.init(std.testing.allocator);
    defer index_obj.deinit();

    const sample_files = [_][]const u8{
        "src/main.ts",
        "package.json",
        "nested/deep/file.zig",
    };

    const count = try index_obj.indexFromList("/mock/workspace", &sample_files);
    try std.testing.expectEqual(@as(usize, 3), count);
    try std.testing.expectEqualStrings("main.ts", index_obj.entries.items[0].name);
    try std.testing.expectEqualStrings("src/main.ts", index_obj.entries.items[0].relative_path);
    try std.testing.expectEqualStrings("/mock/workspace/src/main.ts", index_obj.entries.items[0].path);
}
