import { constants } from 'fs'
import { access, stat } from 'fs/promises'
import { isAbsolute } from 'path'
import type { StartupFolder, StartupLocation } from '../shared/startup'

interface StartupContext {
  requested: StartupLocation | null
  home: string
  launchDir: string
  defaultDir: string
}

/** Resolve once at startup. An explicit file/folder always wins over preferences. */
export const resolveStartupLocation = async (
  context: StartupContext,
  preference: StartupFolder,
  lastFolder: string | null
): Promise<StartupLocation> => {
  const saved = typeof lastFolder === 'string' && isAbsolute(lastFolder) ? lastFolder : null
  const preferred =
    preference === 'home'
      ? context.home
      : preference === 'workspace'
        ? context.launchDir
        : (saved ?? context.defaultDir)
  const dir = context.requested?.dir ?? preferred

  try {
    if ((await stat(dir)).isDirectory()) {
      await access(dir, constants.R_OK | constants.X_OK)
      return { dir, reveal: context.requested?.reveal ?? null }
    }
  } catch {
    // Deleted folders, missing drives and inaccessible locations open Home.
  }
  return { dir: context.home, reveal: null }
}
