# Polaris code map

Start with the feature you are changing. Electron main owns OS access, preload exposes the renderer API, and SolidJS owns the UI and its state. The Zig sidecar is read-only.

| Change | Start here |
| --- | --- |
| Launch arguments, single instance, installed profile | [Electron launch](../src/main/launch.ts) |
| Restore or choose a startup folder | [Renderer startup](../src/renderer/src/startup.ts), [main startup](../src/main/startup.ts), [startup tests](../tests/startup.test.ts) |
| Folder grid, tabs, path bar and navigation | [Browser](../src/renderer/src/components/browser/), [navigation state](../src/renderer/src/components/browser/state.ts) |
| Sidebar layout, Places, drives and activity | [Sidebar](../src/renderer/src/components/Sidebar.tsx), [sections](../src/renderer/src/components/sidebar/), [UI layout](ui-layout.md) |
| File reads, writes and properties | [Filesystem](../src/main/filesystem.ts), [file details](../src/main/fileDetails.ts) |
| Drive discovery, mounting and storage analysis | [Drives](../src/main/drives.ts), [native storage analysis](../core/src/storage.zig) |
| Indexing, search and Git | [Search](../src/main/search.ts), [Git](../src/main/git.ts), [native engine](../core/src/), [sidecar client](../src/main/core/EmberCore.ts) |
| IPC registration and types | [Main entry](../src/main/index.ts), [preload bridge](../src/preload/index.ts), [API declarations](../src/preload/index.d.ts), [shared models](../src/shared/ipcModels.ts) |
| Settings, shortcuts and local preferences | [Settings](../src/renderer/src/components/settings/), [shortcut registry](../src/renderer/src/shortcuts.ts) |
| Editor, terminal and media | [Editor](../src/renderer/src/components/editor/), [terminal](../src/renderer/src/components/terminal/), [media](../src/renderer/src/components/media/) |
| Dither engine and controls | [Engine](../src/renderer/src/lib/dither/), [controls](../src/renderer/src/components/dithercn/) |
| Installed builds, updater and Linux desktop entry | [Packaging](../packaging/), [main updater](../src/main/updates.ts), [distribution guide](distribution.md) |

Run `bun run check` and `bun run core:test` before committing. For startup changes, also run `bun test tests/startup.test.ts` and verify a relaunch with an isolated Electron profile.

The preload and renderer declarations of `FsEntry` and `FileProperties` differ. Review the existing payloads before consolidating either type.

Comments should explain constraints the code cannot express, such as why a platform workaround exists. Remove outdated claims and comments that repeat names or syntax. Update these links when moving code.
