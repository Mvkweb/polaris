import { nativeImage } from 'electron'
import { access, readdir, readFile } from 'fs/promises'
import { constants } from 'fs'
import { extname, isAbsolute, join } from 'path'
import { dataDirs } from './desktopEntries'

/**
 * App icons from .desktop `Icon=` values, as small data URLs for the UI.
 * Looks in hicolor first (the spec's fallback theme that every app ships
 * to), then any installed theme (Papirus, Breeze, Adwaita…), then pixmaps.
 */

const SIZES = ['scalable', '512x512', '256x256', '128x128', '96x96', '64x64', '48x48', '32x32']
// Breeze-style layouts put the size after the context: apps/48/foo.svg
const CONTEXT_SIZES = ['scalable', '64', '48', '32']

const readable = async (file: string): Promise<boolean> =>
  access(file, constants.R_OK).then(
    () => true,
    () => false
  )

let themes: Promise<string[]> | null = null
const iconThemeDirs = (): Promise<string[]> =>
  (themes ??= (async () => {
    const out: string[] = []
    for (const base of dataDirs()) {
      const root = join(base, 'icons')
      const names = await readdir(root).catch(() => [] as string[])
      // hicolor first, then the rest in a stable order
      for (const name of names.sort((a, b) => Number(b === 'hicolor') - Number(a === 'hicolor'))) {
        out.push(join(root, name))
      }
    }
    return out
  })())

export const findIconFile = async (icon: string): Promise<string | null> => {
  if (isAbsolute(icon)) return (await readable(icon)) ? icon : null
  for (const theme of await iconThemeDirs()) {
    for (const size of SIZES) {
      for (const ext of size === 'scalable' ? ['svg'] : ['png', 'svg']) {
        const file = join(theme, size, 'apps', `${icon}.${ext}`)
        if (await readable(file)) return file
      }
    }
    for (const size of CONTEXT_SIZES) {
      const file = join(theme, 'apps', size, `${icon}.svg`)
      if (await readable(file)) return file
    }
  }
  for (const ext of ['png', 'svg', 'xpm']) {
    const file = `/usr/share/pixmaps/${icon}.${ext}`
    if (ext !== 'xpm' && (await readable(file))) return file
  }
  return null
}

export const iconToDataUrl = async (file: string): Promise<string | null> => {
  try {
    if (extname(file).toLowerCase() === '.svg') {
      const svg = await readFile(file)
      return `data:image/svg+xml;base64,${svg.toString('base64')}`
    }
    const img = nativeImage.createFromPath(file)
    if (img.isEmpty()) return null
    // 64px covers a 16–32px glyph on HiDPI and keeps the IPC payload small.
    return img.resize({ width: 64, height: 64, quality: 'best' }).toDataURL()
  } catch {
    return null
  }
}

const cache = new Map<string, Promise<string | null>>()

/** Data URL for a desktop entry's `Icon=` value, cached; null when not found. */
export const appIconDataUrl = (icon: string | undefined): Promise<string | null> => {
  if (!icon) return Promise.resolve(null)
  let hit = cache.get(icon)
  if (!hit) {
    hit = findIconFile(icon).then((file) => (file ? iconToDataUrl(file) : null))
    cache.set(icon, hit)
  }
  return hit
}
