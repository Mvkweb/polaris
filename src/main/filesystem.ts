import { ipcMain, shell } from 'electron'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path'
import { existsSync } from 'fs'
import { homedir } from 'os'
import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile
} from 'fs/promises'
import { startDir } from './launch'

export function registerFilesystemIpc(): void {
  // Fallback for calls without an explicit path; startup preferences are
  // resolved separately by app:startup. See launch.ts.
  ipcMain.handle('fs:getWorkspaceRoot', () => startDir)

  ipcMain.handle('fs:readDirectory', async (_, dirPath?: string) => {
    try {
      const targetPath = resolve(dirPath || startDir)
      if (targetPath === '/dev' || targetPath.startsWith('/dev/')) {
        throw new Error(`Cannot browse block device node: ${targetPath}`)
      }
      const entries = await readdir(targetPath, { withFileTypes: true })

      const mapped = entries
        // Hide .git without excluding other dotfolders.
        .filter((entry) => entry.name !== '.git')
        .map((entry) => ({
          name: entry.name,
          path: join(targetPath, entry.name),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink()
        }))

      // Symlinks: follow them to learn what they point at (a link to a folder
      // is browsed like a folder), keep the link's own date, and remember the
      // target. A link whose target is gone (or loops) is marked broken.
      const withMeta = await Promise.all(
        mapped.map(async (e) => {
          const out: Record<string, unknown> = { ...e }
          try {
            const own = await lstat(e.path)
            out.modifiedTime = own.mtimeMs
            if (e.isSymlink) {
              const raw = await readlink(e.path)
              out.linkTarget = resolve(dirname(e.path), raw)
              try {
                const target = await stat(e.path)
                out.isDirectory = target.isDirectory()
                if (!target.isDirectory()) out.size = target.size
              } catch {
                out.isBrokenLink = true
              }
            } else if (!e.isDirectory) {
              out.size = own.size
            }
          } catch {
            /* vanished while listing */
          }
          out.extension = out.isDirectory ? '' : extname(e.name).toLowerCase().replace(/^\./, '')
          return out as typeof e & { isDirectory: boolean; extension: string }
        })
      )

      // Sort directories and files separately using natural name order.
      const dirCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
      withMeta.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return dirCollator.compare(a.name, b.name)
      })

      return withMeta
    } catch (err) {
      console.error('Failed to read directory:', dirPath, err)
      return []
    }
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return content
    } catch (err) {
      console.error('Failed to read file:', filePath, err)
      throw err
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8')
      return true
    } catch (err) {
      console.error('Failed to write file:', filePath, err)
      throw err
    }
  })

  ipcMain.handle('fs:createDirectory', async (_, dirPath: string) => {
    try {
      await mkdir(dirPath, { recursive: true })
      return true
    } catch (err) {
      console.error('Failed to create directory:', dirPath, err)
      throw err
    }
  })

  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    try {
      // A relative symlink moved to another folder would point somewhere
      // else; re-aim it at the same target from its new place.
      const before = await lstat(oldPath)
      const raw = before.isSymbolicLink() ? await readlink(oldPath) : null
      await rename(oldPath, newPath)
      if (raw && !isAbsolute(raw) && dirname(resolve(oldPath)) !== dirname(resolve(newPath))) {
        const target = resolve(dirname(oldPath), raw)
        await unlink(newPath)
        await symlink(relative(dirname(resolve(newPath)), target) || '.', newPath)
      }
      return true
    } catch (err) {
      console.error('Failed to rename path:', oldPath, newPath, err)
      throw err
    }
  })

  ipcMain.handle('fs:trash', async (_, itemPath: string) => {
    try {
      await shell.trashItem(itemPath)
      return true
    } catch (err) {
      console.error('Failed to move item to Trash:', itemPath, err)
      return false
    }
  })

  ipcMain.handle('fs:deletePermanent', async (_, itemPath: string) => {
    try {
      await rm(itemPath, { recursive: true, force: true })
      // If item was in a Trash 'files' directory, also clean up corresponding .trashinfo
      const dir = dirname(itemPath)
      const name = basename(itemPath)
      if (basename(dir) === 'files') {
        const trashRoot = dirname(dir)
        const infoPath = join(trashRoot, 'info', `${name}.trashinfo`)
        if (existsSync(infoPath)) {
          await unlink(infoPath).catch(() => {})
        }
      }
      return true
    } catch (err) {
      console.error('Failed to permanently delete:', itemPath, err)
      return false
    }
  })

  ipcMain.handle('fs:restoreFromTrash', async (_, itemPath: string) => {
    try {
      const dir = dirname(itemPath)
      const name = basename(itemPath)
      if (basename(dir) !== 'files') {
        return { success: false, error: 'Item is not in a trash files directory' }
      }
      const trashRoot = dirname(dir)
      const infoPath = join(trashRoot, 'info', `${name}.trashinfo`)
      if (!existsSync(infoPath)) {
        return { success: false, error: 'Trash info file not found' }
      }
      const infoContent = await readFile(infoPath, 'utf-8')
      const pathMatch = infoContent.match(/^Path=(.+)$/m)
      if (!pathMatch || !pathMatch[1]) {
        return { success: false, error: 'Original path not found in trash info' }
      }
      const originalPath = decodeURIComponent(pathMatch[1].trim())
      const targetDir = dirname(originalPath)
      await mkdir(targetDir, { recursive: true })
      await rename(itemPath, originalPath)
      await unlink(infoPath).catch(() => {})
      return { success: true, restoredPath: originalPath }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Failed to restore from trash:', itemPath, err)
      return { success: false, error: msg }
    }
  })

  ipcMain.handle('fs:emptyTrash', async (_, trashPath?: string) => {
    try {
      let root = trashPath
      if (root && basename(root) === 'files') {
        root = dirname(root)
      }
      if (!root) {
        const home = homedir()
        const dataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share')
        root = join(dataHome, 'Trash')
      }
      const filesDir = join(root, 'files')
      const infoDir = join(root, 'info')
      if (existsSync(filesDir)) {
        const entries = await readdir(filesDir)
        for (const e of entries) {
          await rm(join(filesDir, e), { recursive: true, force: true }).catch(() => {})
        }
      }
      if (existsSync(infoDir)) {
        const entries = await readdir(infoDir)
        for (const e of entries) {
          await rm(join(infoDir, e), { recursive: true, force: true }).catch(() => {})
        }
      }
      return true
    } catch (err) {
      console.error('Failed to empty trash:', err)
      return false
    }
  })

  // Copies keep symlinks as links, exactly as written (relative stays
  // relative). `dereference` copies what the links point at instead.
  ipcMain.handle(
    'fs:copy',
    async (_, srcPath: string, destPath: string, opts?: { dereference?: boolean }) => {
      try {
        // A single relative link copied to another folder: re-aim it so it
        // still points at the same target (inside copied trees, links stay
        // verbatim so the tree remains self-consistent).
        const own = await lstat(srcPath)
        if (own.isSymbolicLink() && opts?.dereference !== true) {
          const raw = await readlink(srcPath)
          const from = dirname(resolve(srcPath))
          const to = dirname(resolve(destPath))
          if (!isAbsolute(raw) && from !== to) {
            await symlink(relative(to, resolve(from, raw)) || '.', destPath)
            return true
          }
        }
        await cp(
          srcPath,
          destPath,
          opts?.dereference === true
            ? { recursive: true, dereference: true }
            : { recursive: true, verbatimSymlinks: true }
        )
        return true
      } catch (err) {
        console.error('Failed to copy path:', srcPath, destPath, err)
        throw err
      }
    }
  )

  /**
   * Create a symlink in `dir` pointing at `target`. Never replaces anything:
   * an existing name gets " link", " link 2"… Relative links (the default)
   * keep working when both move together; absolute ones survive moving the link.
   */
  ipcMain.handle(
    'fs:createSymlink',
    async (_, target: string, dir: string, opts?: { name?: string; absolute?: boolean }) => {
      const source = resolve(String(target))
      const folder = resolve(String(dir))
      await lstat(source) // the target must exist when making the link
      const base = basename(String(opts?.name || basename(source)))
      if (!base || base === '.' || base === '..') throw new Error('Invalid link name')
      const ext = extname(base)
      const stem = ext && ext !== base ? base.slice(0, -ext.length) : base
      const pointer = opts?.absolute ? source : relative(folder, source) || '.'
      for (let i = 0; i < 1000; i++) {
        const name = i === 0 ? base : `${stem} link${i > 1 ? ` ${i}` : ''}${ext}`
        const linkPath = join(folder, name)
        try {
          await symlink(pointer, linkPath)
          return linkPath
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
        }
      }
      throw new Error('Could not find a free name for the link')
    }
  )

  ipcMain.handle('shell:showItemInFolder', async (_, fullPath: string) => {
    shell.showItemInFolder(fullPath)
    return true
  })

  ipcMain.handle('shell:openPath', async (_, fullPath: string) => {
    const errorMsg = await shell.openPath(fullPath)
    if (errorMsg) {
      console.error('Failed to open path:', fullPath, errorMsg)
      return false
    }
    return true
  })
}
