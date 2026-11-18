import { createSignal } from 'solid-js'

// Combos use `Mod` for Cmd on macOS and Ctrl elsewhere, e.g. 'Mod+Shift+P'.

const [platform, setPlatform] = createSignal<string>(
  typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? 'darwin' : ''
)

window.api
  ?.getPlatform?.()
  .then(setPlatform)
  .catch(() => {})

export const isMac = (): boolean => platform() === 'darwin'

const forceMacLabels = import.meta.env.DEV && import.meta.env.VITE_MAC_LABELS === '1'

const useMacLabels = (): boolean => forceMacLabels || isMac()

const MAC_SYMBOLS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Mod: '⌘',
  Shift: '⇧',
  Alt: '⌥',
  Ctrl: '⌃'
}

const ARROWS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→'
}

const OTHER_LABELS: Record<string, string> = {
  Mod: 'Ctrl',
  ...ARROWS
}

export const shortcutKeys = (combo: string): string[] => {
  const labels = useMacLabels() ? MAC_SYMBOLS : OTHER_LABELS
  return combo.split('+').map((key) => labels[key] ?? key)
}

export const formatShortcut = (combo: string): string =>
  shortcutKeys(combo).join(useMacLabels() ? '' : '+')

export const isModKey = (e: KeyboardEvent | MouseEvent): boolean =>
  isMac() ? e.metaKey : e.ctrlKey

// ── Shortcut Registry & Storage ──────────────────────────────────────────────

export interface ShortcutItem {
  id: string
  title: string
  description?: string
  group: string
  keys: string[]
  /** handled inside CodeMirror / xterm: shown, not rebindable (yet) */
  locked?: boolean
}

export const SHORTCUT_GROUPS = ['General & Navigation', 'Files', 'Editor', 'Terminal'] as const

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // General & Navigation
  {
    id: 'quick_open',
    title: 'Quick Open',
    description: 'Fuzzy search files by name and jump to line',
    group: 'General & Navigation',
    keys: ['Mod', 'P']
  },
  {
    id: 'toggle_editor_view',
    title: 'Files ↔ Editor',
    description: 'Switch between the folder view and the editor (keeps open tabs)',
    group: 'General & Navigation',
    keys: ['Mod', 'E']
  },
  {
    id: 'edit_path',
    title: 'Edit Location',
    description: 'Type or paste a path; Tab completes folders',
    group: 'General & Navigation',
    keys: ['Mod', 'L']
  },
  {
    id: 'settings',
    title: 'Preferences / Settings',
    description: 'Open or close the settings view',
    group: 'General & Navigation',
    keys: ['Mod', ',']
  },
  {
    id: 'toggle_sidebar',
    title: 'Toggle Sidebar',
    description: 'Expand or collapse the sidebar',
    group: 'General & Navigation',
    keys: ['Mod', 'B']
  },
  {
    id: 'toggle_inspector',
    title: 'Toggle File Details & Inspector',
    description: 'Peek at the selected item in the details drawer',
    group: 'General & Navigation',
    keys: ['Space']
  },
  {
    id: 'cycle_scope',
    title: 'Cycle Sidebar Scope',
    description: 'Cycle between Files, Search, and Tasks',
    group: 'General & Navigation',
    keys: ['Mod', 'I']
  },
  {
    id: 'switch_items',
    title: 'Switch Items',
    description: 'Navigate up and down through commits',
    group: 'General & Navigation',
    keys: ['Mod', 'Shift', 'ArrowUp', 'ArrowDown'],
    locked: true
  },
  {
    id: 'new_item',
    title: 'New Note',
    description: 'Open the new Markdown note dialog',
    group: 'General & Navigation',
    keys: ['Mod', 'N']
  },
  {
    id: 'sidebar_search',
    title: 'Focus Sidebar Search',
    description: 'Quickly focus the search filter in the current sidebar view',
    group: 'General & Navigation',
    keys: ['Mod', 'F']
  },

  // Files
  {
    id: 'sort_name',
    title: 'Sort by Name',
    description: 'Press again to reverse (A–Z / Z–A)',
    group: 'Files',
    keys: ['Mod', 'Alt', '1']
  },
  {
    id: 'sort_modified',
    title: 'Sort by Date Modified',
    description: 'Newest first; press again for oldest first',
    group: 'Files',
    keys: ['Mod', 'Alt', '2']
  },
  {
    id: 'sort_size',
    title: 'Sort by Size',
    description: 'Largest first; press again for smallest first',
    group: 'Files',
    keys: ['Mod', 'Alt', '3']
  },
  {
    id: 'sort_kind',
    title: 'Sort by Kind',
    description: 'Group by file type',
    group: 'Files',
    keys: ['Mod', 'Alt', '4']
  },

  // Editor
  {
    id: 'save_file',
    title: 'Save File',
    description: 'Save the currently active file to disk',
    group: 'Editor',
    keys: ['Mod', 'S'],
    locked: true
  },
  {
    id: 'find_in_file',
    title: 'Find in File',
    description: 'Open in-editor search and replace panel',
    group: 'Editor',
    keys: ['Mod', 'F'],
    locked: true
  },
  {
    id: 'find_in_files',
    title: 'Find in Files',
    description: 'Search text project-wide using parallel native Zig search',
    group: 'Editor',
    keys: ['Mod', 'Shift', 'F']
  },

  // Terminal
  {
    id: 'toggle_terminal',
    title: 'Toggle Terminal Drawer',
    description: 'Slide open or close the integrated terminal drawer',
    group: 'Terminal',
    keys: ['Mod', '`']
  },
  {
    id: 'terminal_copy',
    title: 'Copy in Terminal',
    description: 'Copy selected terminal output to clipboard',
    group: 'Terminal',
    keys: ['Mod', 'Shift', 'C'],
    locked: true
  },
  {
    id: 'terminal_paste',
    title: 'Paste in Terminal',
    description: 'Paste text from clipboard into terminal session',
    group: 'Terminal',
    keys: ['Mod', 'Shift', 'V'],
    locked: true
  }
]

