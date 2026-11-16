export type MediaKind = 'image' | 'video' | 'audio'

const KINDS: Record<string, MediaKind> = {}
for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg']) {
  KINDS[ext] = 'image'
}
for (const ext of ['mp4', 'm4v', 'webm', 'mov', 'ogv', 'mkv']) KINDS[ext] = 'video'
for (const ext of ['mp3', 'wav', 'ogg', 'oga', 'opus', 'flac', 'm4a', 'aac']) KINDS[ext] = 'audio'

export const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** Media kind for a path, or null when it should open as text. */
export const mediaKind = (path: string | null | undefined): MediaKind | null =>
  path ? (KINDS[extensionOf(path)] ?? null) : null

/** SVGs are both: previewed as images, editable as source. */
export const hasSourceView = (path: string): boolean => extensionOf(path) === 'svg'

/** Streamed, Range-aware URL served by the main process (see src/main/media.ts). */
export const mediaUrl = (path: string): string =>
  `polaris-media://local${path.split('/').map(encodeURIComponent).join('/')}`

export const mediaLabel = (path: string, kind: MediaKind): string => {
  const ext = extensionOf(path).toUpperCase()
  return `${ext} ${kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : 'Audio'}`
}

export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor(seconds / 60) % 60
  const h = Math.floor(seconds / 3600)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
