import { createSignal } from 'solid-js'
import { openFileInEditor } from './store'

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
  const result = await window.api.openDefaultFile(path).catch(() => 'choose')
  if (request === openRequest && result === 'choose') showOpenWith(path, name)
}
