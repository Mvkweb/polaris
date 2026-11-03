import { ipcMain, type WebContents } from 'electron'
import { spawn, type IPty } from 'node-pty'

interface TerminalSession {
  pty: IPty
  sender: WebContents
}

const sessions = new Map<number, TerminalSession>()
let nextId = 1

function getDefaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe'
  return process.env['SHELL'] || '/bin/bash'
}

function killSession(id: number): void {
  const session = sessions.get(id)
  if (!session) return
  sessions.delete(id)
  try {
    session.pty.kill()
  } catch (err) {
    console.error('Failed to kill terminal:', id, err)
  }
}

export function killAllTerminals(): void {
  for (const id of sessions.keys()) killSession(id)
}

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:create', (event, cwd?: string, cols = 80, rows = 24) => {
    const id = nextId++
    const sender = event.sender

    const pty = spawn(getDefaultShell(), [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwd || process.cwd(),
      env: process.env as Record<string, string>
    })

    sessions.set(id, { pty, sender })

    pty.onData((data) => {
      if (!sender.isDestroyed()) sender.send('terminal:data', id, data)
    })

    pty.onExit(({ exitCode }) => {
      sessions.delete(id)
      if (!sender.isDestroyed()) sender.send('terminal:exit', id, exitCode)
    })

    // Window reloaded or closed: do not leave an orphaned shell behind
    sender.once('destroyed', () => killSession(id))

    return id
  })

  ipcMain.handle('terminal:write', (_, id: number, data: string) => {
    sessions.get(id)?.pty.write(data)
  })

  ipcMain.handle('terminal:resize', (_, id: number, cols: number, rows: number) => {
    sessions.get(id)?.pty.resize(cols, rows)
  })

  ipcMain.handle('terminal:kill', (_, id: number) => {
    killSession(id)
  })
}
