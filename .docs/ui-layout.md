# Polaris UI layout

[App.tsx](../src/renderer/src/App.tsx) composes the main window:

- The [sidebar](../src/renderer/src/components/Sidebar.tsx) arranges [its sections](../src/renderer/src/components/sidebar/) and the [update footer](../src/renderer/src/components/UpdateFooter.tsx). Places and drive state live for the lifetime of the sidebar, including when the tree or activity views are visible.
- The [browser top bar](../src/renderer/src/components/browser/BrowserTopBar.tsx) holds navigation, the location field, folder tabs and filters. The canvas switches between the [folder grid](../src/renderer/src/components/browser/FolderView.tsx) and the [editor](../src/renderer/src/components/editor/EditorPane.tsx).
- The [inspector](../src/renderer/src/components/inspector/InspectorDrawer.tsx) and [tasks panel](../src/renderer/src/components/tasks/TasksPanel.tsx) sit beside the canvas.
- The bottom drawer is sized and mounted in App. Each session uses [Terminal.tsx](../src/renderer/src/components/terminal/Terminal.tsx). The [status bar](../src/renderer/src/components/StatusBar.tsx) provides terminal tabs and a resize handle.

[Startup](../src/renderer/src/startup.ts) resolves the initial folder before the grid reads it. [Settings](../src/renderer/src/components/settings/) and quick open are overlays. The [shortcut registry](../src/renderer/src/shortcuts.ts) owns keyboard bindings.
