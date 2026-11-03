# Modern Electron Performance Specification (2026 Edition)

## Overview
Polaris is built to be an exceptionally lightweight desktop application. This document outlines the core principles and architectural constraints ensuring near-zero startup latency, minimal memory footprint, and instantaneous UI response.

---

## 1. Startup Latency Optimization

### Call `Menu.setApplicationMenu(null)` Pre-Ready
Electron generates a default native window menu during startup unless explicitly instructed otherwise. Constructing this menu incurs synchronous IPC calls and window manager registration costs.
- **Rule**: Call `Menu.setApplicationMenu(null)` at module top-level in `src/main/index.ts` *before* `app.whenReady()`.

### Eliminate Flash of White (FOW) via `ready-to-show`
Creating a window directly with `show: true` causes frame flickering and flashes white before Chromium finishes initial HTML parsing and layout styling.
- **Rule**: Initialize `BrowserWindow` with:
  ```ts
  const mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  ```

### Defer Module Loading
In Node.js/Electron, synchronous `require()` and top-level module evaluations block the V8 event loop during initialization.
- **Rule**: Load modules just-in-time when operations are requested, rather than eagerly at application boot.
- Sidecar processes (`polaris-core`) and file watchers should only start after the primary UI is painted.

### Bundling Strategy
All scripts in `src/main` and `src/preload` are bundled into compact single files via `electron-vite`. This reduces disk read operations from hundreds of small filesystem calls to a single file read.

---

## 2. Process Boundaries & Zero Main Process Blocking

### The Main Process is an Orchestrator
Electron's main process runs on a single thread alongside the OS windowing loop. Any CPU-heavy computation, JSON parsing of multi-megabyte payloads, or filesystem iteration halts user input handling and window animations.
- **Rule**: The Main process handles window lifecycles, native menus, and typed IPC bridging.
- All file scanning, fuzzy indexing, and metadata extraction are executed in the **native Zig 0.17 sidecar** (`polaris-core`).

### Zero Synchronous IPC
- `ipcRenderer.sendSync` is strictly banned across the codebase.
- Always use asynchronous request/response channels (`ipcMain.handle` with `ipcRenderer.invoke`).

---

## 3. Memory Hygiene & Resource Management

### Fine-Grained SolidJS Reactivity
Unlike virtual DOM frameworks (React) that recreate and diff virtual trees on every state update, SolidJS compiles JSX into fine-grained real DOM updates that execute once and update only specific DOM text nodes or attributes. This yields significantly lower heap allocation rates and zero GC thrashing.

### IPC Payload Size Limits
Avoid serializing enormous JSON arrays across IPC. For directories containing tens of thousands of items:
- Chunk directory listings or paginate.
- Retrieve file stats on demand rather than pre-fetching entire filesystem trees into RAM.

---

## 4. Chromium Engine Configuration

Polaris appends the following flags to optimize headless/frameless rendering:
```ts
app.commandLine.appendSwitch('force-dark-mode')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
```
- `force-dark-mode`: Ensures native GTK/Windows elements and scrollbars render in dark mode immediately without color inversion flashes.
- `CalculateNativeWinOcclusion`: Prevents Chromium background throttling anomalies on multi-monitor Linux/Windows setups.
