import { ipcMain, nativeImage } from 'electron'
import { execFile, spawn } from 'child_process'
import { access, readFile, realpath } from 'fs/promises'
import { constants } from 'fs'
import { delimiter, join, extname, isAbsolute } from 'path'
import { homedir } from 'os'
import { promisify } from 'util'
import { startDir } from './launch'
import type { ExternalEditor } from '../shared/ipcModels'

export type { ExternalEditor } from '../shared/ipcModels'

interface Candidate {
  id: string
  name: string
  desktopIds: string[]
  bins: string[]
}

// Ordered by preference: the first detected one becomes the default target.
const CANDIDATES: Candidate[] = [
  {
    id: 'zed',
    name: 'Zed',
    desktopIds: ['dev.zed.Zed.desktop', 'zed.desktop', 'dev.zed.Zed-Preview.desktop'],
    bins: ['zed', 'zeditor', 'zedit']
  },
  {
    id: 'vscode',
    name: 'VS Code',
    desktopIds: ['code.desktop', 'visual-studio-code.desktop', 'com.visualstudio.code.desktop'],
    bins: ['code']
  },
  {
    id: 'code-oss',
    name: 'Code - OSS',
    desktopIds: ['code-oss.desktop'],
    bins: ['code-oss']
  },
  {
    id: 'vscodium',
    name: 'VSCodium',
    desktopIds: ['codium.desktop', 'com.vscodium.codium.desktop'],
    bins: ['codium']
  },
  {
    id: 'cursor',
    name: 'Cursor',
    desktopIds: ['cursor.desktop'],
    bins: ['cursor']
  }
]

interface Resolved extends ExternalEditor {
  /** argv template; '%F' marks where the target path goes */
  argv: string[]
  /** true when found via a .desktop entry (real name + icon), false for a bare PATH hit */
  fromDesktop: boolean
}

const dataDirs = (): string[] => {
  const home = homedir()
  const xdg = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':')
  return [
    process.env.XDG_DATA_HOME || join(home, '.local/share'),
    ...xdg,
    join(home, '.local/share/flatpak/exports/share'),
    '/var/lib/flatpak/exports/share'
  ].filter(Boolean)
}

const isExecutable = async (p: string): Promise<boolean> => {
  try {
    await access(p, constants.X_OK)
    return true
  } catch {
    return false
  }
}

const findOnPath = async (bin: string): Promise<string | null> => {
  const dirs = (process.env.PATH || '').split(delimiter).filter(Boolean)
  dirs.push(join(homedir(), '.local/bin'))
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', ''] : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const p = join(dir, bin + ext)
      if (await isExecutable(p)) return p
    }
  }
  return null
}

