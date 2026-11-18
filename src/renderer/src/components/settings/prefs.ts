import { createStore } from 'solid-js/store'
import type { StartupFolder } from '../../../../shared/startup'

/** Preferences stored together in the renderer profile. */
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
  /** double-click on text/code files: Polaris's editor or the Linux default app */
  editableFiles: 'polaris' | 'system'
  /** per-type "Always use…" choices from Open With (an array so reset replaces it) */
  fileTypeApps: { type: string; app: 'polaris' | 'system' }[]
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
  editableFiles: 'polaris',
  fileTypeApps: [],
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
