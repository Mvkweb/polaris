import { createSignal } from 'solid-js'
import { fileClipboard, navigateTo, refreshFileExplorer, setRevealRequest } from './store'

/**
 * Symlink actions shared by the folder grid, the tree and the context menu.
 * Creating links never replaces anything (main picks a free name).
 */

const parentOf = (p: string): string => p.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/'

export interface BrokenLinkInfo {
  path: string
  name: string
  target: string
}

const [brokenLink, setBrokenLink] = createSignal<BrokenLinkInfo | null>(null)
export { brokenLink, setBrokenLink }

/** Open the folder that holds the link's target, with the target selected. */
export const showLinkTarget = (target: string): void => {
  navigateTo(parentOf(target))
  setRevealRequest(target)
}

/** "Make Link": a link to `path` next to it, named "<name> link". */
export const makeLink = async (path: string): Promise<void> => {
  const created = await window.api.createSymlink(path, parentOf(path))
  refreshFileExplorer()
  setRevealRequest(created)
}

/**
 * "Paste as Link": links to the copied item inside `dir`. Absolute by default
 * (survives moving the link); relative keeps working when both move together.
 */
export const pasteAsLink = async (dir: string, relative = false): Promise<void> => {
  const clip = fileClipboard()
  if (!clip) return
  const created = await window.api.createSymlink(clip.path, dir, { absolute: !relative })
  refreshFileExplorer()
  setRevealRequest(created)
}
