import { app, shell, BrowserWindow, ipcMain, nativeTheme, nativeImage, Menu } from 'electron'

// Bypass native menu construction before app is ready
Menu.setApplicationMenu(null)
import { join, resolve, extname, basename } from 'path'
import { readdir, readFile, writeFile, stat, statfs, mkdir, rename, rm, cp } from 'fs/promises'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

const execFileAsync = promisify(execFile)

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
// Disable Vulkan to prevent Wayland Ozone/Vulkan GPU initialization warnings
app.commandLine.appendSwitch('disable-vulkan')
app.commandLine.appendSwitch('disable-features', 'Vulkan')
nativeTheme.themeSource = 'dark'

function createWindow(): void {
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
      sandbox: false
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

      // Folders on top, both sorted alphabetically (case-insensitive)
      mapped.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
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
      const { stdout } = await execFileAsync('lsblk', [
        '-J',
        '-o',
        'NAME,LABEL,MOUNTPOINTS,SIZE,TYPE,FSTYPE,RM,HOTPLUG,MODEL,UUID,PARTUUID'
      ])
      const data = JSON.parse(stdout)
      const drives: any[] = []

      const preferredMountPoint = (mps: string[]): string => {
        if (!mps || mps.length === 0) return ''
        const valid = mps.filter((m) => m && m !== '[SWAP]')
        if (valid.includes('/')) return '/'
        if (valid.includes('/mnt/storage')) return '/mnt/storage'
        if (valid.includes('/home')) return '/home'
        valid.sort((a, b) => a.length - b.length || a.localeCompare(b))
        return valid[0] || ''
      }

      const parseDev = async (dev: any, parentModel?: string): Promise<void> => {
        const model = (dev.model || parentModel || '').trim()
        const type = dev.type
        const fstype = dev.fstype || ''
        const label = dev.label || ''
        const mountPoint = preferredMountPoint(dev.mountpoints)
        const isSwap = fstype === 'swap'
        const isLoop = type === 'loop' && !mountPoint
        const isBoot = mountPoint === '/boot' || mountPoint.startsWith('/boot/')
        const isValidFs = !isSwap && !isLoop && !isBoot

        if ((type === 'part' || type === 'disk') && isValidFs && mountPoint) {
          let displayName = label
          if (!displayName) {
            if (mountPoint === '/mnt/storage' || mountPoint.startsWith('/mnt/storage')) {
              displayName = 'Storage'
            } else if (model) {
              displayName = model
            } else {
              displayName = dev.name
            }
          }

          let usedPercent = 0
          let freeSpace = ''
          let bytesFree = 0
          let bytesTotal = 0

          try {
            const st = await statfs(mountPoint)
            bytesTotal = Number(st.blocks) * Number(st.bsize)
            bytesFree = Number(st.bavail) * Number(st.bsize)
            if (bytesTotal > 0) {
              usedPercent = Math.min(
                100,
                Math.max(0, Math.round(((bytesTotal - bytesFree) / bytesTotal) * 100))
              )
              const gbFree = (bytesFree / 1024 ** 3).toFixed(1)
              freeSpace = `${gbFree} GB free`
            }
          } catch {}

          drives.push({
            id: dev.name,
            name: displayName,
            model,
            mountPoint: mountPoint === '/bin' ? '/' : mountPoint,
            size: dev.size,
            usedPercent,
            bytesFree,
            bytesTotal,
            freeSpace
          })
        }

        if (dev.children) {
          for (const child of dev.children) {
            await parseDev(child, model)
          }
        }
      }

      for (const b of data.blockdevices || []) {
        await parseDev(b, b.model)
      }

      // Add unmounted major disks if any
      for (const b of data.blockdevices || []) {
        if (
          b.type === 'disk' &&
          b.name.startsWith('sd') &&
          !drives.some((d) => d.id === b.name || d.id.startsWith(b.name))
        ) {
          drives.push({
            id: b.name,
            name: (b.model || b.name).trim(),
            model: (b.model || '').trim(),
            mountPoint: `/dev/${b.name}`,
            size: b.size,
            usedPercent: 0,
            bytesFree: 0,
            bytesTotal: 0,
            freeSpace: ''
          })
        }
      }

      return drives
    } catch (err) {
      console.warn('system:getDrives error:', err)
      return [
        {
          id: 'root',
          name: 'SSDPR-CL100-240GB',
          model: 'SSDPR-CL100-240-',
          mountPoint: '/',
          size: '223.1G',
          usedPercent: 88,
          bytesFree: 28878520320,
          bytesTotal: 239518404608,
          freeSpace: '26.9 GB free'
        },
        {
          id: 'storage',
          name: 'Storage',
          model: 'ADATA SU650',
          mountPoint: '/mnt/storage',
          size: '375G',
          usedPercent: 43,
          bytesFree: 227954262016,
          bytesTotal: 397284474880,
          freeSpace: '212.3 GB free'
        }
      ]
    }
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
