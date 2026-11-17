import { ipcMain, protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { Readable } from 'stream'

/**
 * `polaris-media://` — read-only local media for the renderer (thumbnails,
 * the inspector preview and the media viewer).
 *
 * Streams from disk and honours HTTP Range requests, so a multi-GB video
 * starts instantly and seeks without ever being loaded into memory.
 *
 * URL forms:
 *   polaris-media://local/<percent-encoded absolute path>   (preferred: host is fixed,
 *                                                            so path case survives)
 *   polaris-media:///abs/path                               (legacy: first segment
 *                                                            parsed as host)
 */

export const MEDIA_SCHEME = 'polaris-media'

export const MEDIA_SCHEME_PRIVILEGES = {
  scheme: MEDIA_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    bypassCSP: true
  }
} as const

const MIME: Record<string, string> = {
  // images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  // video
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  // audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac'
}

const pathFromUrl = (raw: string): string => {
  const url = new URL(raw)
  const encoded = url.host === 'local' ? url.pathname : `/${url.host}${url.pathname}`
  const decoded = decodeURIComponent(encoded)
  return process.platform === 'win32' ? decoded.replace(/^\/+/, '') : decoded
}

/** Parse a single `bytes=a-b` range (suffix and open-ended forms included). */
const parseRange = (header: string, size: number): { start: number; end: number } | null => {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start: number
  let end: number
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  return start <= end && start < size ? { start, end } : null
}

const body = (path: string, start: number, end: number): ReadableStream =>
  Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream

export const registerMediaProtocol = (): void => {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const path = pathFromUrl(request.url)
      const info = await stat(path)
      if (!info.isFile()) return new Response(null, { status: 404 })

      const size = info.size
      const type = MIME[extname(path).slice(1).toLowerCase()] ?? 'application/octet-stream'
      const headers: Record<string, string> = {
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        // Lets the studio read pixels back from canvases (untainted CORS image)
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }

      const rangeHeader = request.headers.get('range')
      if (rangeHeader) {
        const range = parseRange(rangeHeader, size)
        if (!range) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` }
          })
        }
        return new Response(body(path, range.start, range.end), {
          status: 206,
          headers: {
            ...headers,
            'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
            'Content-Length': String(range.end - range.start + 1)
          }
        })
      }

      if (size === 0) return new Response('', { status: 200, headers })
      return new Response(body(path, 0, size - 1), {
        status: 200,
        headers: { ...headers, 'Content-Length': String(size) }
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}

// ── Image studio export ───────────────────────────────────────────────────

const EXPORT_EXTENSIONS = new Set(['png', 'jpg', 'webp', 'avif', 'gif', 'ico'])
const MAX_EXPORT_BYTES = 512 * 1024 * 1024

/**
 * Write encoded bytes as a NEW file beside `sourcePath`. Never overwrites:
 * the write uses the exclusive `wx` flag and walks `name (1).ext`, `name (2).ext`…
 * until a free name is found, so even a race can't clobber a user file.
 */
export const exportBesideSource = async (
  sourcePath: string,
  stem: string,
  ext: string,
  bytes: Uint8Array
): Promise<string> => {
  if (!EXPORT_EXTENSIONS.has(ext)) throw new Error(`Unsupported export format: ${ext}`)
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new Error('Empty export')
  if (bytes.byteLength > MAX_EXPORT_BYTES) throw new Error('Export too large')
  // The stem comes from the renderer: keep it a plain file name.
  const safeStem =
    basename(stem)
      .replace(/[\\/\0]/g, '')
      .trim() || 'export'
  const dir = dirname(sourcePath)
  if (!(await stat(dir)).isDirectory()) throw new Error('Source folder not found')

  for (let i = 0; i < 1000; i++) {
    const target = join(dir, `${safeStem}${i === 0 ? '' : ` (${i})`}.${ext}`)
    try {
      await writeFile(target, bytes, { flag: 'wx' })
      return target
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }
  }
  throw new Error('No free file name')
}

export const registerMediaIpc = (): void => {
  ipcMain.handle(
    'media:exportImage',
    (_e, sourcePath: string, stem: string, ext: string, bytes: Uint8Array) =>
      exportBesideSource(sourcePath, stem, ext, bytes)
  )
}
