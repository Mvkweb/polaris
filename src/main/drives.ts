import { app, BrowserWindow, ipcMain } from 'electron'
import { execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import { statfs } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { emberCore } from './core/EmberCore'

const execFileAsync = promisify(execFile)

// Filesystems that are read-only by design. They report zero free blocks, so
// a usage percentage would always read 100% even though nothing is "full".
const READ_ONLY_FILESYSTEMS = new Set(['iso9660', 'squashfs', 'erofs', 'cramfs', 'romfs'])

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

export function startDriveMonitoring(): void {
  if (process.platform !== 'linux' || driveMonitorProcess) return
  try {
    driveMonitorProcess = spawn('udisksctl', ['monitor'], { stdio: ['ignore', 'pipe', 'ignore'] })
    driveMonitorProcess.stdout?.on('data', () => {
      triggerDrivesChanged()
    })
    driveMonitorProcess.on('error', (err) => {
      console.warn('udisksctl monitor unavailable, falling back to findmnt:', err)
      try {
        const alt = spawn('findmnt', ['--poll=mount,umount'], {
          stdio: ['ignore', 'pipe', 'ignore']
        })
        alt.stdout?.on('data', () => triggerDrivesChanged())
        driveMonitorProcess = alt
      } catch {}
    })
  } catch (err) {
    console.warn('Drive monitoring init error:', err)
  }
}

export function stopDriveMonitoring(): void {
  if (driveMonitorProcess) {
    try {
      driveMonitorProcess.kill()
    } catch {}
    driveMonitorProcess = null
  }
}

export function registerDrivesIpc(): void {
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

        // Include unmounted removable volumes so users can choose to mount them.
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
          // also has a data volume.
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

  // Mount volumes read-only so opening one does not enable writes.
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
      // Check whether another application mounted the volume before this call completed.
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
      } else {
        result.trash = linuxTrashFiles
      }
    }

    return result
  })

  ipcMain.handle('system:getTrashPath', async (_, fromPath?: string) => {
    const home = homedir()
    const uid = process.getuid ? process.getuid() : 1000

    if (process.platform === 'darwin') {
      const macTrash = join(home, '.Trash')
      return existsSync(macTrash) ? macTrash : home
    }

    if (process.platform === 'win32') {
      return home
    }

    // On Linux: Check if fromPath resides on a secondary mount with its own .Trash-$UID
    if (fromPath && typeof fromPath === 'string') {
      try {
        const { readFileSync } = await import('fs')
        const mountsContent = readFileSync('/proc/mounts', 'utf-8')
        const mountPoints = mountsContent
          .split('\n')
          .map((line) => line.split(' ')[1])
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)

        for (const mp of mountPoints) {
          if (mp !== '/' && mp !== '/home' && (fromPath === mp || fromPath.startsWith(mp + '/'))) {
            const driveTrashFiles = join(mp, `.Trash-${uid}`, 'files')
            const driveTrashRoot = join(mp, `.Trash-${uid}`)
            const driveSharedTrash = join(mp, '.Trash', String(uid), 'files')
            if (existsSync(driveTrashFiles)) return driveTrashFiles
            if (existsSync(driveTrashRoot)) return driveTrashRoot
            if (existsSync(driveSharedTrash)) return driveSharedTrash
          }
        }
      } catch {}
    }

    // Default to user's home trash
    const dataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share')
    const linuxTrashFiles = join(dataHome, 'Trash', 'files')
    const linuxTrashRoot = join(dataHome, 'Trash')
    if (existsSync(linuxTrashFiles)) return linuxTrashFiles
    if (existsSync(linuxTrashRoot)) return linuxTrashRoot
    return linuxTrashFiles
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
}
