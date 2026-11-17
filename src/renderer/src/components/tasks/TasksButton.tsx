import { Show, type Component } from 'solid-js'
import { I } from '../ui/AppIcons'
import { activeTasks, overallProgress, setTasksPanelOpen, tasksPanelOpen } from '../../tasks'

const R = 6
const C = 2 * Math.PI * R

/** Status-bar entry for the Tasks panel; a ring fills while work is in flight. */
export const TasksButton: Component = () => (
  <button
    type="button"
    onClick={() => setTasksPanelOpen(!tasksPanelOpen())}
    title="Tasks"
    class={`flex items-center gap-1.5 text-[12.5px] font-medium transition-colors cursor-pointer hover:text-white focus:outline-none ${
      tasksPanelOpen() ? 'text-white' : 'text-white/55'
    }`}
  >
    <Show when={overallProgress() !== null} fallback={<I.tasks class="w-4 h-4" />}>
      <svg
        viewBox="0 0 16 16"
        class="w-4 h-4 -rotate-90"
        fill="none"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle class="tasks-ring-track" cx="8" cy="8" r={R} />
        <circle
          class="tasks-ring-fill"
          cx="8"
          cy="8"
          r={R}
          stroke-linecap="round"
          stroke-dasharray={`${C}`}
          stroke-dashoffset={`${C * (1 - (overallProgress() ?? 0))}`}
        />
      </svg>
    </Show>
    <span>Tasks</span>
    <Show when={activeTasks().length}>
      <span class="tabular-nums text-white/40">{activeTasks().length}</span>
    </Show>
  </button>
)

export default TasksButton