/** Minimal .desktop parser: reads the [Desktop Entry] group only. */
const parseDesktopEntry = (text: string): Record<string, string> => {
  const out: Record<string, string> = {}
  let inMain = false
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('[')) {
      inMain = line === '[Desktop Entry]'
      continue
    }
    if (!inMain || !line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

/** Split an Exec= line into argv, honoring double quotes, and normalize field codes. */
const parseExec = (exec: string): string[] => {
  const argv: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of exec) {
    if (ch === '"') quoted = !quoted
    else if (ch === ' ' && !quoted) {
      if (cur) argv.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur) argv.push(cur)

  let hasTarget = false
  const result: string[] = []
  for (const arg of argv) {
    if (/^%[fFuU]$/.test(arg)) {
      if (!hasTarget) result.push('%F')
      hasTarget = true
    } else if (!/^%[a-zA-Z]$/.test(arg)) {
      result.push(arg.replace(/%%/g, '%'))
    }
  }
  if (!hasTarget) result.push('%F')
  return result
}

const ICON_SIZES = ['scalable', '512x512', '256x256', '128x128', '96x96', '64x64', '48x48']

const findIconFile = async (icon: string): Promise<string | null> => {
  if (isAbsolute(icon)) {
    try {
      await access(icon, constants.R_OK)
      return icon
    } catch {
      return null
    }
  }
  const candidates: string[] = []
  for (const base of dataDirs()) {
    for (const size of ICON_SIZES) {
      const ext = size === 'scalable' ? 'svg' : 'png'
      candidates.push(join(base, 'icons/hicolor', size, 'apps', `${icon}.${ext}`))
    }
  }
  candidates.push(`/usr/share/pixmaps/${icon}.png`, `/usr/share/pixmaps/${icon}.svg`)
  for (const c of candidates) {
    try {
      await access(c, constants.R_OK)
      return c
    } catch {
      /* try next */
    }
  }
  return null
}

const iconToDataUrl = async (file: string): Promise<string | null> => {
  try {
    if (extname(file).toLowerCase() === '.svg') {
      const svg = await readFile(file)
      return `data:image/svg+xml;base64,${svg.toString('base64')}`
    }
    const img = nativeImage.createFromPath(file)
    if (img.isEmpty()) return null
    // 64px is plenty for a 16–20px glyph on HiDPI and keeps the IPC payload tiny.
    return img.resize({ width: 64, height: 64, quality: 'best' }).toDataURL()
  } catch {
    return null
  }
}

const resolveFromDesktop = async (c: Candidate): Promise<Resolved | null> => {
  for (const base of dataDirs()) {
    for (const id of c.desktopIds) {
      let text: string
      try {
        text = await readFile(join(base, 'applications', id), 'utf8')
      } catch {
        continue
      }
      const entry = parseDesktopEntry(text)
      if (!entry.Exec || entry.Hidden === 'true') continue
      const argv = parseExec(entry.Exec)
      // Skip stale entries whose binary is gone.
      const bin = argv[0]
      const binPath = isAbsolute(bin)
        ? (await isExecutable(bin))
          ? bin
          : null
        : await findOnPath(bin)
      if (!binPath) continue
      const iconFile = entry.Icon ? await findIconFile(entry.Icon) : null
      return {
        id: c.id,
        name: entry.Name || c.name,
        icon: iconFile ? await iconToDataUrl(iconFile) : null,
        argv,
        fromDesktop: true
      }
    }
  }
  return null
}

const resolveFromPath = async (c: Candidate): Promise<Resolved | null> => {
  for (const bin of c.bins) {
    const p = await findOnPath(bin)
    if (p) return { id: c.id, name: c.name, icon: null, argv: [p, '%F'], fromDesktop: false }
  }
  return null
}

let detection: Promise<Resolved[]> | null = null

/** Detect installed editors once per session (cheap fs probes, no process spawns). */
export const detectEditors = (): Promise<Resolved[]> => {
  detection ??= (async () => {
    const found = await Promise.all(
      CANDIDATES.map(async (c) =>
        process.platform === 'linux'
          ? ((await resolveFromDesktop(c)) ?? (await resolveFromPath(c)))
          : resolveFromPath(c)
      )
    )
    // Distros often ship aliases (Arch's code-oss installs `code` -> `code-oss`).
    // Dedupe on the real binary, preferring the .desktop-backed entry.
    const keyed = await Promise.all(
      found.map(async (e) => {
        if (!e) return null
        const bin = isAbsolute(e.argv[0]) ? e.argv[0] : await findOnPath(e.argv[0])
        const key = bin ? await realpath(bin).catch(() => bin) : e.argv[0]
        return { e, key }
      })
    )
    const winner = new Map<string, Resolved>()
    for (const k of keyed) {
      if (!k) continue
      const prev = winner.get(k.key)
      if (!prev || (!prev.fromDesktop && k.e.fromDesktop)) winner.set(k.key, k.e)
    }
    const keep = new Set(winner.values())
    return found.filter((e): e is Resolved => e !== null && keep.has(e))
  })()
  return detection
}

export const listEditors = async (): Promise<ExternalEditor[]> =>
  (await detectEditors()).map(({ id, name, icon }) => ({ id, name, icon }))

export const openInEditor = async (editorId: string, targetPath: string): Promise<boolean> => {
  const editor = (await detectEditors()).find((e) => e.id === editorId)
  if (!editor || !targetPath) return false
  const [cmd, ...args] = editor.argv.map((a) => (a === '%F' ? targetPath : a))
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
    child.on('error', (err) => console.error(`Failed to launch ${editor.name}:`, err))
    child.unref()
    return true
  } catch (err) {
    console.error(`Failed to launch ${editor.name}:`, err)
    return false
  }
}

const execFileAsync = promisify(execFile)

export function registerEditorIpc(): void {
  void detectEditors()
  ipcMain.handle('editor:list', () => listEditors())
  ipcMain.handle('editor:open', (_, editorId: string, targetPath: string) =>
    openInEditor(editorId, targetPath)
  )

  ipcMain.handle('editor:isCodeInstalled', async () => {
    try {
      const { stdout } = await execFileAsync('which', ['code'])
      return Boolean(stdout.trim())
    } catch {
      return false
    }
  })

  ipcMain.handle('editor:openCode', async (_, targetPath: string) => {
    try {
      const p = targetPath || startDir
      const child = spawn('code', [p], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return true
    } catch (err) {
      console.error('Failed to launch code:', err)
      return false
    }
  })
}
