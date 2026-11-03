const std = @import("std");

pub const MatchResult = struct {
    score: i32,
    matched: bool,
};

/// Computes a fuzzy match score for `query` inside `path`.
/// Returns score > 0 and matched = true if query is a subsequence of path.
pub fn scorePath(path: []const u8, query: []const u8) MatchResult {
    if (query.len == 0) return .{ .score = 100, .matched = true };
    if (path.len == 0 or query.len > path.len) return .{ .score = 0, .matched = false };

    var score: i32 = 0;
    var query_idx: usize = 0;
    var prev_matched_idx: ?usize = null;

    // Find where the filename portion begins
    var filename_start: usize = 0;
    for (path, 0..) |c, i| {
        if (c == '/' or c == '\\') {
            filename_start = i + 1;
        }
    }

    for (path, 0..) |path_char, path_idx| {
        if (query_idx >= query.len) break;

        const target_char = query[query_idx];
        const p_lower = std.ascii.toLower(path_char);
        const q_lower = std.ascii.toLower(target_char);

        if (p_lower == q_lower) {
            var char_score: i32 = 10;

            // Bonus: consecutive match
            if (prev_matched_idx) |prev| {
                if (path_idx == prev + 1) {
                    char_score += 25;
                } else {
                    const distance = path_idx - prev;
                    if (distance > 8) {
                        char_score -= 4;
                    }
                }
            } else {
                // First match at start of full path or start of filename
                if (path_idx == 0 or path_idx == filename_start) {
                    char_score += 35;
                }
            }

            // Bonus: match after a word or path delimiter
            if (path_idx > 0) {
                const prev_char = path[path_idx - 1];
                if (prev_char == '/' or prev_char == '\\' or prev_char == '_' or prev_char == '-' or prev_char == '.') {
                    char_score += 25;
                }
            }

            // Bonus: camelCase transition
            if (std.ascii.isUpper(path_char) and path_idx > 0 and std.ascii.isLower(path[path_idx - 1])) {
                char_score += 20;
            }

            // Bonus: match happens within the filename itself rather than outer directories
            if (path_idx >= filename_start) {
                char_score += 20;
            }

            // Exact case match
            if (path_char == target_char) {
                char_score += 5;
            }

            score += char_score;
            prev_matched_idx = path_idx;
            query_idx += 1;
        }
    }

    // All characters of the query must have matched in order
    if (query_idx < query.len) {
        return .{ .score = 0, .matched = false };
    }

    // Shorter paths get a slight tie-breaking bonus
    if (path.len < 120) {
        score += @intCast(120 - path.len);
    }

    return .{ .score = score, .matched = true };
}

test "fuzzy path scoring basics" {
    const r1 = scorePath("src/renderer/components/file-tree/FileTree.tsx", "ft");
    try std.testing.expect(r1.matched);

    const r2 = scorePath("src/renderer/components/file-tree/FileTree.tsx", "filetree");
    try std.testing.expect(r2.matched);

    const r3 = scorePath("src/renderer/components/file-tree/FileTree.tsx", "xyz123");
    try std.testing.expect(!r3.matched);

    // Exact filename match should score higher than matching distant directory letters
    const r_exact = scorePath("src/components/Terminal.tsx", "terminal");
    const r_diff = scorePath("src/tools/editor/router/main.ts", "terminal");
    try std.testing.expect(r_exact.score > r_diff.score);
}
