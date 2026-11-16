import { BrowserWindow } from 'electron'
import { watch, type FSWatcher } from 'fs'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { basename, dirname, join } from 'path'

/**
 * Wallpaper-synced palette, written by an external generator (dithergen or
 * matugen) from `resources/themes/polaris.json`. Polaris never generates or
 * writes it — it only watches and reads. Kept tiny on purpose: the renderer
 * derives every tint from these few roles with CSS color-mix.
 */
export interface WallpaperPalette {
  primary: string
  onPrimary: string
  primaryContainer: string
  tertiary: string
}

const THEME_PATH =
  process.env.POLARIS_THEME ||
  join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'polaris', 'theme.json')

const HEX = /^#[0-9a-f]{6}$/i
let current: WallpaperPalette | null = null
let lastRaw = ''

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

// Coalesce bursts (write + rename + chmod arrive as several inotify events) into
// one read on the next macrotask — no timer delay, so the update is effectively
// instant while still doing a single ~1 KB read per wallpaper change.
let pending = false
const reload = (): void => {
  if (pending) return
  pending = true
  setImmediate(async () => {
    pending = false
    let raw = ''
    try {
      raw = await readFile(THEME_PATH, 'utf8')
    } catch {
      raw = '' // deleted → fall back to the user's chosen accent
    }
    if (raw === lastRaw) return
    lastRaw = raw
    const next = raw ? parse(raw) : null
    if (raw && !next) return // ignore invalid content, keep the last good palette
    current = next
    broadcast()
  })
}

let dirWatcher: FSWatcher | null = null
let parentWatcher: FSWatcher | null = null

/** Watch the theme's directory (survives atomic rename-writes). inotify, no polling. */
const watchDir = (): boolean => {
  const dir = dirname(THEME_PATH)
  const file = basename(THEME_PATH)
  try {
    dirWatcher = watch(dir, { persistent: false }, (_event, name) => {
      if (!name || name === file) reload()
    })
    dirWatcher.on('error', () => {
      dirWatcher?.close()
      dirWatcher = null
      waitForDir()
    })
    reload()
    return true
  } catch {
    return false
  }
}

/** Until the directory exists, watch its parent for it to appear. */
const waitForDir = (): void => {
  if (watchDir()) return
  const dir = dirname(THEME_PATH)
  try {
    parentWatcher = watch(dirname(dir), { persistent: false }, (_e, name) => {
      if (name !== basename(dir)) return
      if (watchDir()) {
        parentWatcher?.close()
        parentWatcher = null
      }
    })
  } catch {
    /* parent missing too — wallpaper sync simply stays off */
  }
  if (current) {
    current = null
    lastRaw = ''
    broadcast()
  }
}

export const startThemeWatcher = (): void => {
  if (dirWatcher || parentWatcher) return
  waitForDir()
}

/** Current palette; reads the file directly if the watcher hasn't loaded it yet. */
export const getWallpaperTheme = async (): Promise<WallpaperPalette | null> => {
  if (current || lastRaw) return current
  try {
    lastRaw = await readFile(THEME_PATH, 'utf8')
    current = parse(lastRaw)
  } catch {
    /* no file yet */
  }
  return current
}
export const wallpaperThemePath = (): string => THEME_PATH
