import { createEffect, onMount } from 'solid-js'
import { prefs } from './components/settings/prefs'
import { navigateTo, setRevealRequest, workspaceRoot } from './components/browser/state'

const LAST_FOLDER_KEY = 'polaris.lastFolder.v1'

/** One path per profile, saved on navigation rather than relying on shutdown. */
export const initStartup = (): void => {
  let lastFolder: string | null = null
  try {
    lastFolder = localStorage.getItem(LAST_FOLDER_KEY)
  } catch {
    // Browsing still works if profile storage is unavailable.
  }
  const savedFolder = lastFolder

  createEffect(() => {
    const folder = workspaceRoot()
    if (!folder || folder === lastFolder) return
    try {
      localStorage.setItem(LAST_FOLDER_KEY, folder)
      lastFolder = folder
    } catch {
      // Storage may be disabled or full; keep navigation working.
    }
  })

  onMount(async () => {
    if (!window.api?.getStartupLocation) return
    try {
      const location = await window.api.getStartupLocation(prefs.startupFolder, savedFolder)
      // A launch request or user navigation may have arrived while resolving.
      if (workspaceRoot()) return
      navigateTo(location.dir)
      if (location.reveal) setRevealRequest(location.reveal)
    } catch (err) {
      console.warn('Failed to resolve startup folder:', err)
    }
  })
}
