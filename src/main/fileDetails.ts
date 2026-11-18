import { ipcMain, nativeImage } from 'electron'
import { lstat, readdir, readFile, readlink, realpath, stat } from 'fs/promises'
import { userInfo } from 'os'
import { basename, dirname, extname, resolve } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const idNameCache = new Map<string, string>()

function getMimeType(filePath: string, isDirectory: boolean): string {
  if (isDirectory) return 'inode/directory'
  const ext = extname(filePath).toLowerCase().replace('.', '')
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    json: 'application/json',
    ts: 'text/typescript',
    tsx: 'text/tsx',
    js: 'text/javascript',
    jsx: 'text/jsx',
    zig: 'text/x-zig',
    rs: 'text/rust',
    go: 'text/x-go',
    py: 'text/x-python',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    h: 'text/x-c',
    hpp: 'text/x-c++',
    html: 'text/html',
    css: 'text/css',
    md: 'text/markdown',
    txt: 'text/plain',
    pdf: 'application/pdf',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

export function registerFileDetailsIpc(): void {
  ipcMain.handle('fs:getFileProperties', async (_, fullPath: string) => {
    try {
      const stats = await lstat(fullPath)
      const isSymlink = stats.isSymbolicLink()
      let realPath: string | undefined = undefined
      let linkTarget: string | undefined = undefined
      let isBrokenLink = false
      let targetStats = stats

      if (isSymlink) {
        linkTarget = resolve(dirname(fullPath), await readlink(fullPath))
        isBrokenLink = true
        try {
          realPath = await realpath(fullPath)
          targetStats = await stat(fullPath)
          isBrokenLink = false
        } catch {
          // broken symlink
        }
      }

      let itemCount: number | undefined = undefined
      if (targetStats.isDirectory()) {
        try {
          const entries = await readdir(fullPath)
          itemCount = entries.length
        } catch {
          // ignore directory read error
        }
      }

      let owner = String(stats.uid)
      let group = String(stats.gid)
      if (process.platform !== 'win32') {
        const currentUid = process.getuid ? process.getuid() : -1
        const currentGid = process.getgid ? process.getgid() : -1
        if (stats.uid === currentUid) {
          try {
            owner = userInfo().username || owner
          } catch {}
        }
        const resolveName = async (
          flag: '-un' | '-gn',
          idVal: number,
          fallback: string
        ): Promise<string> => {
          if (idVal === currentUid && flag === '-un') return owner
          const cacheKey = `${flag}:${idVal}`
          if (idNameCache.has(cacheKey)) return idNameCache.get(cacheKey)!
          try {
            const { stdout } = await execFileAsync('id', [flag, String(idVal)], { timeout: 1500 })
            const name = stdout.trim() || fallback
            idNameCache.set(cacheKey, name)
            return name
          } catch {
            return fallback
          }
        }

        const [resolvedOwner, resolvedGroup] = await Promise.all([
          stats.uid === currentUid ? Promise.resolve(owner) : resolveName('-un', stats.uid, owner),
          stats.gid === currentGid && currentGid !== -1
            ? resolveName('-gn', stats.gid, group)
            : resolveName('-gn', stats.gid, group)
        ])
        owner = resolvedOwner
        group = resolvedGroup
      }

      const ext = extname(fullPath).toLowerCase()
      const mime = getMimeType(fullPath, targetStats.isDirectory())

      let imageDimensions: { width: number; height: number } | undefined = undefined
      const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.ico', '.avif'])
      if (imageExts.has(ext)) {
        try {
          const img = nativeImage.createFromPath(fullPath)
          const sz = img.getSize()
          if (sz.width > 0 && sz.height > 0) {
            imageDimensions = { width: sz.width, height: sz.height }
          }
        } catch {}
      }

      return {
        path: fullPath,
        name: basename(fullPath),
        isDirectory: targetStats.isDirectory(),
        isFile: targetStats.isFile(),
        isSymbolicLink: isSymlink,
        realPath,
        linkTarget,
        isBrokenLink,
        size: targetStats.size,
        createdTime: targetStats.birthtimeMs || targetStats.ctimeMs,
        modifiedTime: targetStats.mtimeMs,
        accessedTime: targetStats.atimeMs,
        permissions: (targetStats.mode & 0o777).toString(8).padStart(4, '0'),
        owner,
        group,
        itemCount,
        extension: ext,
        mime,
        imageDimensions
      }
    } catch (err) {
      console.error('Failed to get file properties:', fullPath, err)
      throw err
    }
  })

  ipcMain.handle('fs:readImage', async (_, filePath: string) => {
    try {
      const stats = await stat(filePath)
      const ext = extname(filePath).toLowerCase()
      const format = ext.replace('.', '').toUpperCase()

      if (ext === '.svg') {
        const svgContent = await readFile(filePath, 'utf-8')
        const base64 = Buffer.from(svgContent, 'utf-8').toString('base64')
        return {
          dataUrl: `data:image/svg+xml;base64,${base64}`,
          size: stats.size,
          format,
          isSvg: true,
          svgContent
        }
      }

      // Convert ICO and ICNS to PNG for Chromium.
      if (ext === '.icns' || ext === '.ico') {
        try {
          const nImg = nativeImage.createFromPath(filePath)
          if (!nImg.isEmpty()) {
            return {
              dataUrl: nImg.toDataURL(),
              size: stats.size,
              format
            }
          }
        } catch (e) {
          console.warn('nativeImage conversion fallback for icon:', e)
        }
      }

      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp',
        '.avif': 'image/avif'
      }

      const mime = mimeMap[ext] || 'image/png'
      const buf = await readFile(filePath)
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

      return {
        dataUrl,
        size: stats.size,
        format
      }
    } catch (err) {
      console.error('Failed to read image file:', filePath, err)
      throw err
    }
  })
}
