import { ipcMain } from 'electron'
import { resolve } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { startDir } from './launch'

const execFileAsync = promisify(execFile)

export const getGitFiles = async (cwd: string): Promise<string[] | null> => {
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

export function registerGitIpc(): void {
  ipcMain.handle('git:getLog', async (_, repoPath?: string, maxCount = 30) => {
    try {
      const cwd = resolve(repoPath || startDir)
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

  ipcMain.handle('git:getStatus', async (_, repoPath?: string) => {
    try {
      const cwd = resolve(repoPath || startDir)
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

  ipcMain.handle('git:getCommitDiff', async (_, hash: string, repoPath?: string) => {
    try {
      const cwd = resolve(repoPath || startDir)
      const { stdout } = await execFileAsync('git', ['show', '--stat', '--patch', hash], { cwd })
      return stdout
    } catch (err) {
      console.warn('git:getCommitDiff error:', err)
      return ''
    }
  })
}
