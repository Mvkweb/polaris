import { ipcMain, shell } from 'electron'
import { extname, join, resolve } from 'path'
import { cp, lstat, mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises'
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
          isSymlink: entry.isSymbolicLink(),
          extension: entry.isDirectory() ? '' : extname(entry.name).toLowerCase().replace(/^\./, '')
        }))

      // Use lstat so metadata lookup does not follow symlinks.
      const withMeta = await Promise.all(
        mapped.map(async (e) => {
          try {
            const st = await lstat(e.path)
            return { ...e, modifiedTime: st.mtimeMs, size: e.isDirectory ? undefined : st.size }
          } catch {
            return e
          }
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
      await rename(oldPath, newPath)
      return true
    } catch (err) {
      console.error('Failed to rename path:', oldPath, newPath, err)
      throw err
    }
  })

  // If the OS Trash operation fails, this handler falls back to permanent deletion.
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

  ipcMain.handle('fs:copy', async (_, srcPath: string, destPath: string) => {
    try {
      await cp(srcPath, destPath, { recursive: true })
      return true
    } catch (err) {
      console.error('Failed to copy path:', srcPath, destPath, err)
      throw err
    }
  })

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
