import { execFile } from 'child_process'
import { readdir, readFile, stat } from 'fs/promises'
import { isAbsolute, join, sep } from 'path'
import { promisify } from 'util'
import { ipcMain } from 'electron'
import type { ChosenOpenResult, DefaultOpenResult, OpenWithInfo } from '../shared/openWith'
import { dataDirs, parseDesktopEntry } from './desktopEntries'
import { appIconDataUrl } from './appIcons'

const exec = promisify(execFile)
const MIME_TYPE = /^[a-z0-9][a-z0-9.+_-]*\/[a-z0-9][a-z0-9.+_-]*$/i
const GENERIC_TYPES = new Set(['application/octet-stream', 'application/x-zerosize'])

const gio = async (...args: string[]): Promise<string> => {
  // gio translates its headings, including the output of "gio mime".
  const { stdout } = await exec('gio', args, {
    env: { ...process.env, LC_ALL: 'C' },
    timeout: 8000
  })
  return stdout
}

async function fileMime(path: string): Promise<string> {
  if (process.platform !== 'linux') throw new Error('App associations are available on Linux.')
  if (typeof path !== 'string' || !isAbsolute(path) || !(await stat(path)).isFile()) {
    throw new Error('Select a local file.')
  }
  const info = await gio('info', '-a', 'standard::content-type', '--', path)
  const mimeType = /^\s+standard::content-type:\s*(\S+)\s*$/m.exec(info)?.[1]
  return mimeType && MIME_TYPE.test(mimeType) ? mimeType : 'application/octet-stream'
}

async function associations(mimeType: string) {
  const output = await gio('mime', mimeType)
  const defaultAppId = /^Default application .*:\s*(.+\.desktop)\s*$/m.exec(output)?.[1] ?? null
  const recommended = new Set(
    (output.split(/^Recommended applications:[ \t]*$/m)[1] ?? '')
      .split(/^Fallback applications:/m)[0]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('.desktop'))
  )
  return { defaultAppId, recommended }
}

interface DesktopEntry {
  id: string
  name: string
  path: string
  icon?: string
  visible: boolean
}

async function desktopApps(): Promise<Map<string, DesktopEntry>> {
  const entries = new Map<string, DesktopEntry>()
  const seen = new Set<string>()
  const desktops = (process.env.XDG_CURRENT_DESKTOP ?? '').split(':')
  for (const base of dataDirs().filter(isAbsolute)) {
    const root = join(base, 'applications')
    const files = await readdir(root, { recursive: true }).catch(() => [])
    for (const file of files.filter((name) => name.endsWith('.desktop')).sort()) {
      const id = file.split(sep).join('-')
      if (seen.has(id)) continue
      const path = join(root, file)
      const text = await readFile(path, 'utf8').catch(() => null)
      if (text === null) continue
      // A user entry with Hidden=true masks the system entry of the same ID.
      seen.add(id)
      const entry = parseDesktopEntry(text)
      if (entry.Type !== 'Application' || entry.Hidden === 'true' || !entry.Name) continue
      const acceptsFile = /(^|\s|")[%][fFuU](?=\s|"|$)/.test(entry.Exec ?? '')
      if (!acceptsFile && !(entry.DBusActivatable === 'true' && entry.MimeType)) continue
      const only = entry.OnlyShowIn?.split(';')
      const excluded = entry.NotShowIn?.split(';')
      const visible =
        entry.NoDisplay !== 'true' &&
        (!only || desktops.some((desktop) => only.includes(desktop))) &&
        !desktops.some((desktop) => excluded?.includes(desktop))
      entries.set(id, { id, name: entry.Name, path, icon: entry.Icon, visible })
    }
  }
  return entries
}

async function inspectFile(path: string): Promise<OpenWithInfo> {
  const mimeType = await fileMime(path)
  const [{ defaultAppId, recommended }, entries] = await Promise.all([
    associations(mimeType),
    desktopApps()
  ])
  const apps = [...entries.values()]
    .filter(({ id, visible }) => visible || recommended.has(id) || id === defaultAppId)
    .map(({ id, name }) => ({
      id,
      name,
      recommended: recommended.has(id) || id === defaultAppId
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.name.localeCompare(b.name))
  return { mimeType, defaultAppId, canSetDefault: !GENERIC_TYPES.has(mimeType), apps }
}

/** Icons are fetched per row as the chooser shows them (lists can be long). */
let iconNames: Map<string, string | undefined> | null = null
async function appIcon(appId: string): Promise<string | null> {
  iconNames ??= new Map([...(await desktopApps()).values()].map((e) => [e.id, e.icon]))
  return appIconDataUrl(iconNames.get(appId))
}

async function openDefault(path: string): Promise<DefaultOpenResult> {
  if (process.platform !== 'linux') return 'unsupported'
  try {
    const mimeType = await fileMime(path)
    if (!(await associations(mimeType)).defaultAppId) return 'choose'
    await gio('open', '--', path)
    return 'opened'
  } catch {
    return 'choose'
  }
}

async function openChosen(
  path: string,
  appId: string,
  makeDefaultFor?: string
): Promise<ChosenOpenResult> {
  const mimeType = await fileMime(path)
  const chosen = (await desktopApps()).get(appId)
  if (!chosen) throw new Error('This app is no longer available.')
  if (
    makeDefaultFor !== undefined &&
    (makeDefaultFor !== mimeType || GENERIC_TYPES.has(mimeType))
  ) {
    throw new Error('This file type can’t be set as a default.')
  }
  // GIO resolves the desktop entry's launch arguments. Never invoke a shell.
  await gio('launch', '--', chosen.path, path)
  if (makeDefaultFor === undefined) return 'opened'
  try {
    await gio('mime', mimeType, chosen.id)
    if ((await associations(mimeType)).defaultAppId === chosen.id) return 'opened'
  } catch (err) {
    console.error('Could not set the default application:', err)
  }
  return 'default-not-saved'
}

export function registerOpenWithIpc(): void {
  ipcMain.handle('apps:openDefault', (_, path: string) => openDefault(path))
  ipcMain.handle('apps:inspectFile', (_, path: string) => {
    iconNames = null // pick up apps installed since the last chooser
    return inspectFile(path)
  })
  ipcMain.handle('apps:icon', (_, appId: string) => appIcon(String(appId)))
  ipcMain.handle('apps:openChosen', (_, path: string, appId: string, makeDefaultFor?: string) =>
    openChosen(path, appId, makeDefaultFor)
  )
}
