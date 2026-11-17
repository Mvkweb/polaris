import { Show, type Component } from 'solid-js'
import { I } from '../ui/AppIcons'
import { Loader } from '../dithercn/loader'
import { activeTasks, overallProgress, setTasksPanelOpen, tasksPanelOpen } from '../../tasks'

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
      <Loader
        variant="ring"
        height={16}
        cell={1}
        progress={overallProgress() ?? 0}
        label="Uploading"
      />
    </Show>
    <span>Tasks</span>
    <Show when={activeTasks().length}>
      <span class="tabular-nums text-white/40">{activeTasks().length}</span>
    </Show>
  </button>
)

export default TasksButton
