import { createStore } from 'solid-js/store'
import type { StartupFolder } from '../../../../shared/startup'

/**
 * Preferences for features that are being built out. Persisted now so the
 * settings UI is real (values survive restarts) and each feature can read its
 * key the day it's wired. Wired settings live in their own stores (store.ts,
 * tasks.ts…) and are only surfaced by the settings schema.
 */
export interface Prefs {
  // general
  startupFolder: StartupFolder
  confirmTrash: boolean
  // appearance
  syntaxFromWallpaper: boolean
  iconPack: 'pierre' | 'jetbrains'
  /** interface (chrome) icon set */
  uiIcons: 'solar' | 'dinkie'
  reduceMotion: boolean
  ditherDensity: number
  // editor
  fontSize: number
  tabSize: '2' | '4'
  whitespace: 'selection' | 'boundary' | 'all' | 'none'
  cursorTrail: boolean
  indentGuides: boolean
  formatOnSave: boolean
  // files
  folderLogos: boolean
  folderSizes: boolean
  // media
  defaultExport: 'png' | 'webp' | 'jpg' | 'gif'
  exportQuality: number
  autoplayVideo: boolean
  loopShortClips: boolean
  // uploads
  defaultUpload: string
  copyLinkOnUpload: boolean
  keepUploadHistory: boolean
}

export const PREF_DEFAULTS: Prefs = {
  startupFolder: 'last',
  confirmTrash: true,
  syntaxFromWallpaper: true,
  iconPack: 'pierre',
  uiIcons: 'solar',
  reduceMotion: false,
  ditherDensity: 50,
  fontSize: 13,
  tabSize: '2',
  whitespace: 'selection',
  cursorTrail: true,
  indentGuides: true,
  formatOnSave: false,
  folderLogos: true,
  folderSizes: false,
  defaultExport: 'webp',
  exportQuality: 86,
  autoplayVideo: false,
  loopShortClips: true,
  defaultUpload: 'litterbox-24h',
  copyLinkOnUpload: true,
  keepUploadHistory: true
}

const KEY = 'polaris.prefs.v1'

const load = (): Prefs => {
  try {
    return {
      ...PREF_DEFAULTS,
      ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>)
    }
  } catch {
    return { ...PREF_DEFAULTS }
  }
}

const [prefs, setPrefsStore] = createStore<Prefs>(load())
export { prefs }

let saveTimer: number | undefined
const persist = (): void => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* storage unavailable */
    }
  }, 150)
}

export const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]): void => {
  setPrefsStore(key, value as never)
  persist()
}

export const resetPrefs = (keys: (keyof Prefs)[]): void => {
  for (const k of keys) setPrefsStore(k, PREF_DEFAULTS[k] as never)
  persist()
}
