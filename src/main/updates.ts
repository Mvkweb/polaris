import { app, BrowserWindow, ipcMain } from 'electron'
import { watch } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { BUILD, INSTALLED } from './launch'
import type { UpdateCommit, UpdateInfo } from '../shared/ipcModels'

export type { UpdateCommit, UpdateInfo } from '../shared/ipcModels'

const exec = promisify(execFile)
const CHECK_EVERY = 30 * 60_000

let info: UpdateInfo = {
  version: app.getVersion(),
  source: 'none',
  branch: null,
  current: null,
  available: false,
  behind: 0,
  commits: [],
  compareUrl: null,
  checking: false,
  checkedAt: null,
  error: null,
  updateCommand: null,
  restartReady: false
}

const broadcast = (): void => {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('updates:changed', info)
  }
}
const set = (patch: Partial<UpdateInfo>): void => {
  info = { ...info, ...patch }
  broadcast()
}

const repo = (): string => app.getAppPath()
const git = async (args: string[], timeout = 8000): Promise<string> => {
  const { stdout } = await exec('git', ['-C', repo(), ...args], {
    timeout,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o ConnectTimeout=8'
    }
  })
  return stdout.trim()
}

const SEP = '\u001f'
const FORMAT = ['%h', '%s', '%an', '%ct'].join('%x1f')
const parseCommits = (out: string): UpdateCommit[] =>
  out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, author, ct] = line.split(SEP)
      return { hash, subject, author, date: Number(ct) * 1000 }
    })

/**
 * The repo nightly packages are built from. While the repo is private, git
 * uses the tester's own GitHub login (gh credential helper, or SSH through a
 * url.insteadOf rule), non-interactively. Public later: works for anyone.
 */
const NIGHTLY_REMOTE = 'https://github.com/Mvkweb/polaris.git'
const NIGHTLY_BRANCH = 'main'
const NIGHTLY_WEB = 'https://github.com/Mvkweb/polaris'
const PKGNAME = 'polaris-fm-git'

/**
 * PRIVATE-PHASE: what "Update now" types into Polaris's terminal. Keeps a
 * clone in ~/.cache/polaris-fm/repo and runs its install.sh (pull, makepkg,
 * pacman asks for the password right there). Wrapped in `sh -c` so it works
 * from fish too. Once public this becomes: `paru -S polaris-fm-git`.
 */
const PACKAGE_UPDATE_COMMAND =
  `sh -c 'd="\${XDG_CACHE_HOME:-$HOME/.cache}/polaris-fm/repo"; ` +
  `[ -d "$d/.git" ] || git clone ${NIGHTLY_REMOTE} "$d"; ` +
  `exec "$d/packaging/arch/install.sh"'`

/** Installed version per pacman (e.g. r72.gd0d626c-1), or null. */
const installedPkgver = async (): Promise<string | null> => {
  try {
    const { stdout } = await exec('pacman', ['-Q', PKGNAME], { timeout: 5000 })
    return stdout.trim().split(/\s+/)[1] ?? null
  } catch {
    return null
  }
}

/** pacman replaced our files: a restart runs the new version. */
const checkRestartReady = async (): Promise<void> => {
  const v = await installedPkgver()
  const ready = Boolean(v && BUILD.pkgver && !v.startsWith(`${BUILD.pkgver}-`))
  if (ready !== info.restartReady) set({ restartReady: ready, available: ready || info.available })
}

