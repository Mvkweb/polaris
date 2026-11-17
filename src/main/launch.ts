import { app, BrowserWindow } from 'electron'
import { existsSync, statSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * How Polaris was started: from the repo (`bun run dev` / `bun run start`) or
 * as an installed package (`polaris-fm-git`). The PKGBUILD sets POLARIS_CHANNEL
 * and friends at build time, and electron-vite bakes them in via `define`, so
 * no file is read at startup.
 */
export interface BuildInfo {
  /** 'nightly' | 'stable' for packaged builds, null when run from the repo */
  channel: string | null
  /** full commit hash the package was built from */
  commit: string | null
  /** package version, e.g. r142.gd50e7c7 */
  pkgver: string | null
}

declare const __POLARIS_BUILD__: BuildInfo
export const BUILD: BuildInfo = __POLARIS_BUILD__

/** True for an installed package, false when running from a checkout. */
export const INSTALLED = BUILD.channel !== null

/** A folder (or file → its folder + the file to select) to open. */
export interface OpenRequest {
  dir: string
  reveal: string | null
}

const toPath = (arg: string, cwd: string): string | null => {
  try {
    const p = arg.startsWith('file://') ? fileURLToPath(arg) : resolve(cwd, arg)
    return existsSync(p) ? p : null
  } catch {
    return null
  }
}

/**
 * Pick the path to open from a command line (`polaris-fm ~/Downloads`, or
 * `%U` from the desktop entry). Electron and Chromium flags, and the app
 * directory itself (`electron44 /usr/lib/polaris-fm/app …`), are skipped.
 */
export const openRequestFromArgv = (argv: string[], cwd: string): OpenRequest | null => {
  const appPath = app.getAppPath()
  const args = argv.slice(1).filter((a) => a && !a.startsWith('-'))
  for (let i = args.length - 1; i >= 0; i--) {
    const p = toPath(args[i], cwd)
    if (!p || p === appPath || resolve(p) === resolve(appPath)) continue
    try {
      return statSync(p).isDirectory() ? { dir: p, reveal: null } : { dir: dirname(p), reveal: p }
    } catch {
      continue
    }
  }
  return null
}

const initial = INSTALLED ? openRequestFromArgv(process.argv, process.cwd()) : null

/**
 * Folder Polaris starts in. Installed: the path it was asked to open, else
 * your home folder. From the repo: the folder you launched it from, as before.
 */
export const startDir: string = initial?.dir ?? (INSTALLED ? homedir() : process.cwd())
/** File to select on startup, when Polaris was asked to open a file. */
export const startReveal: string | null = initial?.reveal ?? null

/**
 * Installed builds keep their own profile (`~/.config/polaris-fm`) so they
 * can run next to a dev instance without sharing Chromium's storage locks,
 * and only one installed window exists: launching again opens the folder in
 * a new tab of the running window instead of starting a second Electron.
 *
 * Returns false when this process is the second instance and should quit.
 */
export const setupInstance = (onOpen: (req: OpenRequest | null) => void): boolean => {
  if (!INSTALLED) return true
  app.setPath('userData', join(app.getPath('appData'), 'polaris-fm'))
  if (!app.requestSingleInstanceLock()) return false
  app.on('second-instance', (_event, argv, workingDirectory) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
    onOpen(openRequestFromArgv(argv, workingDirectory))
  })
  return true
}
