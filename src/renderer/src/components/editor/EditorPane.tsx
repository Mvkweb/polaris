import { Component, Show, createMemo, createSignal } from 'solid-js'
import {
  openTabs,
  activeTabPath,
  isFileDirty,
  lastSavedPath,
  setCurrentView
} from '../../store'
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

  const langInfo = createMemo(() => {
    const p = currentPath()
    return p ? detectLanguage(p).name : 'Plain Text'
  })

  const isDirty = () => Boolean(currentPath() && isFileDirty(currentPath()))
  const isSaved = () => Boolean(currentPath() && lastSavedPath() === currentPath())

  return (
    <div class="relative flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0a0a0a] select-none isolate">
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
          <CodeEditor
            path={currentPath()!}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
          />
        </Show>
      </div>

      {/* ── Editor Footer / Status Bar ── */}
      <Show when={hasTabs() && currentPath()}>
        <div class="shrink-0 h-6 px-3 flex items-center justify-between bg-[#080808] border-t border-white/[0.04] text-[11px] font-mono text-white/40 select-none">
          {/* Left: Active File Path & Dirty State */}
          <div class="flex items-center gap-2 truncate max-w-[60%]">
            <span class="truncate text-white/50">{currentPath()}</span>
            <Show when={isDirty()}>
              <span class="flex items-center gap-1 text-amber-400 font-sans text-[10px]">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Modified (Ctrl+S to save)</span>
              </span>
            </Show>
            <Show when={isSaved()}>
              <span class="flex items-center gap-1 text-emerald-400 font-sans text-[10px]">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Saved</span>
              </span>
            </Show>
          </div>

          {/* Right: Language, Line & Column, Encoding */}
          <div class="flex items-center gap-3 shrink-0 tabular-nums">
            <span>{langInfo()}</span>
            <span>
              Ln {cursorPos().line}, Col {cursorPos().col}
            </span>
            <span>UTF-8</span>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default EditorPane
