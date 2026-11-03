# Polaris UI Layout Architecture

## Overview
Polaris's visual identity and layout are directly modeled after the clean, dark-mode containerized structure seen in **Ember**, **Atlas**, and **KDE Dolphin**.

---

## 1. Primary Layout Regions

```
+-----------------------------------------------------------------------------+
| Top Window Header & Titlebar (Frameless Drag Region)                         |
+--------------------------+--------------------------------------------------+
| Sidebar                  | Central Main View                                |
|                          |                                                  |
| [Header Actions]         | +----------------------------------------------+ |
| - Toggle Sidebar         | | Blank / Empty Workspace Container            | |
| - Settings Gear          | |                                              | |
| - Space Selector         | |               [Polaris Icon]                 | |
|                          | |                No File Open                  | |
| [Quick Actions]          | |  Select a file from the sidebar to inspect.  | |
| - + New Note     Ctrl+N  | |                                              | |
| - Files          Ctrl+I  | |  [Quick Open Ctrl+P]                         | |
| - Search         Ctrl+F  | |  [Find in Files Ctrl+Shift+F]                | |
|                          | |  [Toggle Terminal Ctrl+`]                    | |
| [workspace]              | |                                              | |
|                          | +----------------------------------------------+ |
| [Places & Drives]        |                                                  |
| - Root /                 |                                                  |
| - Storage /mnt/storage   |                                                  |
| - Home / Documents ...   |                                                  |
|                          |                                                  |
| [Workspace Tree]         |                                                  |
| - Folders & Files        |                                                  |
|                          |                                                  |
| [Sidebar Footer]         | +----------------------------------------------+ |
| - Restart to update      | | Collapsible Terminal Drawer (F4 / Ctrl+`)    | |
| - Version v0.1.0         | +----------------------------------------------+ |
|                          | | Status Bar: Terminal+ | core: safe | branch  | |
+--------------------------+--------------------------------------------------+
```

---

## 2. Key Components

### 1. Sidebar (`src/renderer/src/components/Sidebar.tsx`)
- Sleek dark theme (`bg-[#121113]` or translucent dark glass).
- Top row: Sidebar toggle icon (`PanelLeftIcon`), Settings icon (`Cog6ToothIcon`), SpaceSwitcher with `DotTrack`.
- Action buttons:
  - `+ New Note` with `KbdHint combo="Ctrl+N"`
  - `Files` (active tab) with `KbdHint combo="Ctrl+I"`
  - `Search` with `KbdHint combo="Ctrl+F"`
- Section Header: `workspace` with checkmark.
- Atlas-inspired Places & Drives:
  - System Drives (Root `/`, Storage `/mnt/storage`, etc. strictly read-only).
  - Standard user folders (Home, Documents, Downloads, Desktop, Pictures, Trash).
- Workspace folder & file tree:
  - Collapsible directories.
  - File icons mapped by extension (e.g. `.ts`, `.zig`, `.json`, `.md`, `.yml`).
- Bottom section:
  - Update status and version `v0.1.0`.

### 2. Central Empty Workspace (`src/renderer/src/components/EmptyWorkspace.tsx`)
- Matches the exact startup look from the Ember screenshot:
  - Centered glowing flame/star glyph.
  - Heading: "No File Open" (or "No Selection").
  - Subtitle: "Select a file from the sidebar to inspect or edit code."
  - Keybinding action pills:
    - `Quick Open` `Ctrl+P`
    - `Find in Files` `Ctrl+Shift+F`
    - `Toggle Terminal` `Ctrl+\``

### 3. Bottom Terminal / Output Drawer (`src/renderer/src/components/TerminalDrawer.tsx`)
- Collapsible bottom panel with resizable drag handle.
- Quick toggle via `Ctrl+\`` or `F4` (matching KDE Dolphin / Ember).
- Tab controls: `Terminal`, `Output`, `Core Logs`.

### 4. Status Bar (`src/renderer/src/components/StatusBar.tsx`)
- Left: `>_ Terminal +` button to toggle drawer.
- Center/Right: Zig Core Sidecar status indicator (`● polaris-core (safe)`), branch indicator.
