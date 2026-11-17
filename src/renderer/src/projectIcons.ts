import { createSignal } from 'solid-js'
import { mediaUrl } from './components/media/mediaKind'

/**
 * Folder → project icon (favicon/logo) lookup, batched: every folder rendered
 * in the same tick goes to the main process in one IPC call. Answers are kept
 * for the session; refreshFolderIcons() drops them after file changes.
 */

const cache = new Map<string, string | null>()
const pending = new Set<string>()
const [version, setVersion] = createSignal(0)
let scheduled = false

const flush = async (): Promise<void> => {
  scheduled = false
  const dirs = [...pending]
  pending.clear()
  if (!dirs.length || !window.api?.projectIcons) return
  try {
    const found = await window.api.projectIcons(dirs)
    for (const d of dirs) cache.set(d, found[d] ? mediaUrl(found[d]!) : null)
  } catch {
    for (const d of dirs) cache.set(d, null)
  }
  setVersion((v) => v + 1)
}

/** Reactive: icon URL for a folder, or null (also null while resolving). */
export const folderIconUrl = (dir: string): string | null => {
  version()
  const hit = cache.get(dir)
  if (hit !== undefined) return hit
  if (!pending.has(dir)) {
    pending.add(dir)
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => void flush())
    }
  }
  return null
}

export const refreshFolderIcons = (): void => {
  cache.clear()
  setVersion((v) => v + 1)
}
