import { app, BrowserWindow, ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { BUILD, INSTALLED } from './launch'

/**
 * Update status for builds that come from a git checkout (dev, and the
 * `polaris-git` package later). Read-only towards the user: `git fetch` only
 * updates remote-tracking refs, never the working tree. Uses the user's own
 * git credentials (SSH key / credential helper) with prompts disabled, so no
 * token is ever needed or stored. Packaged builds without a repo report
 * `source: 'none'` until the paru/AUR wrapper takes over.
 */

const exec = promisify(execFile)
const CHECK_EVERY = 30 * 60_000

export interface UpdateCommit {
  hash: string
  subject: string
  author: string
  /** epoch ms */
  date: number
}

export interface UpdateInfo {
  version: string
  /** git: running from a checkout · package: installed polaris-fm-git */
  source: 'git' | 'package' | 'none'
  branch: string | null
  current: UpdateCommit | null
  available: boolean
  /** commits behind; -1 when unknown (packages only know "different") */
  behind: number
  /** newest first, at most 8 */
  commits: UpdateCommit[]
  /** github.com/<owner>/<repo>/compare/<a>...<b> when known */
  compareUrl: string | null
  checking: boolean
  checkedAt: number | null
  error: string | null
}

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
  error: null
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
    error: null
  })
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
    const available = Boolean(head) && head !== commit
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
      set({ source: 'git', branch, current })

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
  void checkForUpdates()
  setInterval(() => void checkForUpdates(), CHECK_EVERY).unref()
}