/** Installed package: compare the baked-in commit with the tip of main. */
const checkPackage = async (): Promise<void> => {
  const commit = BUILD.commit!
  set({
    source: 'package',
    branch: NIGHTLY_BRANCH,
    current: {
      hash: commit.slice(0, 7),
      subject: `polaris-fm-git ${BUILD.pkgver ?? ''}`.trim(),
      author: '',
      date: 0
    },
    checking: true,
    error: null,
    updateCommand: PACKAGE_UPDATE_COMMAND
  })
  await checkRestartReady()
  try {
    const out = await exec('git', ['ls-remote', NIGHTLY_REMOTE, `refs/heads/${NIGHTLY_BRANCH}`], {
      timeout: 20_000,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o ConnectTimeout=8'
      }
    })
    const head = out.stdout.split(/\s/)[0]
    const available = info.restartReady || (Boolean(head) && head !== commit)
    set({
      available,
      behind: available ? -1 : 0,
      commits: [],
      compareUrl: available
        ? `${NIGHTLY_WEB}/compare/${commit.slice(0, 7)}...${head.slice(0, 7)}`
        : null,
      checking: false,
      checkedAt: Date.now()
    })
  } catch (err) {
    set({
      checking: false,
      checkedAt: Date.now(),
      error: (err as Error).message.split('\n')[0].slice(0, 160)
    })
  }
}

const githubBase = (remote: string): string | null => {
  const m = /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(remote)
  return m ? `https://github.com/${m[1]}/${m[2]}` : null
}

let running: Promise<void> | null = null

export const checkForUpdates = (): Promise<void> => {
  running ??= (async () => {
    try {
      if (INSTALLED && BUILD.commit) return await checkPackage()
      if ((await git(['rev-parse', '--is-inside-work-tree']).catch(() => '')) !== 'true') {
        set({ source: 'none', checking: false, checkedAt: Date.now() })
        return
      }
      set({ checking: true, error: null })
      const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
      const current = parseCommits(await git(['log', '-1', `--format=${FORMAT}`]))[0] ?? null
      set({
        source: 'git',
        branch,
        current,
        // From a checkout, updating is a pull (restart `bun run dev` after).
        updateCommand: `git -C '${repo()}' pull --ff-only`
      })

      const upstream = await git([
        'rev-parse',
        '--abbrev-ref',
        '--symbolic-full-name',
        '@{u}'
      ]).catch(() => '')
      if (!upstream) {
        set({
          checking: false,
          checkedAt: Date.now(),
          available: false,
          behind: 0,
          commits: []
        })
        return
      }
      const remote = upstream.split('/')[0]
      try {
        await git(['fetch', '--quiet', '--no-tags', remote], 20_000)
      } catch (err) {
        // Offline / no access: keep the last known state, just report it.
        set({ error: (err as Error).message.split('\n')[0].slice(0, 160) })
      }
      const behind = Number(await git(['rev-list', '--count', `HEAD..${upstream}`])) || 0
      const commits = behind
        ? parseCommits(await git(['log', '-n', '8', `--format=${FORMAT}`, `HEAD..${upstream}`]))
        : []
      const base = githubBase(await git(['remote', 'get-url', remote]).catch(() => ''))
      const head = behind ? await git(['rev-parse', '--short', upstream]) : null
      set({
        available: behind > 0,
        behind,
        commits,
        compareUrl: base && current && head ? `${base}/compare/${current.hash}...${head}` : null,
        checking: false,
        checkedAt: Date.now()
      })
    } catch (err) {
      set({
        checking: false,
        checkedAt: Date.now(),
        error: (err as Error).message.slice(0, 160)
      })
    } finally {
      running = null
    }
  })()
  return running
}

export const registerUpdateIpc = (): void => {
  ipcMain.handle('updates:get', () => info)
  ipcMain.handle('updates:check', async () => {
    await checkForUpdates()
    return info
  })
  // Quit normally so Electron can flush profile storage before relaunching.
  ipcMain.handle('updates:restart', () => {
    app.relaunch()
    app.quit()
  })
  // Installed: pacman swaps our files during an update. Watch the app folder
  // so the footer flips to "Restart to update" the moment it's done.
  if (INSTALLED) {
    let debounce: NodeJS.Timeout | undefined
    try {
      watch(app.getAppPath(), () => {
        clearTimeout(debounce)
        debounce = setTimeout(() => void checkRestartReady(), 1500)
      }).unref()
    } catch {
      // No watch (unusual fs): the 30-minute check still notices.
    }
  }
  void checkForUpdates()
  setInterval(() => void checkForUpdates(), CHECK_EVERY).unref()
}
