import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { app } from 'electron'

export interface SearchResult {
  name: string
  path: string
  relativePath: string
  score?: number
}

export interface TextMatch {
  file: string
  path: string
  line: number
  column: number
  line_text: string
}

export interface TextSearchResult {
  matches: TextMatch[]
  total_matches: number
  files_searched: number
  elapsed_ms: number
}

export interface TextSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  maxResults?: number
}

export interface StorageItem {
  id: string
  label: string
  value: number
  color: string
  fill?: string
  detail: string
  isFree?: boolean
  /** True when the scan budget cut this bucket short, so `value` is a floor. */
  partial?: boolean
}

export interface StorageBreakdownResult {
  target: string
  capacity_gb: number
  used_gb: number
  free_gb: number
  items: StorageItem[]
}

interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: NodeJS.Timeout
}

export class EmberCoreClient {
  private process: ChildProcess | null = null
  private lineBuffer = ''
  private nextRequestId = 1
  private pendingRequests = new Map<number, PendingRequest>()
  private isShuttingDown = false
  private binaryPath: string | null = null
  private lastIndexedRoot: string | null = null
  private respawnTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.binaryPath = this.resolveBinaryPath()
  }

  private resolveBinaryPath(): string | null {
    const isWin = process.platform === 'win32'
    const exeNames = isWin ? ['polaris-core.exe', 'ember-core.exe'] : ['polaris-core', 'ember-core']

    const candidates: string[] = []
    for (const exeName of exeNames) {
      candidates.push(
        join(process.resourcesPath || '', 'bin', exeName),
        // installed package: /usr/lib/polaris-fm/app/bin
        resolve(app.getAppPath(), 'bin', exeName),
        resolve(app.getAppPath(), 'core', 'zig-out', 'bin', exeName),
        resolve(process.cwd(), 'core', 'zig-out', 'bin', exeName),
        resolve(process.cwd(), '..', 'core', 'zig-out', 'bin', exeName)
      )
    }

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
      console.warn('[EmberCore] Zig sidecar binary not found. Search fallback enabled.')
      return false
    }

    try {
      this.isShuttingDown = false
      const proc = spawn(this.binaryPath!, [], {
        stdio: ['pipe', 'pipe', 'inherit'],
        windowsHide: true
      })

      console.log(`[EmberCore] Native Zig sidecar spawned (PID: ${proc.pid})`)

      proc.stdout?.setEncoding('utf8')
      proc.stdout?.on('data', (chunk: string) => this.handleData(chunk))

      proc.on('exit', (code, signal) => {
        console.warn(`[EmberCore] Sidecar exited with code ${code}, signal ${signal}`)
        this.cleanupProcess()

        // Auto-restart if unexpected crash
        if (!this.isShuttingDown && !this.respawnTimeout) {
          this.respawnTimeout = setTimeout(() => {
            this.respawnTimeout = null
            console.log('[EmberCore] Attempting to restart sidecar...')
            if (this.start() && this.lastIndexedRoot) {
              this.index(this.lastIndexedRoot).catch((err) =>
                console.error('[EmberCore] Failed to re-index after restart:', err)
              )
            }
          }, 1500)
        }
      })

      proc.on('error', (err) => {
        console.error('[EmberCore] Process error:', err)
      })

      this.process = proc
      return true
    } catch (err) {
      console.error('[EmberCore] Failed to spawn sidecar binary:', err)
      return false
    }
  }

  private handleData(chunk: string): void {
    this.lineBuffer += chunk
    let newlineIndex: number

    while ((newlineIndex = this.lineBuffer.indexOf('\n')) !== -1) {
      const line = this.lineBuffer.slice(0, newlineIndex).trim()
      this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1)

      if (line.length > 0) {
        this.dispatchResponse(line)
      }
    }
  }

  private dispatchResponse(line: string): void {
    try {
      const msg = JSON.parse(line)
      if (typeof msg.id === 'number') {
        const pending = this.pendingRequests.get(msg.id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(msg.id)

          if (msg.error) {
            pending.reject(new Error(msg.error))
          } else {
            pending.resolve(msg.result)
          }
        }
      }
    } catch (err) {
      console.error('[EmberCore] Failed to parse JSON response:', line, err)
    }
  }

  private request<T>(method: string, params?: Record<string, any>, timeoutMs = 8000): Promise<T> {
    if (!this.process && !this.start()) {
      return Promise.reject(new Error('EmberCore process is not running'))
    }

    return new Promise((res, rej) => {
      const id = this.nextRequestId++
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        rej(new Error(`EmberCore request ${method} (id=${id}) timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve: res, reject: rej, timer })

      const payload = JSON.stringify({ id, method, params }) + '\n'
      this.process?.stdin?.write(payload, (err) => {
        if (err) {
          clearTimeout(timer)
          this.pendingRequests.delete(id)
          rej(err)
        }
      })
    })
  }

  public async ping(): Promise<{ status: string; version: string }> {
    return this.request('ping', undefined, 3000)
  }

  public async index(
    root: string,
    files?: string[]
  ): Promise<{ indexed_count: number; elapsed_ms: number }> {
    this.lastIndexedRoot = root
    const params: { root: string; files?: string[] } = { root }
    if (files && files.length > 0) {
      params.files = files
    }
    const res = await this.request<{
      indexed_count: number
      elapsed_ms: number
    }>('index', params, 15000)
    console.log(`[EmberCore] Indexed ${res.indexed_count} files in ${res.elapsed_ms}ms (${root})`)
    return res
  }

  public async search(query: string, limit = 60): Promise<SearchResult[]> {
    return this.request('search', { query, limit }, 5000)
  }

  public async searchText(
    query: string,
    options: TextSearchOptions = {}
  ): Promise<TextSearchResult> {
    return this.request(
      'search_text',
      {
        query,
        case_sensitive: options.caseSensitive ?? false,
        whole_word: options.wholeWord ?? false,
        max_results: options.maxResults ?? 200
      },
      15000
    )
  }

  public getStorageBreakdown(path: string): Promise<StorageBreakdownResult> {
    return this.request('storage_breakdown', { path }, 60000)
  }

  public stop(): void {
    this.isShuttingDown = true
    if (this.respawnTimeout) {
      clearTimeout(this.respawnTimeout)
      this.respawnTimeout = null
    }

    if (this.process) {
      try {
        this.process.stdin?.write(JSON.stringify({ method: 'exit' }) + '\n')
      } catch {
        // Ignored
      }

      setTimeout(() => {
        if (this.process) {
          this.process.kill()
          this.cleanupProcess()
        }
      }, 300)
    }
  }

  private cleanupProcess(): void {
    this.process = null
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer)
      req.reject(new Error('EmberCore process exited'))
    }
    this.pendingRequests.clear()
  }
}

export const emberCore = new EmberCoreClient()
