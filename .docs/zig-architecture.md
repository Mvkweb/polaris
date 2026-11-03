# Zig 0.17 Architecture & Native Engine Specification

## Overview
Polaris uses a native Zig 0.17 sidecar executable (`polaris-core`) for high-throughput, memory-efficient filesystem scanning, metadata querying, and fuzzy indexing.

All Zig code in this project adheres strictly to the **Zig 0.17.0** release standards.

---

## 1. Safety & Read-Only Constraints

> [!IMPORTANT]
> The `polaris-core` engine is **strictly read-only**.
> It possesses zero APIs to delete, rename, modify, truncate, or overwrite files on the user's filesystem.
> All directory traversal, metadata extraction (`stat`), and mount-point detection operate purely with read permissions.

---

## 2. Critical Zig 0.17 Language & Stdlib Patterns

### Entry Point & std.Io
In Zig 0.17, `main` takes `init: std.process.Init`. Concurrency, files, and clocks use the `init.io` interface:
```zig
pub fn main(init: std.process.Init) !void {
    const io = init.io;
    const gpa = init.gpa;
    ...
}
```

### Removed Builtins & Syntax Changes
1. **Array Repetition (`**`) Removed**:
   - Replaced by `@splat`.
   - `var buf: [64]u8 = @splat(0);`
2. **Enum Conversion**:
   - `@intFromEnum` replaced by `@backingInt(c)`.
   - `@enumFromInt` replaced by `@fromBackingInt(@intCast(i))`.
3. **Optimizations Spellings**:
   - Target optimize mode compared against `std.lang.Optimize`: `.debug`, `.safe`, `.fast`, `.small`.
4. **Standard Library Renames**:
   - `std.builtin` -> `std.lang`
   - `std.fmt.allocPrint` -> `allocator.print`
   - `std.fmt.bufPrint` -> `std.mem.print`
   - `std.mem.indexOf*` -> `std.mem.find*`
   - `std.heap.DebugAllocator` / `GeneralPurposeAllocator` -> `std.heap.SafeAllocator`

---

## 3. Memory Allocator Strategy

- **`SafeAllocator` / General Purpose**: For long-lived workspace indices and sidecar state.
- **`ArenaAllocator` (Scratch Arena)**: Each JSON-RPC request line received over stdin uses a scratch arena that is reset after writing the response. This ensures zero memory fragmentation and instantaneous cleanup:
  ```zig
  var scratch_arena = std.heap.ArenaAllocator.init(gpa);
  defer scratch_arena.deinit();

  while (try reader.interface.takeDelimiter('\n')) |line| {
      defer _ = scratch_arena.reset(.retain_capacity);
      const scratch = scratch_arena.allocator();
      // Parse, scan, write response using scratch memory...
  }
  ```

---

## 4. Stdio JSON-RPC Communication

The sidecar communicates with Electron over standard streams (`stdin` / `stdout`) using newline-delimited JSON.

### Message Shape
- Request:
  ```json
  {"id": 1, "method": "scan_dir", "params": {"path": "/mnt/storage"}}
  ```
- Response:
  ```json
  {"id": 1, "result": {"path": "/mnt/storage", "entries": [...]}}
  ```
- Error:
  ```json
  {"id": 1, "error": {"code": -32000, "message": "AccessDenied"}}
  ```

Stdout is buffered (`writer = std.Io.File.stdout().writer(io, &out_buf)`) and flushed explicitly after each response.
