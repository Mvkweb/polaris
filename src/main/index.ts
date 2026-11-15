import { app, shell, BrowserWindow, ipcMain, nativeTheme, nativeImage, Menu, protocol } from 'electron'

// Bypass native menu construction before app is ready
Menu.setApplicationMenu(null)
import { join, resolve, extname, basename } from 'path'
import { existsSync } from 'fs'
import { homedir, userInfo } from 'os'
import { readdir, readFile, writeFile, stat, statfs, mkdir, rename, rm, cp } from 'fs/promises'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Register privileged custom schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'polaris-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
])

const execFileAsync = promisify(execFile)
const idNameCache = new Map<string, string>()

// Filesystems that are read-only by design. They report zero free blocks, so
// a usage percentage would always read 100% even though nothing is "full".
const READ_ONLY_FILESYSTEMS = new Set(['iso9660', 'squashfs', 'erofs', 'cramfs', 'romfs'])

// Helper to fetch git-tracked and untracked (non-ignored) files
const getGitFiles = async (cwd: string): Promise<string[] | null> => {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd, maxBuffer: 32 * 1024 * 1024 }
    )
    return stdout.split('\0').filter(Boolean)
  } catch {
    return null
  }
}
import icon from '../../resources/icon.png?asset'
import { registerTerminalHandlers, killAllTerminals } from './terminal'
import { emberCore } from './core/EmberCore'

// Force Chromium and GTK into dark mode globally to prevent light native widget/scrollbar flashes on Linux
app.commandLine.appendSwitch('force-dark-mode')

// Linux: leave ozone/GL selection to Electron. Since Electron 38, --ozone-platform defaults to "auto"
// (native Wayland when available, X11 fallback otherwise). Hardcoding "wayland" breaks X11 sessions,
// and an unknown --use-gl value makes Chromium exit its GPU process ("gl=none,angle=none") before
// the first frame, leaving the window invisible.
nativeTheme.themeSource = 'dark'

let driveMonitorProcess: ReturnType<typeof spawn> | null = null
let driveDebounceTimer: NodeJS.Timeout | null = null

function triggerDrivesChanged(): void {
  if (driveDebounceTimer) clearTimeout(driveDebounceTimer)
  driveDebounceTimer = setTimeout(() => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('system:drivesChanged')
      }
    }
  }, 250)
}

function initDriveMonitoring(): void {
  if (process.platform !== 'linux' || driveMonitorProcess) return
  try {
    driveMonitorProcess = spawn('udisksctl', ['monitor'], { stdio: ['ignore', 'pipe', 'ignore'] })
    driveMonitorProcess.stdout?.on('data', () => {
      triggerDrivesChanged()
    })
    driveMonitorProcess.on('error', (err) => {
      console.warn('udisksctl monitor unavailable, falling back to findmnt:', err)
      try {
        const alt = spawn('findmnt', ['--poll=mount,umount'], { stdio: ['ignore', 'pipe', 'ignore'] })
        alt.stdout?.on('data', () => triggerDrivesChanged())
        driveMonitorProcess = alt
      } catch {}
    })
  } catch (err) {
    console.warn('Drive monitoring init error:', err)
  }
}

