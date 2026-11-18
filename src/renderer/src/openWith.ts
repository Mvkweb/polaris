import { createSignal } from 'solid-js'
import { openFileInEditor } from './store'
import { prefs, setPref } from './components/settings/prefs'

interface FileTarget {
  path: string
  name: string
}

const [openWithTarget, setOpenWithTarget] = createSignal<FileTarget | null>(null)
let openRequest = 0

export { openWithTarget, setOpenWithTarget }
export const supportsOpenWith = (): boolean => window.electron?.process.platform === 'linux'

export const showOpenWith = (path: string, name: string): void => {
  openRequest++
  setOpenWithTarget({ path, name })
}

export const openBrowserFile = async (path: string, name: string): Promise<void> => {
  if (!supportsOpenWith() || !window.api?.openDefaultFile) {
    openFileInEditor(path, name)
    return
  }
  const request = ++openRequest
  // Settings → Files → Text & code files, unless this type was set in Open With
  const result = await window.api
    .openDefaultFile(path, {
      preferEditor: prefs.editableFiles === 'polaris',
      choices: Object.fromEntries(prefs.fileTypeApps.map((c) => [c.type, c.app]))
    })
    .catch(() => 'choose' as const)
  if (request !== openRequest) return
  if (result === 'editor') openFileInEditor(path, name)
  else if (result === 'choose') showOpenWith(path, name)
}

/** Does this (editable) type currently open in Polaris's editor? */
export const opensInPolaris = (mimeType: string, editable: boolean): boolean => {
  if (!editable) return false
  const choice = prefs.fileTypeApps.find((c) => c.type === mimeType)?.app
  return choice ? choice === 'polaris' : prefs.editableFiles === 'polaris'
}

/** "Always use…" in Open With: remember where this type opens. */
export const setFileTypeApp = (mimeType: string, app: 'polaris' | 'system'): void => {
  setPref('fileTypeApps', [
    ...prefs.fileTypeApps.filter((c) => c.type !== mimeType),
    { type: mimeType, app }
  ])
}
