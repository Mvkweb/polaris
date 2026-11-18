import { app, BrowserWindow, ipcMain } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { TaskRecord, TaskStatus } from '../shared/ipcModels'

export type { TaskRecord, TaskStatus } from '../shared/ipcModels'

const MAX_HISTORY = 200
const STORE = (): string => join(app.getPath('userData'), 'tasks.json')

let tasks: TaskRecord[] = []
const cancelers = new Map<string, () => void>()

let flushTimer: NodeJS.Timeout | null = null
const broadcast = (): void => {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('tasks:changed', tasks)
    }
  }, 80)
}

let saveTimer: NodeJS.Timeout | null = null
const persist = (): void => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void writeFile(STORE(), JSON.stringify(tasks.slice(0, MAX_HISTORY))).catch(() => {})
  }, 400)
}

export const loadTasks = async (): Promise<void> => {
  try {
    const raw = JSON.parse(await readFile(STORE(), 'utf8')) as TaskRecord[]
    tasks = Array.isArray(raw)
      ? raw.map((t) =>
          t.status === 'running' || t.status === 'queued'
            ? {
                ...t,
                status: 'error',
                error: 'Interrupted',
                finishedAt: t.finishedAt ?? Date.now()
              }
            : t
        )
      : []
  } catch {
    tasks = []
  }
}

// ── API for task producers ────────────────────────────────────────────────
export const createTask = (t: Omit<TaskRecord, 'status' | 'sent' | 'createdAt'>): TaskRecord => {
  const rec: TaskRecord = { ...t, status: 'queued', sent: 0, createdAt: Date.now() }
  tasks.unshift(rec)
  if (tasks.length > MAX_HISTORY) tasks.length = MAX_HISTORY
  broadcast()
  return rec
}

export const updateTask = (id: string, patch: Partial<TaskRecord>): void => {
  const i = tasks.findIndex((t) => t.id === id)
  if (i < 0) return
  tasks[i] = { ...tasks[i], ...patch }
  broadcast()
  if (patch.status && patch.status !== 'running') persist()
}

export const taskStatus = (id: string): TaskStatus | undefined =>
  tasks.find((t) => t.id === id)?.status

export const setCanceler = (id: string, fn: (() => void) | null): void => {
  if (fn) cancelers.set(id, fn)
  else cancelers.delete(id)
}

export const registerTaskIpc = (): void => {
  ipcMain.handle('tasks:list', () => tasks)
  ipcMain.handle('tasks:cancel', (_e, id: string) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || (t.status !== 'queued' && t.status !== 'running')) return false
    cancelers.get(id)?.()
    updateTask(id, { status: 'canceled', finishedAt: Date.now() })
    return true
  })
  ipcMain.handle('tasks:remove', (_e, id: string) => {
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === 'running' || t.status === 'queued') return false
    tasks = tasks.filter((x) => x.id !== id)
    broadcast()
    persist()
    return true
  })
  ipcMain.handle('tasks:clear', () => {
    tasks = tasks.filter((t) => t.status === 'running' || t.status === 'queued')
    broadcast()
    persist()
    return true
  })
}
