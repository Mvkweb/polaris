import { ipcMain } from 'electron'
import { readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { emberCore } from './core/EmberCore'
import { getGitFiles } from './git'
import { startDir } from './launch'

export function registerSearchIpc(): void {
  ipcMain.handle('fs:indexWorkspace', async (_, rootPath?: string) => {
    const target = resolve(rootPath || startDir)
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

  ipcMain.handle('core:status', async () => {
    return {
      available: emberCore.isAvailable(),
      running: emberCore.isRunning()
    }
  })

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

  ipcMain.handle('fs:searchFiles', async (_, query: string, rootPath?: string) => {
    if (!query || !query.trim()) return []
    const trimmed = query.trim()
    const targetDir = resolve(rootPath || startDir)

    if (emberCore.isAvailable()) {
      try {
        if (emberCore.getLastIndexedRoot() !== targetDir) {
          const gitFiles = await getGitFiles(targetDir)
          await emberCore.index(targetDir, gitFiles ?? undefined)
        }
        return await emberCore.search(trimmed, 60)
      } catch (err) {
        console.warn('[EmberCore] Sidecar search failed, using fallback:', err)
      }
    }

    const results: Array<{ name: string; path: string; relativePath: string; isDirectory?: boolean }> = []
    const IGNORED = new Set([
      '.git',
      'node_modules',
      'out',
      'dist',
      'build',
      '.cache',
      'target',
      '.zig-cache',
      'zig-out',
      '.next',
      '.turbo'
    ])
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

        const matches =
          entry.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          entryRel.toLowerCase().includes(trimmed.toLowerCase())

        if (matches) {
          results.push({
            name: entry.name,
            path: entryFull,
            relativePath: entryRel,
            isDirectory: entry.isDirectory()
          })
        }

        if (entry.isDirectory()) {
          queue.push({ dir: entryFull, rel: entryRel })
        }
      }
    }

    return results
  })
}
