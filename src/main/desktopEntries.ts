import { homedir } from 'os'
import { join } from 'path'

export const dataDirs = (): string[] => {
  const home = homedir()
  const xdg = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':')
  return [
    process.env.XDG_DATA_HOME || join(home, '.local/share'),
    ...xdg,
    join(home, '.local/share/flatpak/exports/share'),
    '/var/lib/flatpak/exports/share'
  ].filter(Boolean)
}

/** Minimal .desktop parser: reads the [Desktop Entry] group only. */
export const parseDesktopEntry = (text: string): Record<string, string> => {
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
