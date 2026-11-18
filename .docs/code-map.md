# Polaris code map

Start with the feature you are changing. Electron main owns OS access, preload exposes the renderer API, and SolidJS owns the UI and its state. The Zig sidecar is read-only.

| Change | Start here |
| --- | --- |
| Launch arguments, single instance, installed profile | [Electron launch](../src/main/launch.ts) |
| Restore or choose a startup folder | [Renderer startup](../src/renderer/src/startup.ts), [main startup](../src/main/startup.ts), [startup tests](../tests/startup.test.ts) |
| Folder grid, tabs, path bar and navigation | [Browser](../src/renderer/src/components/browser/) |
| Sidebar layout, Places and drives | [Sidebar](../src/renderer/src/components/Sidebar.tsx), [UI layout](ui-layout.md) |
| OS operations and IPC | [Main entry](../src/main/index.ts), [preload bridge](../src/preload/index.ts), [API declarations](../src/preload/index.d.ts), [shared types](../src/shared/) |
| Indexing, search and storage analysis | [Native engine](../core/src/), [active Electron client](../src/main/core/EmberCore.ts), [Zig architecture](zig-architecture.md) |
| Settings, shortcuts and local preferences | [Settings](../src/renderer/src/components/settings/), [shortcut registry](../src/renderer/src/shortcuts.ts) |
| Editor, terminal and media | [Editor](../src/renderer/src/components/editor/), [terminal](../src/renderer/src/components/terminal/), [media](../src/renderer/src/components/media/) |
| Dither engine and controls | [Engine](../src/renderer/src/lib/dither/), [controls](../src/renderer/src/components/dithercn/) |
| Installed builds, updater and Linux desktop entry | [Packaging](../packaging/), [main updater](../src/main/updates.ts), [distribution guide](distribution.md) |

Run `bun run check` and `bun run core:test` before committing. For startup changes, also run `bun test tests/startup.test.ts` and verify a relaunch with an isolated Electron profile.

Comments should explain constraints the code cannot express, such as why a platform workaround exists. Remove outdated claims and comments that repeat names or syntax. Update these links when moving code.
