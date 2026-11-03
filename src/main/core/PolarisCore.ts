import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { app } from 'electron'

export interface DriveEntry {
  name: string
  path: string
  fs_type: string
  is_removable: boolean
}

export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified_ms: number
  extension: string
}

export interface ScanDirResult {
  path: string
  entries: FileEntry[]
  total_count: number
  elapsed_ms: number
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: NodeJS.Timeout
}

export class PolarisCoreClient {
  private process: ChildProcess | null = null
  private lineBuffer = ''
  private nextRequestId = 1
  private pendingRequests = new Map<number, PendingRequest>()
  private isShuttingDown = false
  private binaryPath: string | null = null

  constructor() {
    this.binaryPath = this.resolveBinaryPath()
  }

  private resolveBinaryPath(): string | null {
    const isWin = process.platform === 'win32'
    const exeName = isWin ? 'polaris-core.exe' : 'polaris-core'

    const candidates = [
      join(process.resourcesPath || '', 'bin', exeName),
      resolve(app.getAppPath(), 'core', 'zig-out', 'bin', exeName),
      resolve(process.cwd(), 'core', 'zig-out', 'bin', exeName),
      resolve(process.cwd(), '..', 'core', 'zig-out', 'bin', exeName)
    ]

    for (const p of candidates) {
      if (existsSync(p)) {
        return p
      }
    }
    return null
  }

  public isAvailable(): boolean {
    if (!this.binaryPath) {
      this.binaryPath = this.resolveBinaryPath()
    }
    return Boolean(this.binaryPath && existsSync(this.binaryPath))
  }

  public isRunning(): boolean {
    return Boolean(this.process && !this.process.killed)
  }

  public start(): boolean {
    if (this.process) return true
    if (!this.isAvailable()) {
      console.warn('[PolarisCore] Zig sidecar binary not found. Fallback enabled.')
      return false
    }

    try {
      this.isShuttingDown = false
      const proc = spawn(this.binaryPath!, [], {
        stdio: ['pipe', 'pipe', 'inherit'],
        windowsHide: true
      })

      this.process = proc

      proc.stdout?.on('data', (chunk: Buffer) => {
        this.lineBuffer += chunk.toString('utf8')
        let newlineIndex = this.lineBuffer.indexOf('\n')
        while (newlineIndex !== -1) {
          const line = this.lineBuffer.slice(0, newlineIndex).trim()
          this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1)
          if (line) {
            this.handleLine(line)
          }
          newlineIndex = this.lineBuffer.indexOf('\n')
        }
      })

      proc.on('error', (err) => {
        console.error('[PolarisCore] Process error:', err)
      })

      proc.on('exit', (code, signal) => {
        this.process = null
        if (!this.isShuttingDown) {
          console.warn(`[PolarisCore] Exited unexpectedly (code ${code}, signal ${signal}).`)
        }
        for (const [id, req] of this.pendingRequests.entries()) {
          clearTimeout(req.timer)
          req.reject(new Error('Core process exited'))
          this.pendingRequests.delete(id)
        }
      })

      return true
    } catch (err) {
      console.error('[PolarisCore] Failed to spawn sidecar:', err)
      return false
    }
  }

  public stop(): void {
    this.isShuttingDown = true
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer)
      req.reject(new Error('Core shutting down'))
      this.pendingRequests.delete(id)
    }
  }

  private handleLine(line: string): void {
    let msg: any
    try {
      msg = JSON.parse(line)
    } catch {
      return
    }

    if (typeof msg.id !== 'number') return
    const pending = this.pendingRequests.get(msg.id)
    if (!pending) return

    clearTimeout(pending.timer)
    this.pendingRequests.delete(msg.id)

    if (msg.error) {
      pending.reject(new Error(typeof msg.error === 'string' ? msg.error : msg.error.message || 'Core error'))
    } else {
      pending.resolve(msg.result)
    }
  }

  private request<T>(method: string, params?: Record<string, any>, timeoutMs = 8000): Promise<T> {
    if (!this.isRunning() && !this.start()) {
      return Promise.reject(new Error('Core unavailable'))
    }

    const id = this.nextRequestId++
    const payload = JSON.stringify({ id, method, params }) + '\n'

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Core request timeout (${method})`))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timer })
      try {
        this.process?.stdin?.write(payload)
      } catch (err) {
        clearTimeout(timer)
        this.pendingRequests.delete(id)
        reject(err)
      }
    })
  }

  public ping(): Promise<{ status: string; version: string; engine: string }> {
    return this.request('ping')
  }

  public getDrives(): Promise<DriveEntry[]> {
    return this.request('get_drives')
  }

  public scanDir(path: string): Promise<ScanDirResult> {
    return this.request('scan_dir', { path })
  }
}

export const polarisCore = new PolarisCoreClient()
