import { createMemo, createSignal } from 'solid-js'
import type { TaskRecord, UploadService } from './types'

/** Renderer mirror of the main-process task registry + the Tasks panel state. */

export const [tasks, setTasks] = createSignal<TaskRecord[]>([])
export const [tasksPanelOpen, setTasksPanelOpen] = createSignal(false)
export const [uploadServices, setUploadServices] = createSignal<UploadService[]>([])

/** The drawer opens in the dark beside the canvas, like the details drawer. */
export const TASKS_WIDTH = 320
export const tasksVisibleWidth = (): number => (tasksPanelOpen() ? TASKS_WIDTH : 0)

export const activeTasks = createMemo(() =>
  tasks().filter((t) => t.status === 'running' || t.status === 'queued')
)
export const finishedTasks = createMemo(() =>
  tasks().filter((t) => t.status !== 'running' && t.status !== 'queued')
)
/** 0..1 across everything in flight, null when idle */
export const overallProgress = createMemo(() => {
  const list = activeTasks()
  if (!list.length) return null
  const total = list.reduce((a, t) => a + t.total, 0)
  return total > 0 ? list.reduce((a, t) => a + t.sent, 0) / total : 0
})

let started = false
/** Call once at app start. */
export const initTasks = (): (() => void) | undefined => {
  if (started || !window.api?.listTasks) return
  started = true
  void window.api.listTasks().then(setTasks)
  void window.api.uploadServices().then(setUploadServices)
  return window.api.onTasksChanged(setTasks)
}

export const uploadFiles = async (paths: string[], serviceId: string): Promise<void> => {
  if (!paths.length) return
  setTasksPanelOpen(true)
  await window.api.startUpload(paths, serviceId)
}
