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
  Mod: '⌘',
  Shift: '⇧',
  Alt: '⌥',
  Ctrl: '⌃'
}

const OTHER_LABELS: Record<string, string> = {
  Mod: 'Ctrl'
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
}

export const SHORTCUT_GROUPS = ['General & Navigation', 'Editor', 'Terminal'] as const

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
    description: 'Slide open or close the right file inspector drawer',
    group: 'General & Navigation',
    keys: ['Mod', 'I']
  },
  {
    id: 'cycle_scope',
    title: 'Cycle Sidebar Scope',
    description: 'Cycle between Files, Search, Tasks, and Chat',
    group: 'General & Navigation',
    keys: ['Mod', 'Shift', 'E']
  },
  {
    id: 'switch_items',
    title: 'Switch Items',
    description: 'Navigate up and down through commits or chat sessions',
    group: 'General & Navigation',
    keys: ['Mod', 'Shift', 'ArrowUp', 'ArrowDown']
  },
  {
    id: 'new_item',
    title: 'New Note or Chat',
    description: 'Create a new markdown note or start a new chat conversation',
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

  // Editor
  {
    id: 'save_file',
    title: 'Save File',
    description: 'Save the currently active file to disk',
    group: 'Editor',
    keys: ['Mod', 'S']
  },
  {
    id: 'find_in_file',
    title: 'Find in File',
    description: 'Open in-editor search and replace panel',
    group: 'Editor',
    keys: ['Mod', 'F']
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
    keys: ['Mod', 'Shift', 'C']
  },
  {
    id: 'terminal_paste',
    title: 'Paste in Terminal',
    description: 'Paste text from clipboard into terminal session',
    group: 'Terminal',
    keys: ['Mod', 'Shift', 'V']
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
