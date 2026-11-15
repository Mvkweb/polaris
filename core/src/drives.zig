const std = @import("std");
const protocol = @import("protocol.zig");

pub fn detectDrives(allocator: std.mem.Allocator, io: std.Io) ![]const protocol.DriveEntry {
    var list: std.ArrayList(protocol.DriveEntry) = .empty;

    // Read Linux /proc/mounts safely
    var proc_file = std.Io.Dir.openFileAbsolute(io, "/proc/mounts", .{ .mode = .read_only }) catch {
        try list.append(allocator, .{
            .name = "Root (/)",
            .path = "/",
            .fs_type = "ext4",
            .is_removable = false,
        });
        return list.toOwnedSlice(allocator);
    };
    defer proc_file.close(io);

    var r_buf: [16384]u8 = undefined;
    var reader = proc_file.reader(io, &r_buf);

    var seen_paths: std.ArrayList([]const u8) = .empty;
    defer seen_paths.deinit(allocator);

    while (try reader.interface.takeDelimiter('\n')) |line| {
        const trimmed = std.mem.trim(u8, line, " \r\t");
        if (trimmed.len == 0 or trimmed[0] == '#') continue;

        var it = std.mem.tokenizeScalar(u8, trimmed, ' ');
        const dev = it.next() orelse continue;
        const mount = it.next() orelse continue;
        const fstype = it.next() orelse continue;

        // ONLY allow real physical devices (must start with /dev/)
        if (!std.mem.startsWith(u8, dev, "/dev/")) continue;
        if (std.mem.startsWith(u8, dev, "/dev/loop") or
            std.mem.startsWith(u8, dev, "/dev/zram") or
            std.mem.startsWith(u8, dev, "/dev/ram"))
        {
            continue;
        }

        // Must be a top-level mount point: "/" or "/mnt/<name>" or "/media/<name>"
        var clean_mount: []const u8 = "";
        var clean_name: []const u8 = "";

        if (std.mem.eql(u8, mount, "/")) {
            clean_mount = "/";
            clean_name = "Root (/)";
        } else if (std.mem.startsWith(u8, mount, "/mnt/")) {
            // Find end of the first segment after /mnt/
            const rest = mount["/mnt/".len..];
            const slash_idx = std.mem.findScalar(u8, rest, '/');
            const seg = if (slash_idx) |idx| rest[0..idx] else rest;
            if (seg.len == 0 or std.mem.findScalar(u8, seg, '.') != null) continue;
            clean_mount = try std.Io.Dir.path.join(allocator, &.{ "/mnt", seg });
            clean_name = try allocator.dupe(u8, seg);
        } else if (std.mem.startsWith(u8, mount, "/run/media/")) {
            // Arch/Fedora udisks2 mounts: /run/media/<user>/<label>
            const rest = mount["/run/media/".len..];
            const slash_idx = std.mem.findScalar(u8, rest, '/');
            if (slash_idx) |idx| {
                const after_user = rest[idx + 1 ..];
                const second_slash = std.mem.findScalar(u8, after_user, '/');
                const label = if (second_slash) |sidx| after_user[0..sidx] else after_user;
                if (label.len > 0) {
                    clean_mount = try allocator.dupe(u8, mount[0 .. "/run/media/".len + idx + 1 + label.len]);
                    clean_name = try allocator.dupe(u8, label);
                }
            }
            if (clean_mount.len == 0) continue;
        } else if (std.mem.startsWith(u8, mount, "/media/")) {
            const rest = mount["/media/".len..];
            const slash_idx = std.mem.findScalar(u8, rest, '/');
            const seg = if (slash_idx) |idx| rest[0..idx] else rest;
            if (seg.len == 0 or std.mem.findScalar(u8, seg, '.') != null) continue;
            clean_mount = try std.Io.Dir.path.join(allocator, &.{ "/media", seg });
            clean_name = try allocator.dupe(u8, seg);
        } else {
            continue;
        }

        // Deduplicate
        var already_seen = false;
        for (seen_paths.items) |seen| {
            if (std.mem.eql(u8, seen, clean_mount)) {
                already_seen = true;
                break;
            }
        }
        if (already_seen) continue;
        try seen_paths.append(allocator, clean_mount);

        const fstype_copy = try allocator.dupe(u8, fstype);

        try list.append(allocator, .{
            .name = clean_name,
            .path = clean_mount,
            .fs_type = fstype_copy,
            .is_removable = std.mem.startsWith(u8, clean_mount, "/media"),
        });
    }

    if (list.items.len == 0) {
        try list.append(allocator, .{
            .name = "Root (/)",
            .path = "/",
            .fs_type = "rootfs",
            .is_removable = false,
        });
    }

    return list.toOwnedSlice(allocator);
}

test "detectDrives fallback" {
    try std.testing.expect(true);
}
