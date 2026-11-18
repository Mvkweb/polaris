# Polaris Developer Guide

Operational instructions for AI agents and developers working in this repository.

---

## 1. Quick Executable Commands

Always run commands with **Bun** from the repository root:

```bash
# Verify the entire codebase (Oxlint + strict TypeScript for Node and Web)
bun run check

# Native Zig 0.17 core engine tests
bun run core:test

# Compile Zig core (safe for development, fast for production)
bun run core:build:dev
bun run core:build

# Lint and format
bun run lint
bun run lint:fix
bun run format

# Run development server
bun run dev

# Production build
bun run build
```

Before claiming task completion or creating a commit, always ensure `bun run check` and `bun run core:test` pass cleanly with zero errors.

---

## 2. Tech Stack & Version Pinning

- **Engine / Sidecar**: Zig **0.17.0** (`minimum_zig_version = "0.17.0"` in `core/build.zig.zon`). High-throughput, read-only file scanner and metadata engine (`polaris-core`).
- **Main / Preload**: Electron 44+ with Node 24+, bundled with `electron-vite`.
- **Renderer**: **SolidJS 1.9+** (NOT React), Tailwind CSS v4, TypeScript 5.9+.
- **Linter & Formatter**: Oxlint + Prettier.

---

## 3. Three-Tier Boundaries

### ALWAYS
- Keep all file system operations in `polaris-core` strictly **read-only** (never mutate, overwrite, or delete user files).
- Call `Menu.setApplicationMenu(null)` before `app.whenReady()` to avoid native menu initialization overhead.
- Follow SolidJS reactivity rules: never destructure props, keep getters intact, use `<Show>` and `<For>` instead of ternary/map expressions, derive with `createMemo`.
- Adhere to Zig 0.17 APIs (`std.Io`, `SafeAllocator`, `@backingInt`, `@fromBackingInt`, `@splat`).
- When a UI state is too fast or hard to reach by hand (loaders, progress, errors, transitions), use a dev-only test hook instead of slowing production code — never ship artificial delays in release builds.

### ASK FIRST
- Adding new npm dependencies or external packages.
- Changing IPC message schemas between `src/main/` and `src/renderer/`.
- Enabling any file write/modification APIs.

### NEVER
- **NEVER** use synchronous IPC (`ipcRenderer.sendSync` or blocking Main thread I/O).
- **NEVER** destructure SolidJS component props in function signatures or bodies.
- **NEVER** import React hooks (`useState`, `useEffect`) into SolidJS components.
- **NEVER** use deprecated Zig 0.16/0.15 syntax (no array `**`, no `std.builtin`, no `@intFromEnum`).

---

## 4. Documentation Index (`.docs/`)

For in-depth architectural guides, refer to:
- [Code map](.docs/code-map.md) — Feature owners, entry points and checks.
- [Performance Specification](file://.docs/performance.md) — 2026 Electron performance benchmarks & rules.
- [SolidJS Reactivity Guide](file://.docs/solidjs.md) — Fine-grained reactivity and component patterns.
- [Zig 0.17 Architecture](file://.docs/zig-architecture.md) — Memory allocators, std.Io, and sidecar IPC.
- [UI Layout Architecture](file://.docs/ui-layout.md) — Containerized multi-panel layout specifications.
- [Distribution & Updates](file://.docs/distribution.md) — Packaging (`polaris-fm-git`, Arch guidelines), the in-app updater, and the **going-public runbook**. Code that exists only while the repo is private is tagged `PRIVATE-PHASE` (`grep -rn PRIVATE-PHASE`).
