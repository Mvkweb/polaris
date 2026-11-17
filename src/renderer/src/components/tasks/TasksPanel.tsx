import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  type Component
} from 'solid-js'
import { INSPECTOR_TRANSITION, closeInspector, isInspectorOpen } from '../../store'
import {
  TASKS_WIDTH,
  activeTasks,
  finishedTasks,
  setTasksPanelOpen,
  tasks,
  tasksPanelOpen,
  tasksVisibleWidth
} from '../../tasks'
import type { TaskRecord } from '../../types'
import { TaskRow } from './TaskRow'
import './tasks.css'

const dayLabel = (ms: number): string => {
  const d = new Date(ms)
  if (d.toDateString() === new Date().toDateString()) return 'today'
  if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return 'yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toLowerCase()
}

/**
 * Tasks drawer: opens in the dark beside the canvas exactly like the details
 * drawer — the canvas pulls aside and the list sits in the "hole" it leaves.
 * Shares that slot with details: opening one closes the other.
 */
export const TasksPanel: Component = () => {
  let asideRef: HTMLElement | undefined

  const groups = createMemo(() => {
    const out: { label: string; items: TaskRecord[] }[] = []
    for (const t of finishedTasks()) {
      const label = dayLabel(t.finishedAt ?? t.createdAt)
      const last = out.at(-1)
      if (last?.label === label) last.items.push(t)
      else out.push({ label, items: [t] })
    }
    return out
  })
  // Scroll fades appear only where there is more content to scroll to.
  let bodyRef: HTMLDivElement | undefined
  const [fade, setFade] = createSignal({ top: false, bottom: false })
  const measureFade = (el: HTMLElement): void => {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    if (top !== fade().top || bottom !== fade().bottom) setFade({ top, bottom })
  }
  createEffect(
    on([() => tasks().length, tasksPanelOpen], () => {
      requestAnimationFrame(() => bodyRef && measureFade(bodyRef))
    })
  )
  const doneCount = () => finishedTasks().filter((t) => t.status === 'done').length

  // One right-hand drawer at a time.
  createEffect(
    on(tasksPanelOpen, (open) => open && isInspectorOpen() && closeInspector(), { defer: true })
  )
  createEffect(on(isInspectorOpen, (open) => open && setTasksPanelOpen(false), { defer: true }))

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !tasksPanelOpen()) return
    const t = e.target as HTMLElement | null
    if (t?.closest('input, textarea, .cm-editor, .xterm')) return
    setTasksPanelOpen(false)
  }
  window.addEventListener('keydown', onKey)
  onCleanup(() => window.removeEventListener('keydown', onKey))

  return (
    <aside
      ref={asideRef}
      class="tasks-drawer relative shrink-0 h-full overflow-hidden bg-[#050505] select-none"
      style={{ width: `${tasksVisibleWidth()}px`, transition: `width ${INSPECTOR_TRANSITION}` }}
      onTransitionEnd={(e) => {
        if (e.target === asideRef) window.dispatchEvent(new Event('resize'))
      }}
      aria-label="Tasks"
      aria-hidden={!tasksPanelOpen()}
    >
      {/* Fixed-width inner so rows don't reflow while the drawer slides */}
      <div
        class="tasks-drawer-inner absolute top-0 bottom-0 left-0 flex flex-col pl-3 pr-1"
        classList={{ 'is-open': tasksPanelOpen() }}
        style={{ width: `${TASKS_WIDTH}px` }}
      >
        {/* Header — same voice as the details drawer and sidebar labels */}
        <div class="shrink-0 flex items-center gap-2 h-8 px-1.5">
          <span class="text-[13.5px] font-medium text-white/60">tasks</span>
          <span class="text-[11.5px] text-white/25 tabular-nums">
            <Show when={activeTasks().length} fallback={doneCount() ? `${doneCount()} done` : ''}>
              {activeTasks().length} running
            </Show>
          </span>
          <div class="ml-auto flex items-center gap-0.5 -mr-1">
            <button
              type="button"
              class="tasks-text-btn h-6 px-2 rounded-md text-[12px]"
              disabled={finishedTasks().length === 0}
              onClick={() => void window.api.clearTasks()}
            >
              Clear
            </button>
            <button
              type="button"
              aria-label="Close tasks"
              title="Close (Esc)"
              class="tasks-text-btn w-6 h-6 rounded-md flex items-center justify-center"
              onClick={() => setTasksPanelOpen(false)}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
              </svg>
            </button>
          </div>
        </div>

        <div
          class="tasks-body flex-1 min-h-0 overflow-y-auto pb-3"
          classList={{ 'fade-top': fade().top, 'fade-bottom': fade().bottom }}
          onScroll={(e) => measureFade(e.currentTarget)}
          ref={(el) => {
            bodyRef = el
            queueMicrotask(() => measureFade(el))
          }}
        >
          <Show
            when={activeTasks().length || finishedTasks().length}
            fallback={
              <div class="flex flex-col gap-1 px-1.5 pt-6">
                <span class="text-[13px] text-white/50">Nothing here yet</span>
                <span class="text-[12px] text-white/25">Right-click a file → Upload to</span>
              </div>
            }
          >
            <Show when={activeTasks().length}>
              <div class="tasks-section">running</div>
              <For each={activeTasks()}>{(t) => <TaskRow task={t} />}</For>
            </Show>
            <For each={groups()}>
              {(g) => (
                <>
                  <div class="tasks-section">{g.label}</div>
                  <For each={g.items}>{(t) => <TaskRow task={t} />}</For>
                </>
              )}
            </For>
          </Show>
        </div>
      </div>
    </aside>
  )
}

export default TasksPanel
