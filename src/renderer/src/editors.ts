import { createSignal } from 'solid-js'
import type { ExternalEditor } from './types'

/** Pseudo-id for Polaris' own editor tab. */
export const BUILTIN_EDITOR_ID = 'polaris'

// Detected once per app session in main; share the promise across every consumer.
let editorsPromise: Promise<ExternalEditor[]> | null = null
const [editorList, setEditorList] = createSignal<ExternalEditor[]>([])

/** Reactive list of installed external editors. Triggers detection on first read. */
export const installedEditors = (): ExternalEditor[] => {
  editorsPromise ??= (window.api?.listEditors?.() ?? Promise.resolve([]))
    .catch(() => [])
    .then((list) => {
      setEditorList(list)
      return list
    })
  return editorList()
}

const PREF_KEY = 'polaris.inspector.editor'
const readPref = (): string | null => {
  try {
    return localStorage.getItem(PREF_KEY)
  } catch {
    return null
  }
}

const [editorPref, setEditorPrefSignal] = createSignal<string | null>(readPref())

/** Remember the last editor the user picked (per-device convenience). */
export const rememberEditor = (id: string): void => {
  setEditorPrefSignal(id)
  try {
    localStorage.setItem(PREF_KEY, id)
  } catch {
    /* storage unavailable */
  }
}

/**
 * Preferred external editor: remembered choice if still installed, else the first
 * detected one. `null` means the built-in Polaris editor.
 */
export const preferredEditor = (): ExternalEditor | null => {
  const list = installedEditors()
  const pref = editorPref()
  if (pref === BUILTIN_EDITOR_ID) return null
  return list.find((e) => e.id === pref) ?? list[0] ?? null
}
