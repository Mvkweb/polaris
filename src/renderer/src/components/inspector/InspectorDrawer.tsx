import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  Show
} from 'solid-js'
import type { JSX } from 'solid-js'
import {
  isInspectorOpen,
  closeInspector,
  inspectorTargetPath,
  inspectorWidth,
  setAndPersistInspectorWidth,
  setInspectorTargetPath,
  activeTabPath,
  selectedGridEntry,
  currentView,
  workspaceRoot,
  propertiesModalState,
  inspectorResizing,
  setInspectorResizing,
  setInspectorDragWidth,
  inspectorVisibleWidth,
  INSPECTOR_TRANSITION,
  openFileInEditor,
  navigateTo
} from '../../store'
import type { ExternalEditor, FileProperties } from '../../types'
import { installedEditors, preferredEditor, rememberEditor, BUILTIN_EDITOR_ID } from '../../editors'
import { EditorGlyph } from '../ui/EditorGlyph'
import {
  DitherDropdownMenu,
  DitherDropdownMenuContent,
  DitherDropdownMenuItem,
  DitherDropdownMenuLabel,
  DitherDropdownMenuSeparator,
  DitherDropdownMenuTrigger
} from '@/components/dithercn/dither-dropdown-menu'
import { MonodriveFolderIcon, MonodriveFileIcon } from '../browser/MonodriveIcons'
import { I } from '../ui/AppIcons'

