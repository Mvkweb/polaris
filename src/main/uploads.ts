import { app, clipboard, ipcMain } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { randomBytes, randomUUID } from 'crypto'
import { request } from 'https'
import { basename, extname } from 'path'
import { createTask, setCanceler, taskStatus, updateTask } from './tasks'
import type { UploadService } from '../shared/ipcModels'

export type { UploadService } from '../shared/ipcModels'

interface ServiceImpl extends UploadService {
  url: string
  fileField: string
  fields: Record<string, string>
  /** ms the file lives after upload, when fixed */
  ttl?: number
  parse: (status: number, body: string) => string
}

const MB = 1024 * 1024
const HOUR = 3_600_000

const plainUrl = (status: number, body: string): string => {
  const text = body.trim()
  if (status >= 200 && status < 300 && /^https?:\/\/\S+$/.test(text)) return text
  throw new Error(text.slice(0, 160) || `HTTP ${status}`)
}

const litterbox = (
  time: '1h' | '12h' | '24h' | '72h',
  label: string,
  hours: number
): ServiceImpl => ({
  id: `litterbox-${time}`,
  name: 'Litterbox',
  retention: label,
  maxBytes: 1024 * MB,
  group: 'temporary',
  url: 'https://litterbox.catbox.moe/resources/internals/api.php',
  fileField: 'fileToUpload',
  fields: { reqtype: 'fileupload', time },
  ttl: hours * HOUR,
  parse: plainUrl
})

const SERVICES: ServiceImpl[] = [
  {
    id: 'catbox',
    name: 'Catbox',
    retention: 'Permanent',
    maxBytes: 200 * MB,
    group: 'permanent',
    url: 'https://catbox.moe/user/api.php',
    fileField: 'fileToUpload',
    fields: { reqtype: 'fileupload' },
    parse: plainUrl
  },
  {
    id: '0x0',
    name: '0x0.st',
    retention: '30 days – 1 year',
    maxBytes: 512 * MB,
    group: 'permanent',
    url: 'https://0x0.st',
    fileField: 'file',
    fields: {},
    parse: plainUrl
  },
  litterbox('1h', '1 hour', 1),
  litterbox('12h', '12 hours', 12),
  litterbox('24h', '24 hours', 24),
  litterbox('72h', '3 days', 72),
  {
    id: 'uguu',
    name: 'Uguu',
    retention: '3 hours',
    maxBytes: 128 * MB,
    group: 'temporary',
    url: 'https://uguu.se/upload',
    fileField: 'files[]',
    fields: {},
    ttl: 3 * HOUR,
    parse: (status, body) => {
      try {
        const j = JSON.parse(body) as {
          success?: boolean
          files?: { url?: string }[]
          description?: string
        }
        const url = j.files?.[0]?.url
        if (j.success && url) return url
        throw new Error(j.description || `HTTP ${status}`)
      } catch (e) {
        throw e instanceof SyntaxError ? new Error(body.slice(0, 160) || `HTTP ${status}`) : e
      }
    }
  }
]

export const listUploadServices = (): UploadService[] =>
  SERVICES.map(({ id, name, retention, maxBytes, group }) => ({
    id,
    name,
    retention,
    maxBytes,
    group
  }))

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.zip': 'application/zip'
}

// ── Transfer ────────────────────────────────────────────────────────────────

