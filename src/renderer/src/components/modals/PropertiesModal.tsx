import { Component, createEffect, createSignal, onCleanup, Show } from 'solid-js'
import { propertiesModalState, closePropertiesModal } from '../../store'
import { FileIcon } from '../file-tree/FileIcon'
import type { FileProperties } from '../../types'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))
  return `${val} ${sizes[i]} (${bytes.toLocaleString()} bytes)`
}

function formatPermissions(octal: string): string {
  const mode = parseInt(octal, 8)
  const perms = [
    mode & 0o400 ? 'r' : '-',
    mode & 0o200 ? 'w' : '-',
    mode & 0o100 ? 'x' : '-',
    mode & 0o040 ? 'r' : '-',
    mode & 0o020 ? 'w' : '-',
    mode & 0o010 ? 'x' : '-',
    mode & 0o004 ? 'r' : '-',
    mode & 0o002 ? 'w' : '-',
    mode & 0o001 ? 'x' : '-'
  ].join('')
  return `${octal} (${perms})`
}

function formatDate(ms: number): string {
  if (!ms) return 'Unknown'
  const d = new Date(ms)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getFileDescription(name: string, isDirectory: boolean): string {
  if (isDirectory) return 'Folder / Directory'
  const dot = name.lastIndexOf('.')
  if (dot === -1 || dot === 0) return 'File'
  const ext = name.slice(dot + 1).toLowerCase()
  const map: Record<string, string> = {
    ts: 'TypeScript Source File',
    tsx: 'TypeScript JSX Component',
    js: 'JavaScript Source File',
    jsx: 'JavaScript JSX Component',
    json: 'JSON Document',
    md: 'Markdown Document',
    zig: 'Zig Source File',
    zon: 'Zig Object Notation',
    rs: 'Rust Source File',
    html: 'HTML Document',
    css: 'Cascading Style Sheet',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    svg: 'Scalable Vector Graphics',
    webp: 'WebP Image',
    gif: 'GIF Image',
    sh: 'Shell Script',
    toml: 'TOML Document',
    yaml: 'YAML Document',
    yml: 'YAML Document',
    lock: 'Lockfile',
    txt: 'Plain Text Document'
  }
  return map[ext] ? `${map[ext]} (.${ext})` : `.${ext.toUpperCase()} File`
}

export const PropertiesModal: Component = () => {
  const [data, setData] = createSignal<FileProperties | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [copied, setCopied] = createSignal(false)

  createEffect(() => {
    const st = propertiesModalState()
    if (!st.isOpen || !st.targetPath) {
      setData(null)
      return
    }

    setLoading(true)
    setCopied(false)
    window.api
      ?.getFileProperties(st.targetPath)
      .then((props) => {
        setData(props)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load file properties:', err)
        setLoading(false)
      })
  })

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!propertiesModalState().isOpen) return
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault()
      closePropertiesModal()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const copyPath = async (): Promise<void> => {
    const p = data()?.path
    if (p) {
      await navigator.clipboard.writeText(p)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  const openInDefaultApp = (): void => {
    const p = data()?.path
    if (p && window.api?.openPath) {
      window.api.openPath(p)
      closePropertiesModal()
    }
  }

  return (
    <Show when={propertiesModalState().isOpen}>
      <div
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 backdrop-blur-sm select-none animate-[fadeIn_100ms_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePropertiesModal()
        }}
      >
        <div class="w-[480px] max-w-[92vw] bg-[#0c0c0e]/98 backdrop-blur-2xl rounded-2xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.09),inset_0_1px_0_0_rgba(255,255,255,0.08),0_24px_48px_-12px_rgba(0,0,0,0.9)] flex flex-col gap-5 text-white/90 font-sans">
          {/* Header */}
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                <FileIcon
                  name={data()?.name || propertiesModalState().targetPath}
                  isDirectory={Boolean(data()?.isDirectory)}
                  class="w-6 h-6"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-[15px] font-semibold text-white truncate tracking-tight">
                  {data()?.name || 'File Properties'}
                </h3>
                <p class="text-[12px] text-white/45 truncate">
                  {getFileDescription(data()?.name || '', Boolean(data()?.isDirectory))}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closePropertiesModal}
              class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <svg viewBox="0 0 16 16" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="1.6">
                <path d="M4 4L12 12M12 4L4 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="h-px bg-white/[0.06] -my-1" />

          {/* Properties Content */}
          <Show
            when={!loading() && data()}
            fallback={
              <div class="py-12 flex flex-col items-center justify-center text-white/40 text-[13px] gap-2">
                <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Reading properties...</span>
              </div>
            }
          >
            {(props) => (
              <div class="flex flex-col gap-3 text-[13px]">
                {/* Information Card */}
                <div class="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-4">
                    <span class="text-white/40 shrink-0">Location</span>
                    <div class="flex items-center gap-2 min-w-0 justify-end">
                      <span
                        class="text-white/80 font-mono text-[12px] truncate select-all text-right"
                        title={props().path}
                      >
                        {props().path}
                      </span>
                      <button
                        type="button"
                        onClick={copyPath}
                        class="px-2 py-0.5 rounded-[5px] text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        {copied() ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div class="h-px bg-white/[0.04]" />

                  <div class="flex items-center justify-between">
                    <span class="text-white/40">Size</span>
                    <span class="text-white/85 font-mono text-[12px]">
                      {props().isDirectory
                        ? `${props().itemCount ?? 0} item${props().itemCount === 1 ? '' : 's'}`
                        : formatBytes(props().size)}
                    </span>
                  </div>

                  <Show when={props().isDirectory && props().itemCount !== undefined}>
                    <div class="flex items-center justify-between">
                      <span class="text-white/40">Contents</span>
                      <span class="text-white/85">
                        {props().itemCount} item{props().itemCount === 1 ? '' : 's'} inside
                      </span>
                    </div>
                  </Show>

                  <div class="h-px bg-white/[0.04]" />

                  <div class="flex items-center justify-between">
                    <span class="text-white/40">Created</span>
                    <span class="text-white/70 text-[12px]">{formatDate(props().createdTime)}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-white/40">Modified</span>
                    <span class="text-white/70 text-[12px]">{formatDate(props().modifiedTime)}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-white/40">Permissions</span>
                    <span class="text-white/70 font-mono text-[12px]">
                      {formatPermissions(props().permissions)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Footer Actions */}
          <div class="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={openInDefaultApp}
              class="h-[32px] px-3.5 rounded-[8px] text-[12px] font-medium bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Open in Default App
            </button>

            <button
              type="button"
              onClick={closePropertiesModal}
              class="h-[32px] px-4 rounded-[8px] text-[12px] font-medium bg-white/[0.12] hover:bg-white/[0.18] text-white transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default PropertiesModal
