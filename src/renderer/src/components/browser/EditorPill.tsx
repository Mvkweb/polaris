import { Show, type Component } from 'solid-js'
import { activeTabPath, currentView, openTabs, toggleEditorView } from '../../store'
import { FileIcon } from '../file-tree/FileIcon'
import { formatShortcut } from '../../shortcuts'

/**
 * Top-bar switch between the folder view and the editor. Present whenever
 * files are open; lit while the editor is showing. It unfolds/folds its width
 * so the bar re-flows smoothly when the first tab opens or the last closes.
 */
export const EditorPill: Component = () => {
  const active = () => openTabs().find((t) => t.path === activeTabPath()) ?? openTabs().at(-1)
  const editing = () => currentView() === 'editor'
  const extra = () => Math.max(0, openTabs().length - 1)

  return (
    <div class="editor-pill-wrap" classList={{ 'is-shown': openTabs().length > 0 }}>
      <div class="editor-pill-inner">
        <button
          type="button"
          onClick={toggleEditorView}
          aria-pressed={editing()}
          title={`${editing() ? 'Show folder' : 'Back to editor'} (${formatShortcut('Mod+E')})`}
          class={`editor-pill flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-md text-[12.5px] transition-colors cursor-pointer ${
            editing()
              ? 'bg-white/[0.08] text-white'
              : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Show when={active()}>
            {(tab) => (
              <>
                <FileIcon name={tab().name} isDirectory={false} class="w-3.5 h-3.5" />
                <span class="truncate max-w-[140px]">{tab().name}</span>
              </>
            )}
          </Show>
          <Show when={extra()}>
            <span class="tabular-nums text-white/35">+{extra()}</span>
          </Show>
        </button>
      </div>
    </div>
  )
}

export default EditorPill