function transfer(
  svc: ServiceImpl,
  path: string,
  size: number,
  onProgress: (sent: number) => void,
  setAbort: (fn: () => void) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = `----polaris${randomBytes(12).toString('hex')}`
    const name = basename(path).replace(/["\r\n]/g, '_')
    let head = ''
    for (const [k, v] of Object.entries(svc.fields)) {
      head += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
    }
    head +=
      `--${boundary}\r\nContent-Disposition: form-data; name="${svc.fileField}"; filename="${name}"\r\n` +
      `Content-Type: ${MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'}\r\n\r\n`
    const tail = `\r\n--${boundary}--\r\n`
    const headBuf = Buffer.from(head)
    const tailBuf = Buffer.from(tail)

    let settled = false
    const fail = (err: Error): void => {
      if (settled) return
      settled = true
      file.destroy()
      req.destroy()
      reject(err)
    }

    const req = request(svc.url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': headBuf.length + size + tailBuf.length,
        'User-Agent': `Polaris/${app.getVersion()}`
      }
    })
    const file = createReadStream(path, { highWaterMark: 256 * 1024 })
    setAbort(() => fail(new Error('Canceled')))

    req.setTimeout(60_000, () => fail(new Error('Connection timed out')))
    req.on('error', fail)
    req.on('response', (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => {
        if (body.length < 64 * 1024) body += c
      })
      res.on('end', () => {
        if (settled) return
        settled = true
        try {
          resolve(svc.parse(res.statusCode ?? 0, body))
        } catch (e) {
          reject(e as Error)
        }
      })
      res.on('error', fail)
    })

    let sent = 0
    req.write(headBuf)
    file.on('data', (chunk) => {
      sent += chunk.length
      onProgress(sent)
    })
    file.on('error', fail)
    file.on('end', () => req.end(tailBuf))
    file.pipe(req, { end: false })
  })
}

// ── Queue ───────────────────────────────────────────────────────────────────

const CONCURRENCY = 2
const queue: { taskId: string; svc: ServiceImpl; path: string; size: number }[] = []
let active = 0

const pump = (): void => {
  while (active < CONCURRENCY && queue.length) {
    const job = queue.shift()!
    if (taskStatus(job.taskId) !== 'queued') continue
    active++
    void run(job).finally(() => {
      active--
      pump()
    })
  }
}

async function run(job: (typeof queue)[number]): Promise<void> {
  const { taskId, svc, path, size } = job
  updateTask(taskId, { status: 'running', startedAt: Date.now() })
  try {
    const url = await transfer(
      svc,
      path,
      size,
      (sent) => updateTask(taskId, { sent }),
      (abort) => setCanceler(taskId, abort)
    )
    if (taskStatus(taskId) === 'canceled') return
    clipboard.writeText(url)
    updateTask(taskId, {
      status: 'done',
      sent: size,
      url,
      finishedAt: Date.now(),
      expiresAt: svc.ttl ? Date.now() + svc.ttl : undefined
    })
  } catch (err) {
    if (taskStatus(taskId) === 'canceled') return
    updateTask(taskId, { status: 'error', error: (err as Error).message, finishedAt: Date.now() })
  } finally {
    setCanceler(taskId, null)
  }
}

export async function startUploads(paths: string[], serviceId: string): Promise<string[]> {
  const svc = SERVICES.find((s) => s.id === serviceId)
  if (!svc) throw new Error(`Unknown upload service: ${serviceId}`)
  const ids: string[] = []
  for (const path of paths) {
    const info = await stat(path).catch(() => null)
    const target = `${svc.name} · ${svc.retention}`
    const task = createTask({
      id: randomUUID(),
      kind: 'upload',
      serviceId: svc.id,
      fileName: basename(path),
      filePath: path,
      target,
      total: info?.size ?? 0
    })
    ids.push(task.id)
    if (!info?.isFile()) {
      updateTask(task.id, { status: 'error', error: 'Not a file', finishedAt: Date.now() })
      continue
    }
    if (info.size > svc.maxBytes) {
      updateTask(task.id, {
        status: 'error',
        error: `Too large for ${svc.name} (max ${Math.round(svc.maxBytes / MB)} MB)`,
        finishedAt: Date.now()
      })
      continue
    }
    // Queued tasks cancel by status alone; pump() skips them.
    setCanceler(task.id, () => {})
    queue.push({ taskId: task.id, svc, path, size: info.size })
  }
  pump()
  return ids
}

export const registerUploadIpc = (): void => {
  ipcMain.handle('upload:services', () => listUploadServices())
  ipcMain.handle('upload:start', (_e, paths: unknown, serviceId: string) =>
    startUploads(
      Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : [],
      serviceId
    )
  )
}