// Bounded LRU cache so repeated selections render instantly without growing forever
const CACHE_LIMIT = 200
const fileDetailsCache = new Map<string, FileProperties>()
const cacheSet = (key: string, value: FileProperties): void => {
  fileDetailsCache.delete(key)
  fileDetailsCache.set(key, value)
  if (fileDetailsCache.size > CACHE_LIMIT) {
    const oldest = fileDetailsCache.keys().next().value
    if (oldest !== undefined) fileDetailsCache.delete(oldest)
  }
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.avif'])
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Below this width while dragging, releasing closes the drawer (mirrors the terminal). */
const CLOSE_THRESHOLD = 180

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

  const pad = (n: number) => n.toString().padStart(2, '0')
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const relative = isToday
    ? `Today at ${timeStr}`
    : `${MONTHS[d.getMonth()]} ${d.getDate()} at ${timeStr}`
  const exact = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${timeStr}`

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

const Row = (props: { label: string; title?: string; children: JSX.Element }): JSX.Element => (
  <div class="flex items-center justify-between gap-3 h-7 px-1.5 rounded-md hover:bg-white/[0.04] transition-colors">
    <span class="text-[13px] text-white/55 shrink-0">{props.label}</span>
    <span
      class="font-mono text-[11px] tabular-nums text-white/80 truncate text-right"
      title={props.title}
    >
      {props.children}
    </span>
  </div>
)

const Section = (props: { title: string; children: JSX.Element }): JSX.Element => (
  <section>
    <h3 class="px-1.5 pb-1 text-[13px] font-medium text-white/45">{props.title}</h3>
    {props.children}
  </section>
)

export const InspectorDrawer: Component = () => {
  const [data, setData] = createSignal<FileProperties | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const isResizing = inspectorResizing
  const setIsResizing = setInspectorResizing
  const setDragWidth = setInspectorDragWidth
  let asideRef: HTMLElement | undefined

  // A plain single click / tab switch replaces any explicit (context-menu) target.
  createEffect(
    on([selectedGridEntry, activeTabPath], () => setInspectorTargetPath(null), {
      defer: true
    })
  )

  // Explicit target > current selection (editor tab or grid item) > current folder
  const currentPath = createMemo(
    () =>
      inspectorTargetPath() ??
      (currentView() === 'editor' ? activeTabPath() : selectedGridEntry()) ??
      (workspaceRoot() || null)
  )

  // Load details whenever the target changes while open; drop stale responses.
  let requestId = 0
  createEffect(() => {
    const p = currentPath()
    if (!isInspectorOpen() || !p) return

    const id = ++requestId
    const cached = fileDetailsCache.get(p)
    setData(cached ?? null)
    setLoading(!cached)

    window.api
      ?.getFileProperties(p)
      .then((props) => {
        if (id !== requestId) return
        if (props) {
          cacheSet(p, props)
          setData(props)
        }
      })
      .catch((err) => console.error('Failed to load file details:', err))
      .finally(() => {
        if (id === requestId) setLoading(false)
      })
  })

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isInspectorOpen() || e.key !== 'Escape' || e.defaultPrevented) return
    if (propertiesModalState().isOpen) return // the modal on top owns Esc
    const el = document.activeElement
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
    if (el?.closest('.cm-editor, .xterm')) return
    e.preventDefault()
    closeInspector()
  }
  window.addEventListener('keydown', handleKeyDown)
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

  // Sideways twin of the terminal's drag handle: drag the left edge, release
  // below the threshold to close.
  const startResize = (e: PointerEvent): void => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = inspectorWidth()
    let current = startWidth

    const onMove = (ev: PointerEvent): void => {
      current = Math.max(0, startWidth + (startX - ev.clientX))
      setDragWidth(Math.min(480, current))
      if (current >= CLOSE_THRESHOLD) setAndPersistInspectorWidth(current)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      setIsResizing(false)
      setDragWidth(null)
      if (current < CLOSE_THRESHOLD) closeInspector()
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const editors = installedEditors
  const activeEditor = preferredEditor
  const activeEditorName = (): string => activeEditor()?.name ?? 'Polaris'

  const openWith = (editor: ExternalEditor | null): void => {
    const file = data()
    if (!file) return
    rememberEditor(editor?.id ?? BUILTIN_EDITOR_ID)
    if (editor) {
      void window.api?.openInEditor(editor.id, file.path)
    } else if (file.isDirectory) {
      navigateTo(file.path)
    } else {
      openFileInEditor(file.path, file.name)
    }
  }

  const handleCopyPath = (): void => {
    const p = data()?.path
    if (!p) return
    void navigator.clipboard.writeText(p)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  const handleOpenDefault = (): void => {
    const p = data()?.path
    if (p) void window.api?.openPath(p)
  }
  const handleReveal = (): void => {
    const p = data()?.path
    if (p) void window.api?.showItemInFolder(p)
  }

  // ── Derived display values ───────────────────────────────────────────────
  const isImage = createMemo(() => IMAGE_EXTS.has(data()?.extension?.toLowerCase() ?? ''))
  const kind = createMemo(() => {
    const d = data()
    return d ? formatKind(d) : ''
  })
  const size = createMemo(() => formatBytes(data()?.size ?? 0))
  const created = createMemo(() => formatDate(data()?.createdTime ?? 0))
  const modified = createMemo(() => formatDate(data()?.modifiedTime ?? 0))
  const volume = createMemo(() => {
    const d = data()
    if (!d) return ''
    if (d.volume) return d.volume
    if (d.path.startsWith('/home')) return 'Home'
    if (d.path.startsWith('/mnt/storage')) return 'Storage'
    return 'Root (/)'
  })


  return (
    <aside
      ref={(el) => (asideRef = el)}
      class="relative shrink-0 h-full overflow-hidden bg-[#050505] select-none"
      style={{
        width: `${inspectorVisibleWidth()}px`,
        transition: isResizing() ? 'none' : `width ${INSPECTOR_TRANSITION}`
      }}
      onTransitionEnd={(e) => {
        if (e.target === asideRef) window.dispatchEvent(new Event('resize'))
      }}
      aria-label="File details"
      aria-hidden={!isInspectorOpen()}
    >
      {/* Invisible drag handle on the left edge (terminal handle, rotated) */}
      <div
        class="absolute top-0 bottom-0 left-0 w-2 z-20 cursor-col-resize"
        onPointerDown={startResize}
      />

      {/* Fixed-width inner so content doesn't reflow while the drawer slides */}
      <div
        class="absolute top-0 bottom-0 left-0 flex flex-col pl-3 pr-0.5"
        style={{ width: `${inspectorWidth()}px` }}
      >
        <Show when={isInspectorOpen() || isResizing()}>
          {/* Header — same voice as the sidebar's section labels */}
          <div class="shrink-0 flex items-center justify-between h-8 px-1.5">
            <span class="text-[13px] font-medium text-white/45">details</span>
            <button
              type="button"
              onClick={closeInspector}
              class="w-6 h-6 -mr-1 rounded-md flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close details"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
              </svg>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-1 pb-3 space-y-5">
            <Show
              when={data()}
              fallback={
                <p class="px-1.5 pt-2 font-mono text-[11px] text-white/30">
                  {loading() ? 'loading…' : 'click a file to inspect it'}
                </p>
              }
            >
              {(file) => (
                <>
                  {/* Identity */}
                  <div class="flex items-center gap-3 px-1.5">
                    <div class="w-11 h-11 shrink-0 rounded-[10px] bg-white/[0.04] flex items-center justify-center overflow-hidden">
                      <Show
                        when={isImage()}
                        fallback={
                          <Show
                            when={file().isDirectory}
                            fallback={<MonodriveFileIcon name={file().name} class="w-7 h-7" />}
                          >
                            <MonodriveFolderIcon class="w-7 h-7" />
                          </Show>
                        }
                      >
                        <img
                          src={`polaris-media://${encodeURI(file().path)}`}
                          alt=""
                          class="w-full h-full object-cover"
                          decoding="async"
                        />
                      </Show>
                    </div>
                    <div class="min-w-0">
                      <h2
                        class="text-[13px] font-semibold text-white/85 leading-snug truncate"
                        title={file().name}
                      >
                        {file().name}
                      </h2>
                      <p class="font-mono text-[11px] text-white/40 truncate">
                        {size().human} · {kind()}
                      </p>
                    </div>
                  </div>

                  <Section title="info">
                    <Row label="Size" title={size().exact}>
                      {size().human}
                    </Row>
                    <Row label="Kind" title={file().mime || kind()}>
                      {kind()}
                    </Row>
                    <Show when={file().imageDimensions}>
                      {(dims) => (
                        <Row label="Dimensions">
                          {dims().width} × {dims().height}
                        </Row>
                      )}
                    </Show>
                    <Show when={file().itemCount !== undefined}>
                      <Row label="Contents">{file().itemCount} items</Row>
                    </Show>
                  </Section>

                  <Section title="dates">
                    <Row label="Created" title={created().exact}>
                      {created().relative}
                    </Row>
                    <Row label="Modified" title={modified().exact}>
                      {modified().relative}
                    </Row>
                  </Section>

                  <Section title="storage">
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      class="w-full flex items-center justify-between gap-3 h-7 px-1.5 rounded-md hover:bg-white/[0.04] transition-colors cursor-pointer"
                      title={`${file().path}\nClick to copy`}
                    >
                      <span class="text-[13px] text-white/55 shrink-0">Where</span>
                      <span class="font-mono text-[11px] text-white/80 truncate text-right">
                        {copied() ? 'copied' : truncateMiddle(file().path, 30)}
                      </span>
                    </button>
                    <Row label="Volume">{volume()}</Row>
                    <Row label="Permissions">{formatPermissions(file().permissions)}</Row>
                    <Show when={file().owner}>
                      <Row label="Owner">{file().owner}</Row>
                    </Show>
                    <Show when={file().isSymbolicLink && file().realPath}>
                      <Row label="Target" title={file().realPath}>
                        {truncateMiddle(file().realPath || '', 26)}
                      </Row>
                    </Show>
                  </Section>
                </>
              )}
            </Show>
          </div>

          {/* Footer: default-app open + "Open in <editor>" split button */}
          <Show when={data()}>
            <div class="shrink-0 flex items-center gap-1.5 pb-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenDefault}
                class="h-8 px-3 rounded-md text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Open with the default app"
              >
                Open
              </button>

              <div class="polaris-accent-fill flex-1 min-w-0 flex items-stretch h-8 rounded-md overflow-hidden transition-colors">
                <button
                  type="button"
                  onClick={() => openWith(activeEditor())}
                  class="polaris-accent-fill-hover flex-1 min-w-0 flex items-center justify-center gap-2 px-2.5 text-[13px] font-medium transition-colors cursor-pointer"
                  title={`Open in ${activeEditorName()}`}
                >
                  <EditorGlyph editor={activeEditor()} />
                  <span class="truncate">Open in {activeEditorName()}</span>
                </button>

                <DitherDropdownMenu
                  variant="dither"
                  menuVariant="card"
                  side="top"
                  align="end"
                  sideOffset={6}
                >
                  <DitherDropdownMenuTrigger
                    class="w-7 shrink-0 flex items-center justify-center polaris-accent-fill-hover border-l border-black/40 opacity-75 hover:opacity-100 transition-[opacity,background-color] cursor-pointer"
                    aria-label="Choose editor"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </DitherDropdownMenuTrigger>
                  <DitherDropdownMenuContent class="min-w-[200px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
                    <DitherDropdownMenuLabel>Open in</DitherDropdownMenuLabel>
                    <For each={editors()}>
                      {(editor) => (
                        <DitherDropdownMenuItem variant="dither" onSelect={() => openWith(editor)}>
                          <EditorGlyph editor={editor} />
                          <span>{editor.name}</span>
                        </DitherDropdownMenuItem>
                      )}
                    </For>
                    <DitherDropdownMenuItem variant="dither" onSelect={() => openWith(null)}>
                      <EditorGlyph editor={null} />
                      <span>Polaris</span>
                      <span class="ml-auto text-[10.5px] font-mono text-white/35">built-in</span>
                    </DitherDropdownMenuItem>
                    <DitherDropdownMenuSeparator />
                    <DitherDropdownMenuItem variant="dither" onSelect={handleReveal}>
                      <I.folder class="w-4 h-4 text-white/70 shrink-0" />
                      <span>Show in Files</span>
                    </DitherDropdownMenuItem>
                    <DitherDropdownMenuItem variant="dither" onSelect={handleCopyPath}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        class="w-4 h-4 text-white/70 shrink-0"
                        stroke="currentColor"
                        stroke-width="1.8"
                      >
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                      <span>Copy path</span>
                    </DitherDropdownMenuItem>
                  </DitherDropdownMenuContent>
                </DitherDropdownMenu>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </aside>
  )
}