const STORAGE_KEY = 'ember_shortcuts'

const defaultMap: Record<string, string[]> = {}
for (const item of DEFAULT_SHORTCUTS) {
  defaultMap[item.id] = [...item.keys]
}

function loadInitialShortcuts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string[]>
      return { ...defaultMap, ...parsed }
    }
  } catch (err) {
    console.error('Failed to parse ember_shortcuts from localStorage', err)
  }
  return { ...defaultMap }
}

export const [userShortcuts, setUserShortcuts] =
  createSignal<Record<string, string[]>>(loadInitialShortcuts())

export function getShortcutKeys(id: string): string[] {
  return userShortcuts()[id] || defaultMap[id] || []
}

export function updateShortcut(id: string, keys: string[]) {
  setUserShortcuts((prev) => {
    const next = { ...prev, [id]: keys }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      console.error('Failed to persist shortcut to localStorage', err)
    }
    return next
  })
}

export function resetShortcut(id: string) {
  if (!defaultMap[id]) return
  setUserShortcuts((prev) => {
    const next = { ...prev, [id]: [...defaultMap[id]] }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      console.error('Failed to persist reset shortcut to localStorage', err)
    }
    return next
  })
}

export function resetAllShortcuts() {
  setUserShortcuts({ ...defaultMap })
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to reset all shortcuts in localStorage', err)
  }
}

export function isShortcutModified(id: string): boolean {
  const current = userShortcuts()[id]
  const def = defaultMap[id]
  if (!current || !def) return false
  if (current.length !== def.length) return true
  return current.some((k, i) => k !== def[i])
}

export function hasAnyShortcutModified(): boolean {
  return Object.keys(defaultMap).some(isShortcutModified)
}

// ── Matching ─────────────────────────────────────────────────────────────────
// Combos are stored as ['Mod', 'Alt', 'Shift', key]. `Mod` is Cmd on macOS and
// Ctrl elsewhere (`Ctrl` only appears on macOS, for the real Control key).
// Keys come from `e.code`, so Shift+, still reads as ',' and layouts don't
// change letters.

export const MODIFIERS = ['Mod', 'Ctrl', 'Alt', 'Shift'] as const
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'OS'])

const CODE_KEYS: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Space: 'Space'
}

/** The non-modifier key of an event, normalised, or null for a modifier press. */
export const eventKeyName = (e: KeyboardEvent): string | null => {
  if (MODIFIER_KEYS.has(e.key)) return null
  const letter = /^Key([A-Z])$/.exec(e.code)
  if (letter) return letter[1]
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code)
  if (digit) return digit[1]
  if (CODE_KEYS[e.code]) return CODE_KEYS[e.code]
  return e.key.length === 1 ? e.key.toUpperCase() : e.key
}

/** Modifiers held during an event, in canonical order. */
export const eventModifiers = (e: KeyboardEvent): string[] => {
  const mods: string[] = []
  if (isMac() ? e.metaKey : e.ctrlKey) mods.push('Mod')
  if (isMac() && e.ctrlKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  return mods
}

const modifierOf = (key: string): string | null =>
  key === 'Shift'
    ? 'Shift'
    : key === 'Alt'
      ? 'Alt'
      : key === (isMac() ? 'Meta' : 'Control')
        ? 'Mod'
        : isMac() && key === 'Control'
          ? 'Ctrl'
          : null

export const isModifierOnly = (keys: readonly string[]): boolean =>
  keys.length > 0 && keys.every((k) => (MODIFIERS as readonly string[]).includes(k))

export const sameCombo = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('+') === [...b].sort().join('+')

export const canonicalCombo = (keys: readonly string[]): string[] => {
  const mods = MODIFIERS.filter((m) => keys.includes(m))
  const rest = keys.filter((k) => !(MODIFIERS as readonly string[]).includes(k))
  return [...mods, ...rest]
}

// Modifier-only chords (e.g. Mod+Shift) fire on a clean release: only if no
// other key was pressed while the modifiers were held. Tracked globally.
let chordDirty = false
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (eventKeyName(e)) chordDirty = true
      else if (eventModifiers(e).length <= 1 && !e.repeat) chordDirty = false
    },
    true
  )
  window.addEventListener(
    'keyup',
    (e) => {
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        queueMicrotask(() => (chordDirty = false))
      }
    },
    true
  )
}

/**
 * Does this event trigger shortcut `id`? Normal combos match on keydown;
 * modifier-only chords match on the clean release of their last modifier.
 * Handlers can pass both keydown and keyup events through.
 */
export const matchesShortcut = (e: KeyboardEvent, id: string): boolean => {
  const keys = getShortcutKeys(id)
  if (!keys.length) return false
  if (isModifierOnly(keys)) {
    if (e.type !== 'keyup' || chordDirty) return false
    const released = modifierOf(e.key)
    if (!released) return false
    return sameCombo([...new Set([...eventModifiers(e), released])], keys)
  }
  if (e.type !== 'keydown') return false
  const key = eventKeyName(e)
  return key !== null && sameCombo([...eventModifiers(e), key], keys)
}

/** The shortcut (other than `exceptId`) already using `keys`, if any. */
export const findShortcutUsing = (
  keys: readonly string[],
  exceptId: string
): ShortcutItem | undefined =>
  DEFAULT_SHORTCUTS.find((s) => s.id !== exceptId && sameCombo(getShortcutKeys(s.id), keys))