function createWindow(): void {
  initDriveMonitoring()
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 860,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: !is.dev
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.ember.ide')
  nativeTheme.themeSource = 'dark'

  // Serve local media files securely in both development and production via Node fs
  protocol.handle('polaris-media', async (request) => {
    try {
      const url = new URL(request.url)
      // Custom standard schemes parse the first path component as host (e.g. polaris-media:///mnt/data -> host="mnt", path="/data")
      const raw = url.host ? `/${url.host}${url.pathname}` : url.pathname
      let decodedPath = decodeURIComponent(raw)
      if (process.platform === 'win32') {
        decodedPath = decodedPath.replace(/^\/+/, '')
      }
      const data = await readFile(decodedPath)
      const ext = extname(decodedPath).toLowerCase().replace(/^\./, '')
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        ico: 'image/x-icon'
      }
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400'
        }
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:platform', () => process.platform)

  registerTerminalHandlers()
  emberCore.start()
  emberCore.index(process.cwd()).catch((err) => {
    console.warn('[EmberCore] Initial indexing warning:', err)
  })

  app.on('before-quit', () => {
    emberCore.stop()
    killAllTerminals()
    if (driveMonitorProcess) {
      try {
        driveMonitorProcess.kill()
      } catch {}
      driveMonitorProcess = null
    }
  })

  // NOTE: Temporary default to process.cwd() / dev root; replace with user-selected workspace later
  ipcMain.handle('fs:getWorkspaceRoot', () => {
    return process.cwd()
  })

  // Read directory entries for real file explorer (folders first, sorted alphabetically)
  ipcMain.handle('fs:readDirectory', async (_, dirPath?: string) => {
    try {
      // NOTE: Defaults to process.cwd() if no path provided; replace with workspace root later
      const targetPath = resolve(dirPath || process.cwd())
      if (targetPath === '/dev' || targetPath.startsWith('/dev/')) {
        throw new Error(`Cannot browse block device node: ${targetPath}`)
      }
      const entries = await readdir(targetPath, { withFileTypes: true })

      const mapped = entries
        // Exclude noisy internals (.git) but keep relevant dotfolders like .agents, .vscode, .github
        .filter((entry) => entry.name !== '.git')
        .map((entry) => ({
          name: entry.name,
          path: join(targetPath, entry.name),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          extension: entry.isDirectory()
            ? ''
            : extname(entry.name).toLowerCase().replace(/^\./, '')
        }))

      // Folders on top, both sorted alphabetically (case-insensitive) using fast cached collator
      const dirCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
      mapped.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return dirCollator.compare(a.name, b.name)
      })

      return mapped
    } catch (err) {
      console.error('Failed to read directory:', dirPath, err)
      return []
    }
  })

  // Read file contents as UTF-8 string
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return content
    } catch (err) {
      console.error('Failed to read file:', filePath, err)
      throw err
    }
  })

  // Write file contents to disk (UTF-8)
  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8')
      return true
    } catch (err) {
      console.error('Failed to write file:', filePath, err)
      throw err
    }
  })

  // Create directory
  ipcMain.handle('fs:createDirectory', async (_, dirPath: string) => {
    try {
      await mkdir(dirPath, { recursive: true })
      return true
    } catch (err) {
      console.error('Failed to create directory:', dirPath, err)
      throw err
    }
  })

  // Rename file or folder
  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    try {
      await rename(oldPath, newPath)
      return true
    } catch (err) {
      console.error('Failed to rename path:', oldPath, newPath, err)
      throw err
    }
  })

  // Move file or folder to OS Trash (falls back to permanent deletion if trash is unsupported)
  ipcMain.handle('fs:trash', async (_, itemPath: string) => {
    try {
      await shell.trashItem(itemPath)
      return true
    } catch (err) {
      console.warn('shell.trashItem failed, falling back to rm:', err)
      try {
        await rm(itemPath, { recursive: true, force: true })
        return true
      } catch (rmErr) {
        console.error('Failed to delete path:', itemPath, rmErr)
        throw rmErr
      }
    }
  })

  // Copy file or folder recursively
  ipcMain.handle('fs:copy', async (_, srcPath: string, destPath: string) => {
    try {
      await cp(srcPath, destPath, { recursive: true })
      return true
    } catch (err) {
      console.error('Failed to copy path:', srcPath, destPath, err)
      throw err
    }
  })

  // Reveal item in native OS file manager
  ipcMain.handle('shell:showItemInFolder', async (_, fullPath: string) => {
    shell.showItemInFolder(fullPath)
    return true
  })

  // Open item in OS default application
  ipcMain.handle('shell:openPath', async (_, fullPath: string) => {
    const errorMsg = await shell.openPath(fullPath)
    if (errorMsg) {
      console.error('Failed to open path:', fullPath, errorMsg)
      return false
    }
    return true
  })

  // Check if Ghostty terminal is installed on the host system
  ipcMain.handle('terminal:isGhosttyInstalled', async () => {
    try {
      const { stdout } = await execFileAsync('which', ['ghostty'])
      return Boolean(stdout.trim())
    } catch {
      return false
    }
  })

  // Open native Ghostty window in target directory
  ipcMain.handle('terminal:openGhostty', async (_, targetDir?: string) => {
    try {
      const dir = targetDir || process.cwd()
      const child = spawn('ghostty', ['+new-window', `--working-directory=${dir}`], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return true
    } catch (err) {
      console.error('Failed to launch ghostty:', err)
      return false
    }
  })

  // Check if VS Code / code CLI is installed on host
  ipcMain.handle('editor:isCodeInstalled', async () => {
    try {
      const { stdout } = await execFileAsync('which', ['code'])
      return Boolean(stdout.trim())
    } catch {
      return false
    }
  })

  // Open target file or directory in VS Code
  ipcMain.handle('editor:openCode', async (_, targetPath: string) => {
    try {
      const p = targetPath || process.cwd()
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

  // Inspect detailed file and directory metadata / properties
  ipcMain.handle('fs:getFileProperties', async (_, fullPath: string) => {
    try {
      const stats = await stat(fullPath)
      let itemCount: number | undefined = undefined
      if (stats.isDirectory()) {
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
        // Fast-path: current user/group
        const currentUid = process.getuid ? process.getuid() : -1
        const currentGid = process.getgid ? process.getgid() : -1
        if (stats.uid === currentUid) {
          try {
            owner = userInfo().username || owner
          } catch {}
        }
        const resolveName = async (flag: '-un' | '-gn', idVal: number, fallback: string): Promise<string> => {
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
          stats.gid === currentGid && currentGid !== -1 ? resolveName('-gn', stats.gid, group) : resolveName('-gn', stats.gid, group)
        ])
        owner = resolvedOwner
        group = resolvedGroup
      }

      return {
        path: fullPath,
        name: basename(fullPath),
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
        size: stats.size,
        createdTime: stats.birthtimeMs || stats.ctimeMs,
        modifiedTime: stats.mtimeMs,
        accessedTime: stats.atimeMs,
        permissions: (stats.mode & 0o777).toString(8).padStart(4, '0'),
        owner,
        group,
        itemCount
      }
    } catch (err) {
      console.error('Failed to get file properties:', fullPath, err)
      throw err
    }
  })

  // Read image files (PNG, JPG, SVG, ICO, ICNS, WEBP, GIF, BMP, AVIF)
  ipcMain.handle('fs:readImage', async (_, filePath: string) => {
    try {
      const stats = await stat(filePath)
      const ext = extname(filePath).toLowerCase()
      const format = ext.replace('.', '').toUpperCase()

      // SVG: return text content along with base64 data URL
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

      // ICO or ICNS: use nativeImage to convert to standard PNG data URL for perfect Chromium rendering
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

      // Standard images: PNG, JPG, JPEG, GIF, WEBP, ICO fallback, BMP, AVIF
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

  // Workspace indexer (Zig sidecar)
  ipcMain.handle('fs:indexWorkspace', async (_, rootPath?: string) => {
    const target = resolve(rootPath || process.cwd())
    if (emberCore.isAvailable()) {
      try {
        const gitFiles = await getGitFiles(target)
        return await emberCore.index(target, gitFiles ?? undefined)
      } catch (err) {
        console.warn('[EmberCore] indexWorkspace error:', err)
      }
    }
    return { indexed_count: 0, elapsed_ms: 0 }
  })

  // Zig sidecar status check (returns availability and running status)
  ipcMain.handle('core:status', async () => {
    return {
      available: emberCore.isAvailable(),
      running: emberCore.isRunning()
    }
  })

  // Full-text project code search (delegates to Zig ember-core sidecar)
  ipcMain.handle(
    'fs:searchText',
    async (
      _,
      query: string,
      options?: { caseSensitive?: boolean; wholeWord?: boolean; maxResults?: number }
    ) => {
      if (!query || !query.trim()) {
        return { matches: [], total_matches: 0, files_searched: 0, elapsed_ms: 0 }
      }
      if (emberCore.isAvailable()) {
        try {
          return await emberCore.searchText(query, options)
        } catch (err) {
          console.warn('[EmberCore] Text search error:', err)
        }
      }
      return { matches: [], total_matches: 0, files_searched: 0, elapsed_ms: 0 }
    }
  )

  // Fast workspace file search (delegates to Zig ember-core sidecar with Node fallback)
  ipcMain.handle('fs:searchFiles', async (_, query: string) => {
    if (!query || !query.trim()) return []
    const trimmed = query.trim()

    if (emberCore.isAvailable()) {
      try {
        return await emberCore.search(trimmed, 60)
      } catch (err) {
        console.warn('[EmberCore] Sidecar search failed, using fallback:', err)
      }
    }

    const targetDir = process.cwd()
    const results: Array<{ name: string; path: string; relativePath: string }> = []
    const IGNORED = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '.cache'])
    const queue: Array<{ dir: string; rel: string }> = [{ dir: targetDir, rel: '' }]

    while (queue.length > 0 && results.length < 60) {
      const current = queue.shift()!
      let entries
      try {
        // eslint-disable-next-line no-await-in-loop
        entries = await readdir(current.dir, { withFileTypes: true })
      } catch {
        continue
      }

      for (const entry of entries) {
        if (results.length >= 60) break
        if (IGNORED.has(entry.name)) continue

        const entryRel = current.rel ? `${current.rel}/${entry.name}` : entry.name
        const entryFull = join(current.dir, entry.name)

        if (entry.isDirectory()) {
          queue.push({ dir: entryFull, rel: entryRel })
        } else if (
          entry.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          entryRel.toLowerCase().includes(trimmed.toLowerCase())
        ) {
          results.push({
            name: entry.name,
            path: entryFull,
            relativePath: entryRel
          })
        }
      }
    }

    return results
  })

  // Git integration: fetch recent commit history
  ipcMain.handle('git:getLog', async (_, repoPath?: string, maxCount = 30) => {
    try {
      const cwd = resolve(repoPath || process.cwd())
      const { stdout } = await execFileAsync(
        'git',
        ['log', '-n', String(maxCount), '--format=%H|%h|%s|%an|%at'],
        { cwd }
      )

      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, message, author, at] = line.split('|')
          return {
            hash: hash || '',
            shortHash: shortHash || '',
            message: message || '',
            author: author || '',
            timestamp: at ? parseInt(at, 10) * 1000 : Date.now()
          }
        })
    } catch {
      // Return empty array quietly if workspace is not a git repo
      return []
    }
  })

  // Git integration: fetch current branch, dirty status, modified files
  ipcMain.handle('git:getStatus', async (_, repoPath?: string) => {
    try {
      const cwd = resolve(repoPath || process.cwd())
      const [branchResult, statusResult] = await Promise.all([
        execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd }).catch(() => ({
          stdout: 'main'
        })),
        execFileAsync('git', ['status', '--porcelain=v1'], { cwd }).catch(() => ({ stdout: '' }))
      ])

      const branch = branchResult.stdout.trim() || 'main'
      const statusLines = statusResult.stdout.trim().split('\n').filter(Boolean)
      const modifiedFiles = statusLines.map((line) => line.slice(3).trim())

      return {
        branch,
        clean: statusLines.length === 0,
        modifiedCount: statusLines.length,
        files: modifiedFiles
      }
    } catch (err) {
      console.warn('git:getStatus error:', err)
      return {
        branch: 'main',
        clean: true,
        modifiedCount: 0,
        files: []
      }
    }
  })

  // Git integration: fetch commit diff or show patch
  ipcMain.handle('git:getCommitDiff', async (_, hash: string, repoPath?: string) => {
    try {
      const cwd = resolve(repoPath || process.cwd())
      const { stdout } = await execFileAsync('git', ['show', '--stat', '--patch', hash], { cwd })
      return stdout
    } catch (err) {
      console.warn('git:getCommitDiff error:', err)
      return ''
    }
  })

  // System drives detection matching Atlas DriveManager
  ipcMain.handle('system:getDrives', async () => {
    try {
      const { stdout } = await execFileAsync(
        'lsblk',
        [
          '-J',
          '-o',
          'NAME,LABEL,MOUNTPOINTS,SIZE,TYPE,FSTYPE,RM,HOTPLUG,MODEL,UUID,PARTUUID,PARTTYPE'
        ],
        { env: { ...process.env, LC_ALL: 'C' } }
      )
      const data = JSON.parse(stdout)
      const drives: any[] = []

      const preferredMountPoint = (mps?: string[]): string => {
        if (!mps || mps.length === 0) return ''
        const valid = mps.filter((m) => m && m !== '[SWAP]')
        if (valid.includes('/')) return '/'
        if (valid.includes('/home')) return '/home'
        valid.sort((a, b) => a.length - b.length || a.localeCompare(b))
        return valid[0] || ''
      }

      const isEsp = (dev: any): boolean => {
        const type = String(dev.parttype || '').toLowerCase()
        return type === '0xef' || type === 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b'
      }

      const hasDataFs = (dev: any): boolean =>
        Boolean(dev.fstype) && dev.fstype !== 'swap' && !isEsp(dev)

      const parseDev = async (
        dev: any,
        options: {
          parentModel?: string
          parentLabel?: string
          parentRm?: boolean
          parentDiskSize?: string
          hideEsp?: boolean
        } = {}
      ): Promise<void> => {
        const model = (dev.model || options.parentModel || '').trim()
        const type = dev.type
        const fstype = (dev.fstype || '').trim()
        const label = (dev.label || options.parentLabel || '').trim()
        const mountPoint = preferredMountPoint(dev.mountpoints)
        const isSwap = fstype === 'swap'
        const isLoop = type === 'loop' && !mountPoint
        const isBoot = mountPoint === '/boot' || mountPoint.startsWith('/boot/')
        const isRemovable = Boolean(dev.rm || dev.hotplug || options.parentRm)
        const isMounted = Boolean(mountPoint)
        const isReadOnly = READ_ONLY_FILESYSTEMS.has(fstype)
        const hasChildren = Array.isArray(dev.children) && dev.children.length > 0
        const isContainer = type === 'disk' && hasChildren
        const usableFs =
          Boolean(fstype) && !isSwap && !isLoop && !isBoot && !(isEsp(dev) && options.hideEsp)
        const isVolume = type === 'part' || (type === 'disk' && !isContainer)

        // Emit mounted filesystems plus unmounted removable volumes, so a
        // plugged-in USB is visible before it is mounted (like Dolphin).
        if (isVolume && usableFs && (isMounted || isRemovable)) {
          let displayName = label
          if (!displayName) {
            if (mountPoint === '/') {
              displayName = 'Root (/)'
            } else if (mountPoint) {
              displayName = mountPoint.split('/').filter(Boolean).pop() || model || dev.name
            } else if (model) {
              displayName = model
            } else if (type === 'part') {
              displayName = `${fstype.toUpperCase()} volume (${dev.size})`
            } else {
              displayName = dev.name || 'Drive'
            }
          }

          let usedPercent = isReadOnly ? 100 : 0
          let freeSpace = ''
          let bytesFree = 0
          let bytesTotal = 0

          if (isMounted) {
            try {
              const st = await statfs(mountPoint)
              bytesTotal = Number(st.blocks) * Number(st.bsize)
              if (!isReadOnly) {
                bytesFree = Number(st.bavail) * Number(st.bsize)
                if (bytesTotal > 0) {
                  usedPercent = Math.min(
                    100,
                    Math.max(0, Math.round(((bytesTotal - bytesFree) / bytesTotal) * 100))
                  )
                  const gbFree = (bytesFree / 1024 ** 3).toFixed(1)
                  freeSpace = `${gbFree} GB free`
                }
              }
            } catch {}
          }

          drives.push({
            id: dev.name,
            name: displayName,
            model,
            mountPoint: mountPoint === '/bin' ? '/' : mountPoint,
            device: `/dev/${dev.name}`,
            fstype,
            size: dev.size,
            diskSize: options.parentDiskSize,
            usedPercent,
            bytesFree,
            bytesTotal,
            freeSpace,
            isRemovable,
            isMounted,
            isReadOnly
          })
        }

        if (hasChildren) {
          // Hide the EFI system partition on removable media when the stick
          // also carries a real data volume (Dolphin does the same).
          const hideEsp = isRemovable && dev.children.some(hasDataFs)
          for (const child of dev.children) {
            await parseDev(child, {
              parentModel: model,
              parentLabel: label || options.parentLabel,
              parentRm: isRemovable,
              parentDiskSize: options.parentDiskSize || dev.size,
              hideEsp
            })
          }
        }
      }

      for (const b of data.blockdevices || []) {
        await parseDev(b, {
          parentModel: b.model,
          parentLabel: b.label,
          parentRm: Boolean(b.rm || b.hotplug),
          parentDiskSize: b.size
        })
      }

      return drives
    } catch (err) {
      console.warn('system:getDrives error:', err)
      // Never invent drives: the sidebar can show an empty state instead.
      return []
    }
  })

  // Mount a removable volume on demand, the same way Dolphin does. Read-only:
  // Polaris never writes to user media, and mounting read-only keeps it that way.
  ipcMain.handle('system:mountDrive', async (_, devicePath: string) => {
    if (process.platform !== 'linux') {
      return { ok: false, error: 'Mounting is only supported on Linux' }
    }
    if (
      typeof devicePath !== 'string' ||
      !/^\/dev\/[a-zA-Z0-9._/-]+$/.test(devicePath) ||
      devicePath.includes('..')
    ) {
      return { ok: false, error: 'Invalid device path' }
    }

    try {
      await execFileAsync('udisksctl', ['mount', '-b', devicePath, '--options', 'ro'], {
        timeout: 20000
      })

      const { stdout } = await execFileAsync('findmnt', [
        '-n',
        '-o',
        'TARGET',
        '--source',
        devicePath
      ])
      const mountPoint = stdout
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean)

      if (!mountPoint) {
        return { ok: false, error: 'Mounted, but no mount point was reported' }
      }

      triggerDrivesChanged()
      return { ok: true, mountPoint }
    } catch (err) {
      // If something else (Dolphin, udev) won the race, it is already mounted.
      try {
        const { stdout } = await execFileAsync('findmnt', [
          '-n',
          '-o',
          'TARGET',
          '--source',
          devicePath
        ])
        const mountPoint = stdout
          .split('\n')
          .map((line) => line.trim())
          .find(Boolean)
        if (mountPoint) {
          triggerDrivesChanged()
          return { ok: true, mountPoint }
        }
      } catch {}

      const message =
        err && typeof err === 'object' && 'stderr' in err && err.stderr
          ? String(err.stderr).trim()
          : err instanceof Error
            ? err.message
            : 'Could not mount the drive'
      console.warn('system:mountDrive error:', message)
      return {
        ok: false,
        error: message.split('\n').filter(Boolean).pop() || 'Could not mount the drive'
      }
    }
  })

  // User standard places (Home, Documents, Downloads, etc.) based on active OS user
  ipcMain.handle('system:getUserPlaces', () => {
    const safeGetPath = (name: Parameters<typeof app.getPath>[0], fallback: string): string => {
      try {
        return app.getPath(name)
      } catch {
        return fallback
      }
    }

    const home = safeGetPath('home', homedir())
    const candidates: Record<string, string> = {
      documents: safeGetPath('documents', join(home, 'Documents')),
      downloads: safeGetPath('downloads', join(home, 'Downloads')),
      music: safeGetPath('music', join(home, 'Music')),
      pictures: safeGetPath('pictures', join(home, 'Pictures')),
      videos: safeGetPath('videos', join(home, 'Videos'))
    }

    const result: Record<string, string> = { home }

    for (const [key, candidatePath] of Object.entries(candidates)) {
      // Avoid duplicate Home entries if minimal Linux maps xdg-user-dirs to Home
      if (candidatePath && candidatePath !== home && existsSync(candidatePath)) {
        result[key] = candidatePath
      }
    }

    // Resolve trash path
    if (process.platform === 'darwin') {
      const macTrash = join(home, '.Trash')
      if (existsSync(macTrash)) result.trash = macTrash
    } else if (process.platform !== 'win32') {
      const dataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share')
      const linuxTrashFiles = join(dataHome, 'Trash', 'files')
      const linuxTrashRoot = join(dataHome, 'Trash')
      if (existsSync(linuxTrashFiles)) {
        result.trash = linuxTrashFiles
      } else if (existsSync(linuxTrashRoot)) {
        result.trash = linuxTrashRoot
      }
    }

    return result
  })

  ipcMain.handle('system:getStorageBreakdown', async (_, targetPath: string) => {
    const p = targetPath || '/'
    if (emberCore.isAvailable()) {
      try {
        return await emberCore.getStorageBreakdown(p)
      } catch (err) {
        console.warn('[EmberCore] getStorageBreakdown error:', err)
      }
    }
    return null
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
