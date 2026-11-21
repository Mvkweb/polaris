import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import { mkdir, stat } from 'fs/promises'
import { basename, dirname, join, relative } from 'path'
import { createTask, updateTask, setCanceler } from './tasks'
import type { ArchiveFormat, ArchiveResult } from '../shared/ipcModels'

const EXT_MAP: Record<ArchiveFormat, string> = {
  zip: '.zip',
  'tar.gz': '.tar.gz',
  'tar.xz': '.tar.xz',
  'tar.zst': '.tar.zst',
  '7z': '.7z'
}

const TAR_EXTENSIONS = new Set([
  '.tar',
  '.tar.gz',
  '.tgz',
  '.tar.xz',
  '.txz',
  '.tar.zst',
  '.tzst',
  '.tar.bz2',
  '.tbz2'
])

function isTarArchive(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  for (const ext of TAR_EXTENSIONS) {
    if (lower.endsWith(ext)) return true
  }
  return false
}

function runProcess(
  cmd: string,
  args: string[],
  cwd: string,
  taskId?: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn> | null = null
    try {
      proc = spawn(cmd, args, { cwd, windowsHide: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return resolve({ success: false, error: msg })
    }

    if (taskId) {
      setCanceler(taskId, () => {
        try {
          proc?.kill('SIGTERM')
        } catch {}
      })
    }

    let stderr = ''
    proc.stderr?.on('data', (d) => {
      stderr += d.toString()
    })

    proc.on('error', (err) => {
      if (taskId) setCanceler(taskId, null)
      resolve({ success: false, error: err.message })
    })

    proc.on('close', (code) => {
      if (taskId) setCanceler(taskId, null)
      if (code === 0) {
        resolve({ success: true })
      } else {
        const errorMsg = stderr.trim() || `Process exited with code ${code}`
        resolve({ success: false, error: errorMsg })
      }
    })
  })
}

export function registerArchiveIpc(): void {
  ipcMain.handle(
    'archive:compress',
    async (
      _e,
      sources: string[],
      destDir: string,
      archiveName: string,
      format: ArchiveFormat
    ): Promise<ArchiveResult> => {
      if (!sources.length) {
        return { success: false, error: 'No files selected to compress' }
      }

      const ext = EXT_MAP[format] || '.zip'
      const cleanName = archiveName.trim().replace(/[/\\]/g, '') || 'archive'
      const archiveFileName = cleanName.endsWith(ext) ? cleanName : `${cleanName}${ext}`
      const archivePath = join(destDir, archiveFileName)

      // Establish working directory so paths stored in archive are clean relative paths
      const firstParent = dirname(sources[0])
      const allSameParent = sources.every((s) => dirname(s) === firstParent)
      const workingDir = allSameParent ? firstParent : destDir
      const items = sources.map((s) => (allSameParent ? basename(s) : relative(workingDir, s)))

      // Estimate total size for progress tracking
      let totalBytes = 0
      for (const s of sources) {
        try {
          const st = await stat(s)
          totalBytes += st.size
        } catch {}
      }

      const taskId = `archive-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      createTask({
        id: taskId,
        kind: 'archive',
        serviceId: 'compress',
        fileName: archiveFileName,
        filePath: archivePath,
        target: destDir,
        total: totalBytes || 100
      })
      updateTask(taskId, { status: 'running', startedAt: Date.now() })

      let cmd = 'tar'
      let args: string[] = []

      if (format === 'tar.gz') {
        cmd = 'tar'
        args = ['-czf', archivePath, ...items]
      } else if (format === 'tar.xz') {
        cmd = 'tar'
        args = ['-cJf', archivePath, ...items]
      } else if (format === 'tar.zst') {
        cmd = 'tar'
        args = ['--zstd', '-cf', archivePath, ...items]
      } else if (format === '7z') {
        cmd = '7z'
        args = ['a', '-y', archivePath, ...items]
      } else {
        // default zip
        cmd = '7z'
        args = ['a', '-tzip', '-y', archivePath, ...items]
      }

      const result = await runProcess(cmd, args, workingDir, taskId)

      if (result.success) {
        updateTask(taskId, {
          status: 'done',
          sent: totalBytes || 100,
          finishedAt: Date.now()
        })
        return { success: true, archivePath }
      } else {
        updateTask(taskId, {
          status: 'error',
          error: result.error,
          finishedAt: Date.now()
        })
        return { success: false, error: result.error }
      }
    }
  )

  ipcMain.handle(
    'archive:extract',
    async (_e, archivePath: string, destDir?: string): Promise<ArchiveResult> => {
      const outDir = destDir || dirname(archivePath)
      const fileName = basename(archivePath)

      try {
        await mkdir(outDir, { recursive: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { success: false, error: `Failed to create destination folder: ${msg}` }
      }

      const taskId = `extract-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      createTask({
        id: taskId,
        kind: 'extract',
        serviceId: 'extract',
        fileName,
        filePath: archivePath,
        target: outDir,
        total: 100
      })
      updateTask(taskId, { status: 'running', startedAt: Date.now() })

      let cmd = '7z'
      let args: string[] = []

      if (isTarArchive(archivePath)) {
        cmd = 'tar'
        args = ['-xf', archivePath, '-C', outDir]
      } else {
        cmd = '7z'
        args = ['x', '-y', `-o${outDir}`, archivePath]
      }

      const result = await runProcess(cmd, args, outDir, taskId)

      if (result.success) {
        updateTask(taskId, {
          status: 'done',
          sent: 100,
          finishedAt: Date.now()
        })
        return { success: true, destDir: outDir }
      } else {
        updateTask(taskId, {
          status: 'error',
          error: result.error,
          finishedAt: Date.now()
        })
        return { success: false, error: result.error }
      }
    }
  )
}
