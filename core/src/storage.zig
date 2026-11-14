const std = @import("std");

pub const StorageItem = struct {
    id: []const u8,
    label: []const u8,
    value: f64,
    color: []const u8,
    fill: []const u8 = "gradient",
    detail: []const u8,
    isFree: bool = false,
    partial: bool = false,
};

pub const StorageBreakdownResult = struct {
    target: []const u8,
    capacity_gb: f64,
    used_gb: f64,
    free_gb: f64,
    items: []const StorageItem,
};

pub const Statfs = extern struct {
    f_type: i64,
    f_bsize: i64,
    f_blocks: u64,
    f_bfree: u64,
    f_bavail: u64,
    f_files: u64,
    f_ffree: u64,
    f_fsid: [2]i32,
    f_namelen: i64,
    f_frsize: i64,
    f_flags: i64,
    f_spare: [4]i64,
};

pub const FsStats = struct {
    total_bytes: u64,
    free_bytes: u64,
};

pub fn getFsStats(path: []const u8) ?FsStats {
    var path_buf: [4096]u8 = undefined;
    if (path.len + 1 > path_buf.len) return null;
    @memcpy(path_buf[0..path.len], path);
    path_buf[path.len] = 0;

    var stat: Statfs = undefined;
    const rc = std.os.linux.syscall2(.statfs, @intFromPtr(&path_buf), @intFromPtr(&stat));
    if (rc != 0) return null;

    const bsize: u64 = if (stat.f_frsize > 0) @intCast(stat.f_frsize) else @intCast(@max(stat.f_bsize, 512));
    const total = stat.f_blocks * bsize;
    const free = stat.f_bavail * bsize;
    return FsStats{ .total_bytes = total, .free_bytes = free };
}

const GB_BYTES: f64 = 1024.0 * 1024.0 * 1024.0;
const MAX_CHILDREN: usize = 3;

pub const CategoryType = enum(usize) {
    games = 0,
    dev = 1,
    cache = 2,
    system = 3,
    docs = 4,

    pub fn id(self: CategoryType) []const u8 {
        return switch (self) {
            .games => "games",
            .dev => "dev",
            .cache => "cache",
            .system => "system",
            .docs => "docs",
        };
    }

    pub fn label(self: CategoryType) []const u8 {
        return switch (self) {
            .games => "Games & Entertainment",
            .dev => "Developer & Workspaces",
            .cache => "Caches & Data",
            .system => "Applications & System",
            .docs => "Media & Documents",
        };
    }

    pub fn color(self: CategoryType) []const u8 {
        return switch (self) {
            .games => "blue",
            .dev => "green",
            .cache => "orange", // "orange" is valid in tokens.ts ("amber" was not)
            .system => "purple",
            .docs => "pink",
        };
    }
};

pub const Child = struct {
    name: []const u8,
    bytes: u64,
};

pub const CategoryAccumulator = struct {
    bytes: u64 = 0,
    children: std.ArrayList(Child) = .empty,
    total_count: usize = 0,

    pub fn add(self: *CategoryAccumulator, alloc: std.mem.Allocator, name: []const u8, bytes: u64) !void {
        if (bytes == 0) return;
        self.bytes += bytes;
        self.total_count += 1;
        try pushChild(alloc, &self.children, .{ .name = try alloc.dupe(u8, name), .bytes = bytes });
    }
};

pub fn pushChild(alloc: std.mem.Allocator, list: *std.ArrayList(Child), child: Child) !void {
    if (child.bytes == 0) return;

    var index: usize = 0;
    while (index < list.items.len and list.items[index].bytes >= child.bytes) : (index += 1) {}
    if (index >= MAX_CHILDREN) return;

    try list.insert(alloc, index, child);
    if (list.items.len > MAX_CHILDREN) {
        _ = list.pop();
    }
}

pub fn findValue(haystack: []const u8, key: []const u8) ?[]const u8 {
    const key_pos = std.mem.find(u8, haystack, key) orelse return null;
    var rest = haystack[key_pos + key.len ..];

    while (rest.len > 0 and (rest[0] == ' ' or rest[0] == '\t' or rest[0] == '\r' or rest[0] == '\n')) {
        rest = rest[1..];
    }
    if (rest.len == 0 or rest[0] != '"') return null;
    rest = rest[1..];

    const end_pos = std.mem.findScalar(u8, rest, '"') orelse return null;
    return rest[0..end_pos];
}

pub const SteamApp = struct {
    name: []const u8,
    installdir: []const u8,
    bytes: u64,
};

pub fn sumSteamManifests(io: std.Io, dir: std.Io.Dir) u64 {
    var apps_dir = dir.openDir(io, "steamapps", .{ .iterate = true, .follow_symlinks = false }) catch return 0;
    defer apps_dir.close(io);

    var total: u64 = 0;
    var iter = apps_dir.iterate();
    while (iter.next(io) catch null) |entry| {
        if (entry.kind != .file) continue;
        if (!std.mem.startsWith(u8, entry.name, "appmanifest_")) continue;
        if (!std.mem.endsWith(u8, entry.name, ".acf")) continue;

        var file = apps_dir.openFile(io, entry.name, .{}) catch continue;
        defer file.close(io);

        var read_buf: [4096]u8 = undefined;
        var reader = file.reader(io, &read_buf);
        var content: [4096]u8 = undefined;
        const len = reader.interface.readSliceShort(&content) catch continue;
        const size_text = findValue(content[0..len], "\"SizeOnDisk\"") orelse continue;
        const bytes = std.fmt.parseInt(u64, size_text, 10) catch continue;
        total += bytes;
    }
    return total;
}

