import { Component, For, Show, createMemo, createSignal } from 'solid-js'
import {
  openTabs,
  activeTabPath,
  isFileDirty,
  lastSavedPath,
  setCurrentView,
  workspaceRoot
} from '../../store'
import { FileIcon } from '../file-tree/FileIcon'
import { DirtyMark } from '../ui/DirtyMark'
import { MediaViewer } from '../media/MediaViewer'
import { hasSourceView, mediaKind, mediaLabel } from '../media/mediaKind'
import TabBar from './TabBar'
import CodeEditor from './CodeEditor'
import EmptyState from './EmptyState'
import { detectLanguage } from './languages'

export const EditorPane: Component = () => {
  const [cursorPos, setCursorPos] = createSignal<{ line: number; col: number }>({
    line: 1,
    col: 1
  })

  const hasTabs = createMemo(() => openTabs().length > 0)
  const currentPath = () => activeTabPath()

  // Media files open in the viewer; SVGs can flip to their source and back.
  const [sourceViewPaths, setSourceViewPaths] = createSignal<ReadonlySet<string>>(new Set())
  const [mediaInfo, setMediaInfo] = createSignal<string | null>(null)
  const kind = createMemo(() => mediaKind(currentPath()))
  const showMedia = () => {
    const p = currentPath()
    return Boolean(p && kind() && !sourceViewPaths().has(p))
  }
  const setSourceView = (path: string, on: boolean): void => {
    const next = new Set(sourceViewPaths())
    if (on) next.add(path)
    else next.delete(path)
    setSourceViewPaths(next)
  }

  const langInfo = createMemo(() => {
    const p = currentPath()
    if (!p) return 'Plain Text'
    const k = kind()
    return k && showMedia() ? mediaLabel(p, k) : detectLanguage(p).name
  })

  const isDirty = () => Boolean(currentPath() && isFileDirty(currentPath()))
  const isSaved = () => Boolean(currentPath() && lastSavedPath() === currentPath())

  // Workspace-relative breadcrumb ("src › renderer › App.tsx"); outside the
  // workspace, $HOME folds to ~ and long paths keep only the last three folders.
  const crumbs = createMemo(() => {
    const p = currentPath()
    if (!p) return { dirs: [] as string[], file: '' }
    const root = workspaceRoot()
    const rel =
      root && p.startsWith(root + '/') ? p.slice(root.length + 1) : p.replace(/^\/home\/[^/]+/, '~')
    const parts = rel.split('/').filter(Boolean)
    const file = parts.pop() ?? p
    return { dirs: parts.length > 3 ? ['…', ...parts.slice(-3)] : parts, file }
  })

  return (
    <div class="relative flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0a0a0a] isolate">
      {/* ── Top Liquid Gooey TabBar ── */}
      <div class="shrink-0 z-20 flex items-center justify-between border-b border-white/[0.04]">
        <div class="flex-1 min-w-0">
          <TabBar />
        </div>

        {/* Back to File Browser button */}
        <button
          type="button"
          onClick={() => setCurrentView('files')}
          class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-md text-[11px] font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Return to File Explorer View"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
            <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12a.5.5 0 0 0 .354.146H13.5A1.5 1.5 0 0 1 15 5.207V12.5A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
          </svg>
          <span>Files</span>
        </button>
      </div>

      {/* ── Code Editor Body ── */}
      <div class="relative flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        <Show when={hasTabs() && currentPath()} fallback={<EmptyState />}>
          <Show
            when={showMedia()}
            fallback={
              <CodeEditor
                path={currentPath()!}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />
            }
          >
            <MediaViewer
              path={currentPath()!}
              kind={kind()!}
              onInfo={setMediaInfo}
              onViewSource={
                hasSourceView(currentPath()!)
                  ? () => setSourceView(currentPath()!, true)
                  : undefined
              }
            />
          </Show>
        </Show>
      </div>

      {/* ── Status bar: borderless, sans, everything at rest in white/35 ── */}
      <Show when={hasTabs() && currentPath()}>
        <div class="editor-status shrink-0 h-7 pl-4 pr-3.5 flex items-center justify-between gap-4 text-[11.5px] text-white/35 select-none">
          {/* Left: breadcrumb + save-state glyph that morphs dot → check */}
          <div class="flex items-center min-w-0 gap-1">
            <For each={crumbs().dirs}>
              {(dir) => (
                <>
                  <span class="truncate max-w-[140px] hover:text-white/60 transition-colors">
                    {dir}
                  </span>
                  <svg viewBox="0 0 16 16" class="w-2.5 h-2.5 shrink-0 text-white/20 -rotate-90">
                    <use href="#file-tree-icon-chevron" />
                  </svg>
                </>
              )}
            </For>
            <span class="text-white/85 font-medium truncate tracking-[-0.01em]">
              {crumbs().file}
            </span>
            <span
              class="editor-status-state relative ml-1 w-3 h-3 shrink-0"
              classList={{ 'is-dirty': isDirty(), 'is-saved': isSaved() && !isDirty() }}
              title={isDirty() ? 'Unsaved changes' : isSaved() ? 'Saved' : undefined}
            >
              <DirtyMark class="editor-status-dot w-[9px] h-[9px]" />
              <svg viewBox="0 0 12 12" class="editor-status-check" fill="none">
                <path d="M2.5 6.2 5 8.5l4.5-5" />
              </svg>
            </span>
          </div>

          {/* Right: language (with its Pierre icon), position, encoding */}
          <div class="flex items-center gap-4 shrink-0 tabular-nums">
            <span class="flex items-center gap-1.5 text-white/55">
              <FileIcon name={crumbs().file} isDirectory={false} class="w-3.5 h-3.5" />
              <span>{langInfo()}</span>
            </span>
            <Show
              when={showMedia()}
              fallback={
                <>
                  <Show when={kind() && currentPath() && hasSourceView(currentPath()!)}>
                    <button
                      type="button"
                      onClick={() => setSourceView(currentPath()!, false)}
                      class="text-white/45 hover:text-white/85 transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                  </Show>
                  <span class="font-mono text-[11px]">
                    <span class="text-white/70">{cursorPos().line}</span>
                    <span class="text-white/25">:</span>
                    <span class="text-white/70">{cursorPos().col}</span>
                  </span>
                  <span class="text-white/25 text-[11px]">UTF-8</span>
                </>
              }
            >
              <span class="text-white/70 text-[11.5px]">{mediaInfo() ?? '…'}</span>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default EditorPane
