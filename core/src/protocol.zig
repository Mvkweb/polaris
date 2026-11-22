const std = @import("std");

pub const Request = struct {
    id: ?i64 = null,
    method: []const u8,
    params: ?std.json.Value = null,
};

pub const SearchResult = struct {
    name: []const u8,
    path: []const u8,
    relativePath: []const u8,
    score: i32,
    isDirectory: bool = false,
};

pub const IndexResult = struct {
    indexed_count: usize,
    elapsed_ms: i64,
};

pub const PongResult = struct {
    status: []const u8 = "pong",
    version: []const u8 = "0.1.0",
};

pub fn parseRequest(arena: std.mem.Allocator, line: []const u8) !Request {
    return std.json.parseFromSliceLeaky(Request, arena, line, .{
        .ignore_unknown_fields = true,
    });
}

pub fn writeResponse(writer: *std.Io.Writer, id: ?i64, result_value: anytype) !void {
    try writer.writeAll("{\"id\":");
    if (id) |req_id| {
        try writer.print("{d}", .{req_id});
    } else {
        try writer.writeAll("null");
    }
    try writer.writeAll(",\"result\":");
    try std.json.Stringify.value(result_value, .{}, writer);
    try writer.writeAll("}\n");
}

pub fn writeError(writer: *std.Io.Writer, id: ?i64, err_message: []const u8) !void {
    try writer.writeAll("{\"id\":");
    if (id) |req_id| {
        try writer.print("{d}", .{req_id});
    } else {
        try writer.writeAll("null");
    }
    try writer.writeAll(",\"error\":");
    try std.json.Stringify.value(err_message, .{}, writer);
    try writer.writeAll("}\n");
}

test "parseRequest and writeResponse" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();

    const raw = "{\"id\": 42, \"method\": \"ping\"}";
    const req = try parseRequest(arena.allocator(), raw);
    try std.testing.expectEqual(@as(?i64, 42), req.id);
    try std.testing.expectEqualStrings("ping", req.method);

    var buf: [256]u8 = undefined;
    var w = std.Io.Writer.fixed(&buf);
    try writeResponse(&w, req.id, PongResult{});
    const output = w.buffered();
    try std.testing.expect(std.mem.find(u8, output, "\"pong\"") != null);
}
