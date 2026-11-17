import { app, BrowserWindow, ipcMain } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Background task registry (uploads today; anything long-running later).
 * Newest first, capped history, persisted to userData so the panel shows what
 * you did yesterday. Progress broadcasts are coalesced to ~12/s.
 */

export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export interface TaskRecord {
  id: string
  kind: 'upload'
  /** producer-specific id, e.g. the upload service (used for Retry) */
  serviceId: string
  fileName: string
  filePath: string
  /** destination label, e.g. "Litterbox · 1 hour" */
  target: string
  status: TaskStatus
  sent: number
  total: number
  url?: string
  error?: string
  /** epoch ms when the uploaded file stops existing, if the host says so */
  expiresAt?: number
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

const MAX_HISTORY = 200
const STORE = (): string => join(app.getPath('userData'), 'tasks.json')

let tasks: TaskRecord[] = []
const cancelers = new Map<string, () => void>()

// ── Broadcast (coalesced) ─────────────────────────────────────────────────
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

// ── Persistence (only terminal states matter; debounced) ──────────────────
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
