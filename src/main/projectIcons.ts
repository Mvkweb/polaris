import { ipcMain } from 'electron'
import { readdir, readFile } from 'fs/promises'
import { basename, dirname, extname, join, resolve, sep } from 'path'

/**
 * Project icons for folders, resolved the way T3 Code does it: well-known
 * favicon/logo paths first, then the `<link rel="icon">` of an index.html.
 *
 * Cheap by construction: each folder is read once and a candidate is only
 * checked when its first path segment actually exists in that listing, so a
 * plain folder costs one readdir. Results are cached (10 min hit / 1 min miss).
 */

const CANDIDATES = [
  'favicon.svg',
  'favicon.ico',
  'favicon.png',
  'logo.svg',
  'icon.svg',
  'public/favicon.svg',
  'public/favicon.ico',
  'public/favicon.png',
  'public/logo.svg',
  'app/favicon.ico',
  'app/favicon.png',
  'app/icon.svg',
  'app/icon.png',
  'app/icon.ico',
  'src/favicon.ico',
  'src/favicon.svg',
  'src/app/favicon.ico',
  'src/app/icon.svg',
  'src/app/icon.png',
  'assets/icon.svg',
  'assets/icon.png',
  'assets/logo.svg',
  'assets/logo.png',
  'resources/icon.svg',
  'resources/icon.png',
  '.idea/icon.svg',
  'logo.png',
  'icon.png'
]
/** Name-based spots (e.g. atlas/assets/atlas.svg); `{n}` is the folder name. */
const NAMED_CANDIDATES = [
  '{n}.svg',
  'assets/{n}.svg',
  'assets/{n}.png',
  'resources/{n}.svg',
  'resources/{n}.png',
  'icons/{n}.svg',
  'data/icons/{n}.svg'
]
/** Last resort: one wildcard level inside assets/ (e.g. assets/prod/logo.svg). */
const NESTED_CANDIDATES = ['assets/*/logo.svg', 'assets/*/icon.svg', 'assets/*/logo.png']
const WILDCARD_LIMIT = 16
const HTML_SOURCES = ['index.html', 'public/index.html', 'src/index.html']
const LINK_ICON_RE =
  /<link\b(?=[^>]*\brel=["'](?:icon|shortcut icon)["'])(?=[^>]*\bhref=["']([^"'?#]+))[^>]*>/i
const DISPLAYABLE = new Set(['.svg', '.png', '.ico', '.webp', '.jpg', '.jpeg', '.gif'])
const SKIP_SEGMENTS = [`${sep}node_modules${sep}`, `${sep}.git${sep}`]

const HIT_TTL = 10 * 60_000
const MISS_TTL = 60_000
const MAX_ENTRIES = 2048
const cache = new Map<string, { icon: string | null; expires: number }>()

async function resolveIcon(dir: string): Promise<string | null> {
  if (SKIP_SEGMENTS.some((s) => (dir + sep).includes(s))) return null
  const listings = new Map<string, Set<string> | null>()
  const list = async (d: string): Promise<Set<string> | null> => {
    if (!listings.has(d)) {
      listings.set(
        d,
        await readdir(d).then(
          (n) => new Set(n),
          () => null
        )
      )
    }
    return listings.get(d)!
  }
  /** Walk a relative path segment by segment using directory listings only. */
  const exists = async (rel: string, cur = dir): Promise<string | null> => {
    const [part, ...rest] = rel.split('/')
    const names = await list(cur)
    if (!names) return null
    if (part === '*') {
      let tried = 0
      for (const name of names) {
        if (name.startsWith('.') || ++tried > WILDCARD_LIMIT) continue
        const hit = await exists(rest.join('/'), join(cur, name))
        if (hit) return hit
      }
      return null
    }
    if (!names.has(part)) return null
    const next = join(cur, part)
    return rest.length ? exists(rest.join('/'), next) : next
  }

  if (!(await list(dir))) return null
  const names = [...new Set([basename(dir), basename(dir).toLowerCase()])]
  const named = names.flatMap((n) => NAMED_CANDIDATES.map((c) => c.replace('{n}', n)))
  for (const c of [...CANDIDATES, ...named, ...NESTED_CANDIDATES]) {
    const hit = await exists(c)
    if (hit) return hit
  }
  // <link rel="icon" href="…"> in a root html file
  for (const src of HTML_SOURCES) {
    if (!(await exists(src))) continue
    const html = await readFile(join(dir, src), 'utf8').catch(() => '')
    const href = LINK_ICON_RE.exec(html.slice(0, 64 * 1024))?.[1]
    if (!href || /^[a-z]+:/i.test(href) || !DISPLAYABLE.has(extname(href).toLowerCase())) continue
    const rel = href.replace(/^\.?\//, '')
    for (const base of href.startsWith('/') ? ['public', ''] : [dirname(src)]) {
      const candidate = base && base !== '.' ? `${base}/${rel}` : rel
      if (await exists(candidate)) {
        const abs = resolve(dir, candidate)
        if (abs.startsWith(dir + sep)) return abs
      }
    }
  }
  return null
}

export async function projectIcons(dirs: string[]): Promise<Record<string, string | null>> {
  const now = Date.now()
  const out: Record<string, string | null> = {}
  await Promise.all(
    dirs.slice(0, 500).map(async (d) => {
      const hit = cache.get(d)
      if (hit && hit.expires > now) {
        out[d] = hit.icon
        return
      }
      const icon = await resolveIcon(d).catch(() => null)
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!)
      cache.set(d, { icon, expires: now + (icon ? HIT_TTL : MISS_TTL) })
      out[d] = icon
    })
  )
  return out
}

export const registerProjectIconIpc = (): void => {
  ipcMain.handle('fs:projectIcons', (_e, dirs: unknown) =>
    projectIcons(Array.isArray(dirs) ? dirs.filter((d): d is string => typeof d === 'string') : [])
  )
}
