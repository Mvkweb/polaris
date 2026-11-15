import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show
} from 'solid-js'
import {
  isInspectorOpen,
  closeInspector,
  inspectorTargetPath,
  inspectorWidth,
  setAndPersistInspectorWidth,
  activeTabPath,
  selectedFilePath
} from '../../store'
import type { FileProperties } from '../../types'
import {
  MonodriveFolderIcon,
  MonodriveFileIcon
} from '../browser/MonodriveIcons'
import {
  SolarInfoCircleLinear,
  SolarFolderLinear
} from '../ui/SolarIcons'

// In-memory cache for ultra-fast, zero-latency reopening (<1ms)
const fileDetailsCache = new Map<string, FileProperties>()

function formatBytes(bytes: number): { human: string; exact: string } {
  if (bytes === 0) return { human: '0 B', exact: '0 bytes' }
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))
  return {
    human: `${val} ${sizes[i]}`,
    exact: `${bytes.toLocaleString()} bytes`
  }
}

function formatDate(ms: number): { relative: string; exact: string } {
  if (!ms) return { relative: '—', exact: '—' }
  const d = new Date(ms)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const pad = (n: number) => n.toString().padStart(2, '0')
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const relative = isToday ? `Today at ${timeStr}` : `${months[d.getMonth()]} ${d.getDate()} at ${timeStr}`
  const exact = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${timeStr}`

  return { relative, exact }
}

function formatKind(props: FileProperties): string {
  if (props.isDirectory) {
    return props.itemCount !== undefined ? `Folder (${props.itemCount} items)` : 'Folder'
  }
  const ext = (props.extension || '').replace('.', '').toUpperCase()
  if (props.mime?.startsWith('image/')) return `${ext || 'Image'} image`
  if (props.mime?.startsWith('video/')) return `${ext || 'Video'} video`
  if (props.mime?.startsWith('audio/')) return `${ext || 'Audio'} audio`
  if (ext === 'TS' || ext === 'TSX') return 'TypeScript'
  if (ext === 'JS' || ext === 'JSX') return 'JavaScript'
  if (ext === 'JSON') return 'JSON Document'
  if (ext === 'ZIG') return 'Zig Source'
  if (ext === 'RS') return 'Rust Source'
  if (ext === 'PY') return 'Python Script'
  if (ext === 'MD') return 'Markdown Document'
  if (ext) return `${ext} file`
  return 'Document'
}

function formatPermissions(perm: string): string {
  const mode = parseInt(perm, 8) || 0
  const writable = Boolean(mode & 0o200)
  const readable = Boolean(mode & 0o400)
  const executable = Boolean(mode & 0o100)

  let label = 'Read only'
  if (readable && writable && executable) label = 'Read, Write & Execute'
  else if (readable && writable) label = 'Read & Write'
  else if (readable) label = 'Read only'
  else if (writable) label = 'Write only'

  return `${label} (${perm.slice(-3)})`
}

function truncateMiddle(str: string, maxLen = 32): string {
  if (str.length <= maxLen) return str
  const half = Math.floor((maxLen - 3) / 2)
  return `${str.slice(0, half)}...${str.slice(-half)}`
}

export const InspectorDrawer: Component = () => {
  const [data, setData] = createSignal<FileProperties | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [isResizing, setIsResizing] = createSignal(false)

  // Determine target path: explicit target > active tab > selected grid file
  const currentPath = createMemo(() => {
    return inspectorTargetPath() ?? activeTabPath() ?? selectedFilePath() ?? null
  })

  // Load file details whenever target path changes or drawer opens
  createEffect(() => {
    const p = currentPath()
    const open = isInspectorOpen()
    if (!open || !p) {
      if (!open) setData(null)
      return
    }

    // Warm cache fast-path (<1ms)
    const cached = fileDetailsCache.get(p)
    if (cached) {
      setData(cached)
    } else {
      setLoading(true)
    }

    // Fetch fresh properties
    window.api
      ?.getFileProperties(p)
      .then((props) => {
        if (props) {
          fileDetailsCache.set(p, props)
          setData(props)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load file details:', err)
        setLoading(false)
      })
  })

  // Keyboard shortcut: Escape to close drawer
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isInspectorOpen()) return
    if (e.key === 'Escape' && !e.defaultPrevented) {
      const activeEl = document.activeElement
      const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement
      const isCode = activeEl?.closest('.cm-editor')
      if (!isInput && !isCode) {
        e.preventDefault()
        closeInspector()
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

  // Horizontal drawer resize drag handling
  const startResize = (e: PointerEvent): void => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = inspectorWidth()

    const onPointerMove = (moveEv: PointerEvent): void => {
      const deltaX = startX - moveEv.clientX
      setAndPersistInspectorWidth(startWidth + deltaX)
    }

    const onPointerUp = (): void => {
      setIsResizing(false)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const handleCopyPath = (): void => {
    const p = data()?.path
    if (p) {
      navigator.clipboard.writeText(p)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleOpen = (): void => {
    const p = data()?.path
    if (p) window.api?.openPath(p)
  }

  const handleReveal = (): void => {
    const p = data()?.path
    if (p) window.api?.showItemInFolder(p)
  }

  const isImage = createMemo(() => {
    const ext = data()?.extension?.toLowerCase()
    return Boolean(
      ext && ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.avif'].includes(ext)
    )
  })

  return (
    <aside
      class="relative shrink-0 flex flex-col h-full bg-[#0a0a0a] border-l border-white/[0.06] overflow-hidden select-none"
      style={{
        width: isInspectorOpen() ? `${inspectorWidth()}px` : '0px',
        transition: isResizing() ? 'none' : 'width 220ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      aria-label="File details"
      role="complementary"
    >
      {/* Left-edge horizontal resize handle */}
      <div
        class="absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-white/[0.18] active:bg-white/[0.28] transition-colors z-30"
        onPointerDown={startResize}
        title="Drag to resize panel"
      />

      <Show when={isInspectorOpen()}>
        <div class="flex-1 flex flex-col h-full min-w-[280px] overflow-hidden">
          {/* Header */}
          <div class="shrink-0 flex items-center justify-between h-10 px-4 border-b border-white/[0.04]">
            <span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
              Details
            </span>
            <button
              type="button"
              onClick={closeInspector}
              class="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close details"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
            <Show
              when={data()}
              fallback={
                <div class="flex flex-col items-center justify-center h-48 text-center text-white/30">
                  <SolarInfoCircleLinear class="w-8 h-8 mb-2 opacity-40" />
                  <p class="text-[12px] font-medium text-white/50">No item selected</p>
                  <p class="text-[11px] text-white/30 mt-0.5">Select a file or tab to inspect</p>
                </div>
              }
            >
              {(file) => (
                <div class={`space-y-4 transition-opacity duration-150 ${loading() ? 'opacity-60' : 'opacity-100'}`}>
                  {/* Hero Preview Card (Monodrive Reference Style) */}
                  <div class="flex flex-col items-center text-center pt-1 pb-2">
                    <div class="relative w-24 h-24 rounded-[20px] bg-white/[0.03] ring-1 ring-white/[0.08] shadow-xl flex items-center justify-center overflow-hidden p-2 mb-3">
                      <Show
                        when={isImage()}
                        fallback={
                          <Show
                            when={file().isDirectory}
                            fallback={<MonodriveFileIcon name={file().name} class="w-14 h-14" />}
                          >
                            <MonodriveFolderIcon class="w-14 h-14" />
                          </Show>
                        }
                      >
                        <img
                          src={`polaris-media://${encodeURI(file().path)}`}
                          alt={file().name}
                          class="w-full h-full object-contain rounded-[14px]"
                          loading="eager"
                        />
                      </Show>
                    </div>

                    <h2 class="text-[14px] font-semibold text-white/90 break-all px-2 leading-tight">
                      {file().name}
                    </h2>
                    <p class="text-[11.5px] text-white/40 mt-1">
                      {formatKind(file())}
                    </p>
                  </div>

                  {/* Section 1: Details */}
                  <div class="rounded-[14px] bg-white/[0.025] p-3 space-y-2">
                    <div class="flex items-center gap-1.5 text-white/40 mb-1">
                      <SolarInfoCircleLinear class="w-3.5 h-3.5 opacity-60" />
                      <span class="text-[10.5px] font-semibold uppercase tracking-[0.08em]">Details</span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Size</span>
                      <span class="text-white/80 font-mono text-[11.5px] tabular-nums" title={formatBytes(file().size).exact}>
                        {formatBytes(file().size).human}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Kind</span>
                      <span class="text-white/80 truncate max-w-[170px]" title={file().mime || formatKind(file())}>
                        {formatKind(file())}
                      </span>
                    </div>

                    <Show when={file().imageDimensions}>
                      {(dims) => (
                        <div class="flex items-center justify-between text-[11.5px]">
                          <span class="text-white/40">Dimensions</span>
                          <span class="text-white/80 font-mono text-[11.5px] tabular-nums">
                            {dims().width} × {dims().height} px
                          </span>
                        </div>
                      )}
                    </Show>

                    <Show when={file().itemCount !== undefined}>
                      <div class="flex items-center justify-between text-[11.5px]">
                        <span class="text-white/40">Contents</span>
                        <span class="text-white/80 font-mono text-[11.5px] tabular-nums">
                          {file().itemCount} items
                        </span>
                      </div>
                    </Show>
                  </div>

                  {/* Section 2: Dates */}
                  <div class="rounded-[14px] bg-white/[0.025] p-3 space-y-2">
                    <div class="flex items-center gap-1.5 text-white/40 mb-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="opacity-60">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span class="text-[10.5px] font-semibold uppercase tracking-[0.08em]">Dates</span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Created</span>
                      <span class="text-white/80 text-right truncate max-w-[180px]" title={formatDate(file().createdTime).exact}>
                        {formatDate(file().createdTime).relative}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Modified</span>
                      <span class="text-white/80 text-right truncate max-w-[180px]" title={formatDate(file().modifiedTime).exact}>
                        {formatDate(file().modifiedTime).relative}
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Storage */}
                  <div class="rounded-[14px] bg-white/[0.025] p-3 space-y-2">
                    <div class="flex items-center gap-1.5 text-white/40 mb-1">
                      <SolarFolderLinear class="w-3.5 h-3.5 opacity-60" />
                      <span class="text-[10.5px] font-semibold uppercase tracking-[0.08em]">Storage</span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Where</span>
                      <button
                        type="button"
                        onClick={handleCopyPath}
                        class="text-white/70 hover:text-white font-mono text-[11px] truncate max-w-[180px] text-right cursor-pointer"
                        title="Click to copy full path"
                      >
                        {truncateMiddle(file().path, 28)}
                      </button>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Volume</span>
                      <span class="text-white/80">
                        {file().path.startsWith('/home') ? 'Home' : file().path.startsWith('/mnt/storage') ? 'Storage' : 'Root (/)'}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[11.5px]">
                      <span class="text-white/40">Permissions</span>
                      <span class="text-white/80 font-mono text-[11px]">
                        {formatPermissions(file().permissions)}
                      </span>
                    </div>

                    <Show when={file().owner}>
                      <div class="flex items-center justify-between text-[11.5px]">
                        <span class="text-white/40">Owner</span>
                        <span class="text-white/80">
                          {file().owner}
                        </span>
                      </div>
                    </Show>

                    <Show when={file().isSymbolicLink && file().realPath}>
                      <div class="flex items-center justify-between text-[11.5px]">
                        <span class="text-white/40">Target</span>
                        <span class="text-white/70 font-mono text-[10.5px] truncate max-w-[180px]" title={file().realPath}>
                          {truncateMiddle(file().realPath || '', 24)}
                        </span>
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </div>

          {/* Footer Quick Actions */}
          <Show when={data()}>
            <div class="shrink-0 flex items-center justify-between gap-2 p-3 border-t border-white/[0.04] bg-[#0c0a0d]/60">
              <button
                type="button"
                onClick={handleOpen}
                class="flex-1 h-8 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.12] text-white/90 text-[11.5px] font-medium transition-colors cursor-pointer"
              >
                Open
              </button>
              <button
                type="button"
                onClick={handleReveal}
                class="flex-1 h-8 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-[11.5px] font-medium transition-colors cursor-pointer"
              >
                Reveal
              </button>
              <button
                type="button"
                onClick={handleCopyPath}
                class="h-8 px-2.5 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-[11.5px] font-medium transition-colors cursor-pointer"
                title="Copy full path"
              >
                {copied() ? 'Copied' : 'Copy'}
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </aside>
  )
}
