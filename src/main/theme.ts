import { BrowserWindow, ipcMain } from 'electron'
import { watch, type FSWatcher } from 'fs'
import { readFile, stat } from 'fs/promises'
import { homedir } from 'os'
import { basename, dirname, join } from 'path'
import type { WallpaperPalette } from '../shared/ipcModels'

export type { WallpaperPalette } from '../shared/ipcModels'

const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')

/**
 * `POLARIS_THEME` is an explicit single-file override: when set, only that
 * file is read, exactly like before dithergen had its own output.
 *
 * Otherwise Polaris watches matugen's file and dithergen's own file. Each
 * generator owns its path, so a dithergen run never disturbs matugen's setup.
 */
const explicitPath = process.env.POLARIS_THEME
const MATUGEN_PATH = explicitPath || join(configHome, 'polaris', 'theme.json')
const DITHERGEN_PATH = explicitPath
  ? null
  : process.env.POLARIS_THEME_DITHERGEN || join(configHome, 'polaris', 'dithergen', 'theme.json')

const HEX = /^#[0-9a-f]{6}$/i

interface ThemeSource {
  path: string
  /** Last valid palette, kept while the file is half-written. */
  palette: WallpaperPalette | null
  /** Raw text of the last valid palette, for change detection. */
  raw: string
  /** mtime of the last valid palette, in nanoseconds for tie-free ordering. */
  mtimeNs: bigint
}

const makeSource = (path: string): ThemeSource => ({
  path,
  palette: null,
  raw: '',
  mtimeNs: 0n
})

const sources: ThemeSource[] = [makeSource(MATUGEN_PATH)]
if (DITHERGEN_PATH) sources.push(makeSource(DITHERGEN_PATH))

let current: WallpaperPalette | null = null
let currentPath = MATUGEN_PATH
let currentKey = ''
let initialized = false

const parse = (raw: string): WallpaperPalette | null => {
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    const pick = (k: string): string | null =>
      typeof j[k] === 'string' && HEX.test(j[k] as string) ? (j[k] as string).toLowerCase() : null
    const primary = pick('primary')
    if (!primary) return null
    return {
      primary,
      onPrimary: pick('onPrimary') ?? '#000000',
      primaryContainer: pick('primaryContainer') ?? primary,
      tertiary: pick('tertiary') ?? primary
    }
  } catch {
    return null // half-written file; the next change event will carry the full one
  }
}

const broadcast = (): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('theme:changed', current)
  }
}

/**
 * Read one source and keep its last valid palette.
 *
 * - missing/empty file → palette cleared (same as the original watcher);
 * - invalid content → ignored, previous palette kept;
 * - valid content → palette plus the file's mtime.
 */
const refreshSource = async (source: ThemeSource): Promise<void> => {
  let mtimeNs: bigint
  try {
    mtimeNs = (await stat(source.path, { bigint: true })).mtimeNs
  } catch {
    source.palette = null
    source.raw = ''
    source.mtimeNs = 0n
    return
  }

  let raw: string
  try {
    raw = await readFile(source.path, 'utf8')
  } catch {
    source.palette = null
    source.raw = ''
    source.mtimeNs = 0n
    return
  }

  if (raw === '') {
    source.palette = null
    source.raw = ''
    source.mtimeNs = mtimeNs
    return
  }

  if (raw === source.raw) {
    source.mtimeNs = mtimeNs // identical rewrite: still the newest file
    return
  }

  const next = parse(raw)
  if (!next) return // invalid/half-written; keep the last good palette

  source.palette = next
  source.raw = raw
  source.mtimeNs = mtimeNs
}

/** Pick the valid file with the newest mtime and broadcast only real changes. */
const select = (): void => {
  let best: ThemeSource | null = null
  for (const source of sources) {
    if (!source.palette) continue
    // Ties go to the later source (dithergen), the explicit `bun run theme`
    // path; matugen-only setups have no second source to tie with.
    if (!best || source.mtimeNs >= best.mtimeNs) best = source
  }

  const key = best ? `${best.path}\u0000${best.raw}` : ''
  if (key === currentKey) return

  currentKey = key
  current = best?.palette ?? null
  currentPath = best?.path ?? MATUGEN_PATH
  broadcast()
}

const reloadNow = async (): Promise<void> => {
  await Promise.all(sources.map(refreshSource))
  select()
  initialized = true
}

// Coalesce bursts (write + rename + chmod arrive as several inotify events) into
// one read on the next macrotask — no timer delay, so the update is effectively
// instant while still doing a single ~1 KB read per wallpaper change.
let pending = false
const reload = (): void => {
  if (pending) return
  pending = true
  setImmediate(async () => {
    pending = false
    await reloadNow()
  })
}

/**
 * Watch a source's directory (survives atomic rename-writes) with inotify, and
 * its parent while the directory itself does not exist yet. No polling.
 */
const watchSource = (source: ThemeSource): void => {
  const dir = dirname(source.path)
  const file = basename(source.path)
  let dirWatcher: FSWatcher | null = null
  let parentWatcher: FSWatcher | null = null

  const armParent = (): void => {
    const parent = dirname(dir)
    try {
      parentWatcher = watch(parent, { persistent: false }, (_event, name) => {
        if (name !== basename(dir)) return
        parentWatcher?.close()
        parentWatcher = null
        // The directory may have appeared together with its file, before the
        // new watcher was armed, so read once as soon as it arms successfully.
        if (!armDir()) armParent()
        else reload()
      })
      parentWatcher.on('error', () => {
        parentWatcher?.close()
        parentWatcher = null
        if (!armDir()) armParent()
        else reload()
      })
    } catch {
      /* parent missing too — wallpaper sync simply stays off for this source */
    }
  }

  const armDir = (): boolean => {
    try {
      dirWatcher = watch(dir, { persistent: false }, (_event, name) => {
        if (!name || name === file) reload()
      })
      dirWatcher.on('error', () => {
        dirWatcher?.close()
        dirWatcher = null
        if (!armDir()) armParent()
        else reload()
      })
      return true
    } catch {
      return false
    }
  }

  if (!armDir()) armParent()
}

const startWatcher = (): void => {
  for (const source of sources) watchSource(source)
}

let watching = false
export const startThemeWatcher = (): void => {
  if (watching) return
  watching = true
  startWatcher()
  reload()
}

/** Current palette; reads the files directly if the watcher hasn't loaded them yet. */
export const getWallpaperTheme = async (): Promise<WallpaperPalette | null> => {
  if (!initialized || !current) await reloadNow()
  return current
}

/** The theme file currently in use (matugen's path until dithergen wins). */
export const wallpaperThemePath = (): string => currentPath

export function registerThemeIpc(): void {
  startThemeWatcher()
  ipcMain.handle('theme:get', () => getWallpaperTheme())
  ipcMain.handle('theme:path', () => wallpaperThemePath())
}