pub fn readSteamApps(
    io: std.Io,
    alloc: std.mem.Allocator,
    dir: std.Io.Dir,
) !?[]SteamApp {
    var apps_dir = dir.openDir(io, "steamapps", .{ .iterate = true, .follow_symlinks = false }) catch return null;
    defer apps_dir.close(io);

    var apps: std.ArrayList(SteamApp) = .empty;
    var iter = apps_dir.iterate();
    while (iter.next(io) catch null) |entry| {
        if (entry.kind != .file) continue;
        if (!std.mem.startsWith(u8, entry.name, "appmanifest_")) continue;
        if (!std.mem.endsWith(u8, entry.name, ".acf")) continue;

        var file = apps_dir.openFile(io, entry.name, .{}) catch continue;
        defer file.close(io);

        var read_buf: [4096]u8 = undefined;
        var reader = file.reader(io, &read_buf);
        var content: [4096]u8 = undefined;
        const len = reader.interface.readSliceShort(&content) catch continue;
        const slice = content[0..len];

        const name = findValue(slice, "\"name\"") orelse continue;
        const installdir = findValue(slice, "\"installdir\"") orelse name;
        const size_text = findValue(slice, "\"SizeOnDisk\"") orelse continue;
        const bytes = std.fmt.parseInt(u64, size_text, 10) catch continue;
        if (bytes == 0) continue;

        try apps.append(alloc, .{
            .name = try alloc.dupe(u8, name),
            .installdir = try alloc.dupe(u8, installdir),
            .bytes = bytes,
        });
    }

    // Inspect steamapps/common for games with additional launcher/patch downloads (e.g. Wuthering Waves, Genshin)
    // CRITICAL: We match against `installdir` (the actual directory on disk), NOT `name` (the display title).
    // This permanently prevents double counting games where the folder name differs (e.g. CS2 installed in Counter-Strike Global Offensive).
    if (apps_dir.openDir(io, "common", .{ .iterate = true, .follow_symlinks = false })) |common_val| {
        var common_dir = common_val;
        defer common_dir.close(io);

        var c_iter = common_dir.iterate();
        while (c_iter.next(io) catch null) |c_entry| {
            if (c_entry.kind != .directory) continue;

            var existing_idx: ?usize = null;
            for (apps.items, 0..) |app, idx| {
                if (std.ascii.eqlIgnoreCase(app.installdir, c_entry.name) or
                    std.ascii.eqlIgnoreCase(app.name, c_entry.name))
                {
                    existing_idx = idx;
                    break;
                }
            }

            var c_sub = common_dir.openDir(io, c_entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
            defer c_sub.close(io);

            var b: u32 = 60_000;
            const c_sz = measureDirectoryFast(io, c_sub, 6, &b);
            if (c_sz > 200 * 1024 * 1024) {
                if (existing_idx) |idx| {
                    if (c_sz > apps.items[idx].bytes) {
                        apps.items[idx].bytes = c_sz;
                    }
                } else {
                    try apps.append(alloc, .{
                        .name = try alloc.dupe(u8, c_entry.name),
                        .installdir = try alloc.dupe(u8, c_entry.name),
                        .bytes = c_sz,
                    });
                }
            }
        }
    } else |_| {}

    return apps.items;
}

/// Universal check for software development projects based on standard build and VCS artifacts.
/// Works on ANY machine and ANY project, without relying on project names.
pub fn isDevProject(io: std.Io, dir: std.Io.Dir) bool {
    var iter = dir.iterate();
    var checked: usize = 0;
    while (iter.next(io) catch null) |entry| {
        checked += 1;
        if (checked > 60) break;

        // Version control systems
        if (std.mem.eql(u8, entry.name, ".git") or
            std.mem.eql(u8, entry.name, ".hg") or
            std.mem.eql(u8, entry.name, ".svn"))
        {
            return true;
        }

        // Standard language build manifests & package configs
        if (std.mem.eql(u8, entry.name, "package.json") or
            std.mem.eql(u8, entry.name, "Cargo.toml") or
            std.mem.eql(u8, entry.name, "build.zig") or
            std.mem.eql(u8, entry.name, "build.zig.zon") or
            std.mem.eql(u8, entry.name, "go.mod") or
            std.mem.eql(u8, entry.name, "CMakeLists.txt") or
            std.mem.eql(u8, entry.name, "Makefile") or
            std.mem.eql(u8, entry.name, "meson.build") or
            std.mem.eql(u8, entry.name, "pyproject.toml") or
            std.mem.eql(u8, entry.name, "setup.py") or
            std.mem.eql(u8, entry.name, "requirements.txt") or
            std.mem.eql(u8, entry.name, "Pipfile") or
            std.mem.eql(u8, entry.name, "pom.xml") or
            std.mem.eql(u8, entry.name, "build.gradle") or
            std.mem.eql(u8, entry.name, "build.gradle.kts") or
            std.mem.eql(u8, entry.name, "composer.json") or
            std.mem.eql(u8, entry.name, "Gemfile") or
            std.mem.eql(u8, entry.name, "flake.nix") or
            std.mem.eql(u8, entry.name, "default.nix") or
            std.mem.eql(u8, entry.name, "pubspec.yaml") or
            std.mem.eql(u8, entry.name, "project.godot") or
            std.mem.eql(u8, entry.name, "mix.exs") or
            std.mem.eql(u8, entry.name, "dune-project") or
            std.mem.eql(u8, entry.name, "build.sbt") or
            std.mem.eql(u8, entry.name, "WORKSPACE") or
            std.mem.eql(u8, entry.name, "BUILD.bazel"))
        {
            return true;
        }
    }
    return false;
}

/// Universal check for Wine/Proton/compatibility prefixes and game containers.
pub fn isWineOrGamePrefix(io: std.Io, dir: std.Io.Dir) bool {
    var iter = dir.iterate();
    var checked: usize = 0;
    while (iter.next(io) catch null) |entry| {
        checked += 1;
        if (checked > 30) break;
        if (std.mem.eql(u8, entry.name, "drive_c") or
            std.mem.eql(u8, entry.name, "system.reg") or
            std.mem.eql(u8, entry.name, "user.reg") or
            std.mem.eql(u8, entry.name, "dosdevices"))
        {
            return true;
        }
    }
    return false;
}

fn toLower(str: []const u8, buf: []u8) []const u8 {
    const len = @min(str.len, buf.len);
    for (str[0..len], 0..) |c, i| {
        buf[i] = std.ascii.toLower(c);
    }
    return buf[0..len];
}

fn extensionOf(name: []const u8) []const u8 {
    const dot = std.mem.findScalarLast(u8, name, '.') orelse return "";
    return name[dot..];
}

/// Universal folder classification based on standard Linux filesystem hierarchies,
/// XDG directories, and standard ecosystem locations (never hardcoded project names).
pub fn classifyFolder(name: []const u8, is_dev: bool) CategoryType {
    if (is_dev) return .dev;

    var buf: [128]u8 = undefined;
    const lower = toLower(name, &buf);

    // 1. Standard XDG User Media & Documents Directories
    if (std.mem.eql(u8, lower, "pictures") or
        std.mem.eql(u8, lower, "photos") or
        std.mem.eql(u8, lower, "images") or
        std.mem.eql(u8, lower, "bilder") or
        std.mem.eql(u8, lower, "videos") or
        std.mem.eql(u8, lower, "movies") or
        std.mem.eql(u8, lower, "music") or
        std.mem.eql(u8, lower, "audio") or
        std.mem.eql(u8, lower, "musik") or
        std.mem.eql(u8, lower, "documents") or
        std.mem.eql(u8, lower, "docs") or
        std.mem.eql(u8, lower, "dokumente") or
        std.mem.eql(u8, lower, "downloads") or
        std.mem.eql(u8, lower, "téléchargements") or
        std.mem.eql(u8, lower, "desktop"))
    {
        return .docs;
    }

    // 2. Games, Launchers, Emulators and Gaming Ecosystem
    if (std.mem.eql(u8, lower, ".steam") or
        std.mem.eql(u8, lower, "steam") or
        std.mem.eql(u8, lower, "games") or
        std.mem.eql(u8, lower, ".minecraft") or
        std.mem.eql(u8, lower, ".lunarclient") or
        std.mem.find(u8, lower, "heroic") != null or
        std.mem.find(u8, lower, "lutris") != null or
        std.mem.find(u8, lower, "prism") != null or
        std.mem.find(u8, lower, "wine") != null or
        std.mem.find(u8, lower, "proton") != null or
        std.mem.find(u8, lower, "emulator") != null or
        std.mem.find(u8, lower, "sober") != null or
        std.mem.find(u8, lower, "vinegar") != null or
        std.mem.find(u8, lower, "retroarch") != null or
        std.mem.find(u8, lower, "rpcs3") != null or
        std.mem.find(u8, lower, "yuzu") != null or
        std.mem.find(u8, lower, "ryujinx") != null or
        std.mem.find(u8, lower, "dolphin-emu") != null or
        std.mem.eql(u8, lower, "roms"))
    {
        return .games;
    }

    // 3. Developer Toolchains, Package Managers, Coding Tools, and Workspaces
    if (std.mem.eql(u8, lower, ".cargo") or
        std.mem.eql(u8, lower, ".rustup") or
        std.mem.eql(u8, lower, ".bun") or
        std.mem.eql(u8, lower, ".npm") or
        std.mem.eql(u8, lower, ".pnpm-store") or
        std.mem.eql(u8, lower, "pnpm") or
        std.mem.eql(u8, lower, ".gradle") or
        std.mem.eql(u8, lower, ".m2") or
        std.mem.eql(u8, lower, ".nuget") or
        std.mem.eql(u8, lower, "go") or
        std.mem.eql(u8, lower, ".venv") or
        std.mem.eql(u8, lower, "virtualenvs") or
        std.mem.eql(u8, lower, "workspace") or
        std.mem.eql(u8, lower, "workspaces") or
        std.mem.eql(u8, lower, "projects") or
        std.mem.eql(u8, lower, "repos") or
        std.mem.eql(u8, lower, "github") or
        std.mem.eql(u8, lower, "code") or
        std.mem.eql(u8, lower, "dev") or
        std.mem.eql(u8, lower, "devel") or
        std.mem.eql(u8, lower, "development") or
        std.mem.eql(u8, lower, "src") or
        std.mem.eql(u8, lower, ".gemini") or
        std.mem.eql(u8, lower, ".claude") or
        std.mem.eql(u8, lower, ".cursor") or
        std.mem.eql(u8, lower, ".zed") or
        std.mem.eql(u8, lower, "zed") or
        std.mem.eql(u8, lower, ".t3") or
        std.mem.eql(u8, lower, "opencode") or
        std.mem.eql(u8, lower, ".opencode") or
        std.mem.eql(u8, lower, "nvim") or
        std.mem.eql(u8, lower, ".emacs.d") or
        std.mem.eql(u8, lower, "emacs"))
    {
        return .dev;
    }

    // 4. Standard XDG Caches and Config
    if (std.mem.eql(u8, lower, ".cache") or
        std.mem.eql(u8, lower, "cache") or
        std.mem.eql(u8, lower, ".config") or
        std.mem.startsWith(u8, lower, ".config.") or
        std.mem.eql(u8, lower, "temp") or
        std.mem.eql(u8, lower, "tmp") or
        std.mem.eql(u8, lower, "crash") or
        std.mem.eql(u8, lower, "crashdumps") or
        std.mem.eql(u8, lower, "coredumps") or
        std.mem.eql(u8, lower, "logs") or
        std.mem.eql(u8, lower, "log") or
        std.mem.eql(u8, lower, ".log"))
    {
        return .cache;
    }

    // 5. Standard Applications & System
    return .system;
}

/// Universal file extension classification by standard MIME categories.
pub fn classifyFile(name: []const u8) CategoryType {
    const ext = extensionOf(name);

    // Media & Documents
    if (std.ascii.eqlIgnoreCase(ext, ".png") or
        std.ascii.eqlIgnoreCase(ext, ".jpg") or
        std.ascii.eqlIgnoreCase(ext, ".jpeg") or
        std.ascii.eqlIgnoreCase(ext, ".webp") or
        std.ascii.eqlIgnoreCase(ext, ".gif") or
        std.ascii.eqlIgnoreCase(ext, ".svg") or
        std.ascii.eqlIgnoreCase(ext, ".bmp") or
        std.ascii.eqlIgnoreCase(ext, ".mp4") or
        std.ascii.eqlIgnoreCase(ext, ".mkv") or
        std.ascii.eqlIgnoreCase(ext, ".mov") or
        std.ascii.eqlIgnoreCase(ext, ".avi") or
        std.ascii.eqlIgnoreCase(ext, ".mp3") or
        std.ascii.eqlIgnoreCase(ext, ".flac") or
        std.ascii.eqlIgnoreCase(ext, ".wav") or
        std.ascii.eqlIgnoreCase(ext, ".ogg") or
        std.ascii.eqlIgnoreCase(ext, ".pdf") or
        std.ascii.eqlIgnoreCase(ext, ".epub") or
        std.ascii.eqlIgnoreCase(ext, ".doc") or
        std.ascii.eqlIgnoreCase(ext, ".docx") or
        std.ascii.eqlIgnoreCase(ext, ".odt") or
        std.ascii.eqlIgnoreCase(ext, ".xls") or
        std.ascii.eqlIgnoreCase(ext, ".xlsx") or
        std.ascii.eqlIgnoreCase(ext, ".zip") or
        std.ascii.eqlIgnoreCase(ext, ".tar") or
        std.ascii.eqlIgnoreCase(ext, ".gz") or
        std.ascii.eqlIgnoreCase(ext, ".xz") or
        std.ascii.eqlIgnoreCase(ext, ".7z") or
        std.ascii.eqlIgnoreCase(ext, ".rar") or
        std.ascii.eqlIgnoreCase(ext, ".iso") or
        std.ascii.eqlIgnoreCase(ext, ".txt") or
        std.ascii.eqlIgnoreCase(ext, ".md"))
    {
        return .docs;
    }

    // Source code & Developer files
    if (std.ascii.eqlIgnoreCase(ext, ".zig") or
        std.ascii.eqlIgnoreCase(ext, ".rs") or
        std.ascii.eqlIgnoreCase(ext, ".c") or
        std.ascii.eqlIgnoreCase(ext, ".cpp") or
        std.ascii.eqlIgnoreCase(ext, ".h") or
        std.ascii.eqlIgnoreCase(ext, ".go") or
        std.ascii.eqlIgnoreCase(ext, ".ts") or
        std.ascii.eqlIgnoreCase(ext, ".tsx") or
        std.ascii.eqlIgnoreCase(ext, ".js") or
        std.ascii.eqlIgnoreCase(ext, ".jsx") or
        std.ascii.eqlIgnoreCase(ext, ".py") or
        std.ascii.eqlIgnoreCase(ext, ".json") or
        std.ascii.eqlIgnoreCase(ext, ".toml") or
        std.ascii.eqlIgnoreCase(ext, ".yaml") or
        std.ascii.eqlIgnoreCase(ext, ".yml"))
    {
        return .dev;
    }

    return .system;
}

pub fn measureDirectoryFast(
    io: std.Io,
    dir: std.Io.Dir,
    max_depth: u8,
    entry_budget: *u32,
) u64 {
    if (max_depth == 0 or entry_budget.* == 0) return 0;
    var total: u64 = 0;
    var iter = dir.iterate();
    while (iter.next(io) catch null) |entry| {
        if (entry_budget.* == 0) break;
        entry_budget.* -= 1;

        var kind = entry.kind;
        if (kind == .unknown) {
            const stat = dir.statFile(io, entry.name, .{ .follow_symlinks = false }) catch continue;
            kind = stat.kind;
            if (kind != .directory) {
                total += stat.size;
                continue;
            }
        }

        if (kind == .directory) {
            // Steam manifest shortcut
            if (std.mem.eql(u8, entry.name, "steamapps")) {
                const steam_bytes = sumSteamManifests(io, dir);
                if (steam_bytes > 0) {
                    total += steam_bytes;
                    continue;
                }
            }

            var sub = dir.openDir(io, entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
            defer sub.close(io);
            total += measureDirectoryFast(io, sub, max_depth - 1, entry_budget);
        } else if (kind == .file) {
            const stat = dir.statFile(io, entry.name, .{ .follow_symlinks = false }) catch continue;
            total += stat.size;
        }
    }
    return total;
}

fn categoryDetail(
    alloc: std.mem.Allocator,
    cat: CategoryType,
    acc: *const CategoryAccumulator,
) ![]const u8 {
    if (acc.children.items.len == 0) {
        return switch (cat) {
            .games => "Steam, launchers & installed games",
            .dev => "Workspaces, tools & code repositories",
            .cache => "User caches, runtime & configuration",
            .system => "System libraries, binaries & OS data",
            .docs => "Photos, videos, audio & user documents",
        };
    }

    var out: std.ArrayList(u8) = .empty;
    for (acc.children.items, 0..) |child, index| {
        if (index > 0) try out.appendSlice(alloc, ", ");
        const gb_val = @as(f64, @floatFromInt(child.bytes)) / GB_BYTES;
        const text = if (gb_val >= 0.1)
            try alloc.print("{s} ({d:.1} GB)", .{ child.name, gb_val })
        else
            try alloc.print("{s} ({d} MB)", .{ child.name, child.bytes / (1024 * 1024) });
        try out.appendSlice(alloc, text);
    }

    const hidden = acc.total_count -| acc.children.items.len;
    if (hidden > 0) {
        const text = try alloc.print(", +{d} more", .{hidden});
        try out.appendSlice(alloc, text);
    }
    return out.items;
}

fn scanUserHome(
    alloc: std.mem.Allocator,
    io: std.Io,
    udir: *std.Io.Dir,
    accumulators: *[5]CategoryAccumulator,
) !void {
    // 1. Steam detection across standard paths
    const steam_candidates = [_][]const u8{
        ".local/share/Steam",
        ".var/app/com.valvesoftware.Steam/.local/share/Steam",
        ".var/app/com.valvesoftware.Steam/data/Steam",
        ".steam/steam",
    };
    var found_steam = false;
    for (steam_candidates) |rel_path| {
        if (found_steam) break;
        if (udir.openDir(io, rel_path, .{ .iterate = true, .follow_symlinks = false })) |steam_val| {
            var steam_dir = steam_val;
            defer steam_dir.close(io);

            if (try readSteamApps(io, alloc, steam_dir)) |apps| {
                if (apps.len > 0) {
                    found_steam = true;
                    for (apps) |app| {
                        try accumulators[@backingInt(CategoryType.games)].add(alloc, app.name, app.bytes);
                    }
                }
            }

            if (steam_dir.openDir(io, "steamapps/workshop", .{ .iterate = true, .follow_symlinks = false })) |ws_val| {
                var ws_dir = ws_val;
                defer ws_dir.close(io);
                var b: u32 = 15_000;
                const ws_sz = measureDirectoryFast(io, ws_dir, 4, &b);
                if (ws_sz > 50 * 1024 * 1024) {
                    try accumulators[@backingInt(CategoryType.games)].add(alloc, "Steam Workshop", ws_sz);
                }
            } else |_| {}

            if (steam_dir.openDir(io, "steamapps/compatdata", .{ .iterate = true, .follow_symlinks = false })) |cd_val| {
                var cd_dir = cd_val;
                defer cd_dir.close(io);
                var b: u32 = 15_000;
                const cd_sz = measureDirectoryFast(io, cd_dir, 4, &b);
                if (cd_sz > 50 * 1024 * 1024) {
                    try accumulators[@backingInt(CategoryType.games)].add(alloc, "Proton Prefixes", cd_sz);
                }
            } else |_| {}
        } else |_| {}
    }

    // 2. Flatpak applications: ~/.var/app
    if (udir.openDir(io, ".var/app", .{ .iterate = true, .follow_symlinks = false })) |var_app_val| {
        var var_app = var_app_val;
        defer var_app.close(io);
        var va_iter = var_app.iterate();
        while (va_iter.next(io) catch null) |entry| {
            if (entry.kind != .directory) continue;
            var app_dir = var_app.openDir(io, entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
            defer app_dir.close(io);

            const is_wine = isWineOrGamePrefix(io, app_dir);
            const is_dev = isDevProject(io, app_dir);
            const cat: CategoryType = if (is_wine) .games else classifyFolder(entry.name, is_dev);

            var budget: u32 = 25_000;
            const sz = measureDirectoryFast(io, app_dir, 5, &budget);
            if (sz > 50 * 1024 * 1024) {
                const dot_idx = std.mem.findScalarLast(u8, entry.name, '.');
                const display_name = if (dot_idx) |idx| entry.name[idx + 1 ..] else entry.name;
                try accumulators[@backingInt(cat)].add(alloc, display_name, sz);
            }
        }
    } else |_| {}

    // 3. XDG Data: ~/.local/share
    if (udir.openDir(io, ".local/share", .{ .iterate = true, .follow_symlinks = false })) |ls_val| {
        var ls_dir = ls_val;
        defer ls_dir.close(io);
        var ls_iter = ls_dir.iterate();
        while (ls_iter.next(io) catch null) |ls_entry| {
            if (ls_entry.kind != .directory) continue;
            if (std.mem.eql(u8, ls_entry.name, "Steam")) continue;

            var sdir = ls_dir.openDir(io, ls_entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
            defer sdir.close(io);

            const is_dev = isDevProject(io, sdir);
            const is_wine = isWineOrGamePrefix(io, sdir);
            const cat: CategoryType = if (is_wine) .games else classifyFolder(ls_entry.name, is_dev);

            var budget: u32 = 25_000;
            const sz = measureDirectoryFast(io, sdir, 4, &budget);
            if (sz > 50 * 1024 * 1024) {
                try accumulators[@backingInt(cat)].add(alloc, ls_entry.name, sz);
            }
        }
    } else |_| {}

    // 4. XDG Caches: ~/.cache (individual cache buckets: paru, nvidia, browsers, compilers)
    if (udir.openDir(io, ".cache", .{ .iterate = true, .follow_symlinks = false })) |cache_val| {
        var cache_dir = cache_val;
        defer cache_dir.close(io);
        var c_iter = cache_dir.iterate();
        while (c_iter.next(io) catch null) |c_entry| {
            if (c_entry.kind == .directory) {
                var c_sub = cache_dir.openDir(io, c_entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
                defer c_sub.close(io);
                var budget: u32 = 25_000;
                const sz = measureDirectoryFast(io, c_sub, 4, &budget);
                if (sz > 50 * 1024 * 1024) {
                    try accumulators[@backingInt(CategoryType.cache)].add(alloc, c_entry.name, sz);
                } else if (sz > 0) {
                    accumulators[@backingInt(CategoryType.cache)].bytes += sz;
                }
            } else if (c_entry.kind == .file) {
                const stat = cache_dir.statFile(io, c_entry.name, .{ .follow_symlinks = false }) catch continue;
                accumulators[@backingInt(CategoryType.cache)].bytes += stat.size;
            }
        }
    } else |_| {}

    // 5. Direct entries in user directory
    var iter = udir.iterate();
    while (iter.next(io) catch null) |entry| {
        if (std.mem.eql(u8, entry.name, ".local") or
            std.mem.eql(u8, entry.name, ".var") or
            std.mem.eql(u8, entry.name, ".cache"))
        {
            continue;
        }

        if (entry.kind == .directory) {
            var sub = udir.openDir(io, entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
            defer sub.close(io);

            const is_dev = isDevProject(io, sub);
            const is_wine = isWineOrGamePrefix(io, sub);
            const cat: CategoryType = if (is_wine) .games else classifyFolder(entry.name, is_dev);

            var budget: u32 = 40_000;
            const sz = measureDirectoryFast(io, sub, 6, &budget);
            if (sz > 50 * 1024 * 1024) {
                try accumulators[@backingInt(cat)].add(alloc, entry.name, sz);
            }
        } else if (entry.kind == .file) {
            const stat = udir.statFile(io, entry.name, .{ .follow_symlinks = false }) catch continue;
            const cat = classifyFile(entry.name);
            try accumulators[@backingInt(cat)].add(alloc, entry.name, stat.size);
        }
    }
}

pub fn calculateStorageBreakdown(
    allocator: std.mem.Allocator,
    io: std.Io,
    target_path: []const u8,
) !StorageBreakdownResult {
    const fs = getFsStats(target_path) orelse {
        return error.DeviceUnreachable;
    };

    const capacity_gb = @as(f64, @floatFromInt(fs.total_bytes)) / GB_BYTES;
    const free_gb = @as(f64, @floatFromInt(fs.free_bytes)) / GB_BYTES;
    const total_used_gb = @max(0.0, capacity_gb - free_gb);

    var accumulators: [5]CategoryAccumulator = .{
        .{}, .{}, .{}, .{}, .{},
    };

    const is_root = std.mem.eql(u8, target_path, "/");

    if (is_root) {
        // 1. Universal scan of all user accounts under /home
        if (std.Io.Dir.openDirAbsolute(io, "/home", .{ .iterate = true })) |home_dir_val| {
            var home_dir = home_dir_val;
            defer home_dir.close(io);

            var user_iter = home_dir.iterate();
            while (user_iter.next(io) catch null) |user_entry| {
                if (user_entry.kind != .directory) continue;
                if (user_entry.name.len > 0 and user_entry.name[0] == '.') continue;

                var udir = home_dir.openDir(io, user_entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
                defer udir.close(io);

                try scanUserHome(allocator, io, &udir, &accumulators);
            }
        } else |_| {}

        // Also scan /root if accessible
        if (std.Io.Dir.openDirAbsolute(io, "/root", .{ .iterate = true, .follow_symlinks = false })) |root_val| {
            var root_dir = root_val;
            defer root_dir.close(io);
            try scanUserHome(allocator, io, &root_dir, &accumulators);
        } else |_| {}

        // 2. Standard FHS system directories
        const sys_dirs = [_]struct { path: []const u8, cat: CategoryType }{
            .{ .path = "/usr", .cat = .system },
            .{ .path = "/opt", .cat = .system },
            .{ .path = "/var/cache", .cat = .cache },
            .{ .path = "/var/lib", .cat = .system },
            .{ .path = "/boot", .cat = .system },
            .{ .path = "/etc", .cat = .system },
            .{ .path = "/nix", .cat = .system },
            .{ .path = "/snap", .cat = .system },
        };

        for (sys_dirs) |s| {
            if (std.Io.Dir.openDirAbsolute(io, s.path, .{ .iterate = true })) |sval| {
                var sdir = sval;
                defer sdir.close(io);
                var budget: u32 = 12_000;
                const sz = measureDirectoryFast(io, sdir, 3, &budget);
                if (sz > 0) {
                    try accumulators[@backingInt(s.cat)].add(allocator, s.path, sz);
                }
            } else |_| {}
        }
    } else {
        // Universal scan of any custom drive, external volume, or mount point
        var target_dir = if (std.Io.Dir.path.isAbsolute(target_path))
            try std.Io.Dir.openDirAbsolute(io, target_path, .{ .iterate = true })
        else
            try std.Io.Dir.cwd().openDir(io, target_path, .{ .iterate = true });
        defer target_dir.close(io);

        var iter = target_dir.iterate();
        while (iter.next(io) catch null) |entry| {
            // Do NOT skip hidden entries on custom mounts (e.g. .pnpm-store) unless they are . or ..
            if (std.mem.eql(u8, entry.name, ".") or std.mem.eql(u8, entry.name, "..")) continue;

            if (entry.kind == .directory) {
                var sub = target_dir.openDir(io, entry.name, .{ .iterate = true, .follow_symlinks = false }) catch continue;
                defer sub.close(io);

                // Steam Library on custom drive
                if (try readSteamApps(io, allocator, sub)) |apps| {
                    if (apps.len > 0) {
                        for (apps) |app| {
                            try accumulators[@backingInt(CategoryType.games)].add(allocator, app.name, app.bytes);
                        }

                        // Also count compatdata (Proton prefixes) inside the custom drive's SteamLibrary
                        if (sub.openDir(io, "steamapps/compatdata", .{ .iterate = true, .follow_symlinks = false })) |cd_val| {
                            var cd_dir = cd_val;
                            defer cd_dir.close(io);
                            var b: u32 = 10_000;
                            const cd_sz = measureDirectoryFast(io, cd_dir, 4, &b);
                            if (cd_sz > 50 * 1024 * 1024) {
                                try accumulators[@backingInt(CategoryType.games)].add(allocator, "Proton Prefixes", cd_sz);
                            }
                        } else |_| {}

                        continue;
                    }
                }

                // Universal project and wine prefix check
                const is_dev = isDevProject(io, sub);
                const is_wine = isWineOrGamePrefix(io, sub);
                const cat: CategoryType = if (is_wine) .games else classifyFolder(entry.name, is_dev);

                var budget: u32 = 15_000;
                const sz = measureDirectoryFast(io, sub, 3, &budget);
                if (sz > 0) {
                    try accumulators[@backingInt(cat)].add(allocator, entry.name, sz);
                }
            } else if (entry.kind == .file) {
                const stat = target_dir.statFile(io, entry.name, .{ .follow_symlinks = false }) catch continue;
                const cat = classifyFile(entry.name);
                try accumulators[@backingInt(cat)].add(allocator, entry.name, stat.size);
            }
        }
    }

    // Sum measured gigabytes
    var measured_bytes: u64 = 0;
    for (&accumulators) |*acc| {
        measured_bytes += acc.bytes;
    }
    const measured_gb = @as(f64, @floatFromInt(measured_bytes)) / GB_BYTES;

    // Remaining used bytes on disk are kernel, filesystem overhead, metadata, and system
    const overhead_gb = @max(0.0, total_used_gb - measured_gb);
    accumulators[@backingInt(CategoryType.system)].bytes += @as(u64, @intFromFloat(overhead_gb * GB_BYTES));

    var items: std.ArrayList(StorageItem) = .empty;

    const cat_types = [_]CategoryType{ .games, .dev, .cache, .system, .docs };
    for (cat_types) |cat| {
        const acc = &accumulators[@backingInt(cat)];
        const val_gb = @as(f64, @floatFromInt(acc.bytes)) / GB_BYTES;
        const rounded_val = @round(val_gb * 10.0) / 10.0;

        if (rounded_val >= 0.1) {
            try items.append(allocator, .{
                .id = cat.id(),
                .label = cat.label(),
                .value = rounded_val,
                .color = cat.color(),
                .detail = try categoryDetail(allocator, cat, acc),
                .fill = "gradient",
                .isFree = false,
                .partial = false,
            });
        }
    }

    // Free space: dark, clean, subtle dashed border
    try items.append(allocator, .{
        .id = "free",
        .label = "Free Space",
        .value = @round(free_gb * 10.0) / 10.0,
        .color = "grey",
        .fill = "solid",
        .detail = "Available space",
        .isFree = true,
        .partial = false,
    });

    return .{
        .target = try allocator.dupe(u8, target_path),
        .capacity_gb = @round(capacity_gb * 10.0) / 10.0,
        .used_gb = @round(total_used_gb * 10.0) / 10.0,
        .free_gb = @round(free_gb * 10.0) / 10.0,
        .items = items.items,
    };
}

test "findValue reads quoted manifest fields" {
    const acf =
        \\"AppState"
        \\{
        \\  "appid"    "730"
        \\  "name"     "Counter-Strike 2"
        \\  "installdir" "Counter-Strike Global Offensive"
        \\  "SizeOnDisk" "68512896000"
        \\}
    ;
    try std.testing.expectEqualStrings("Counter-Strike 2", findValue(acf, "\"name\"").?);
    try std.testing.expectEqualStrings("Counter-Strike Global Offensive", findValue(acf, "\"installdir\"").?);
    try std.testing.expectEqualStrings("68512896000", findValue(acf, "\"SizeOnDisk\"").?);
    try std.testing.expect(findValue(acf, "\"missing\"") == null);
}

test "pushChild keeps the largest three children" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    var list: std.ArrayList(Child) = .empty;
    try pushChild(alloc, &list, .{ .name = "a", .bytes = 10 });
    try pushChild(alloc, &list, .{ .name = "b", .bytes = 30 });
    try pushChild(alloc, &list, .{ .name = "c", .bytes = 20 });
    try pushChild(alloc, &list, .{ .name = "d", .bytes = 5 });

    try std.testing.expectEqual(@as(usize, 3), list.items.len);
    try std.testing.expectEqualStrings("b", list.items[0].name);
    try std.testing.expectEqualStrings("c", list.items[1].name);
    try std.testing.expectEqualStrings("a", list.items[2].name);
}

test "calculateStorageBreakdown categorizes correctly" {
    const io = std.testing.io;
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();

    try tmp.dir.createDirPath(io, "SteamLibrary/steamapps");
    try tmp.dir.createDirPath(io, "Pictures");
    try tmp.dir.writeFile(io, .{
        .sub_path = "SteamLibrary/steamapps/appmanifest_730.acf",
        .data =
        \\"AppState"
        \\{
        \\  "name" "Counter-Strike 2"
        \\  "installdir" "Counter-Strike Global Offensive"
        \\  "SizeOnDisk" "68512896000"
        \\}
        ,
    });
    try tmp.dir.writeFile(io, .{ .sub_path = "Pictures/photo.jpg", .data = "jpg-data" });

    const path = try alloc.print(
        ".zig-cache/tmp/{s}",
        .{std.mem.sliceTo(&tmp.sub_path, 0)},
    );
    const result = try calculateStorageBreakdown(alloc, io, path);

    var saw_games = false;
    var saw_free = false;
    for (result.items) |item| {
        if (std.mem.eql(u8, item.id, "games")) {
            saw_games = true;
            try std.testing.expect(std.mem.find(u8, item.detail, "Counter-Strike 2") != null);
        }
        if (std.mem.eql(u8, item.id, "free")) {
            saw_free = true;
        }
    }

    try std.testing.expect(saw_games);
    try std.testing.expect(saw_free);
}

test "calculateStorageBreakdown on root" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    const stats = getFsStats("/");
    try std.testing.expect(stats != null);
}
