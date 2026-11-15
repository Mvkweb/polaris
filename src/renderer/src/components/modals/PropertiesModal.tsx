import { Component, createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js'
import { propertiesModalState, closePropertiesModal } from '../../store'
import type { FileProperties } from '../../types'
import {
  MonodriveFolderIcon,
  MonodriveFileIcon,
  ImageThumbnail
} from '../browser/MonodriveIcons'
import { Aurora } from '../dithercn/aurora'
import {
  DitherTabs,
  DitherTabsList,
  DitherTabsTrigger,
  DitherTabsContent
} from '../dithercn/dither-tabs'
import { DitherButton } from '../dithercn/dither-button'
import { DitherSwitch } from '../dithercn/dither-switch'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1))
  return `${val} ${sizes[i]} (${bytes.toLocaleString()} bytes)`
}

function formatDate(ms: number): string {
  if (!ms) return '—'
  const d = new Date(ms)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${month} ${day}, ${year} at ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const PropertiesModal: Component = () => {
  const [data, setData] = createSignal<FileProperties | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const [activeTab, setActiveTab] = createSignal('general')

  // Permission toggles
  const [ownerR, setOwnerR] = createSignal(true)
  const [ownerW, setOwnerW] = createSignal(true)
  const [ownerX, setOwnerX] = createSignal(false)
  const [groupR, setGroupR] = createSignal(true)
  const [groupW, setGroupW] = createSignal(false)
  const [groupX, setGroupX] = createSignal(false)
  const [otherR, setOtherR] = createSignal(true)
  const [otherW, setOtherW] = createSignal(false)
  const [otherX, setOtherX] = createSignal(false)

  createEffect(() => {
    const st = propertiesModalState()
    if (!st.isOpen || !st.targetPath) {
      setData(null)
      return
    }

    setLoading(true)
    setCopied(false)
    setActiveTab('general')

    window.api
      ?.getFileProperties(st.targetPath)
      .then((props) => {
        setData(props)
        if (props?.permissions) {
          const mode = parseInt(props.permissions, 8) || 0
          setOwnerR(Boolean(mode & 0o400))
          setOwnerW(Boolean(mode & 0o200))
          setOwnerX(Boolean(mode & 0o100))
          setGroupR(Boolean(mode & 0o040))
          setGroupW(Boolean(mode & 0o020))
          setGroupX(Boolean(mode & 0o010))
          setOtherR(Boolean(mode & 0o004))
          setOtherW(Boolean(mode & 0o002))
          setOtherX(Boolean(mode & 0o001))
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load file properties:', err)
        setLoading(false)
      })
  })

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!propertiesModalState().isOpen) return
    if (e.key === 'Escape') {
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
      setTimeout(() => setCopied(false), 1400)
    }
  }

  const openInDefaultApp = (): void => {
    const p = data()?.path
    if (p && window.api?.openPath) {
      window.api.openPath(p).catch((err) => console.error('Failed to open file:', err))
    }
  }

  const computedMode = createMemo(() => {
    let mode = 0
    if (ownerR()) mode |= 0o400
    if (ownerW()) mode |= 0o200
    if (ownerX()) mode |= 0o100
    if (groupR()) mode |= 0o040
    if (groupW()) mode |= 0o020
    if (groupX()) mode |= 0o010
    if (otherR()) mode |= 0o004
    if (otherW()) mode |= 0o002
    if (otherX()) mode |= 0o001
    return '0' + mode.toString(8)
  })

  const accessLabel = createMemo(() => {
    if (ownerR() && ownerW()) return 'Read & Write'
    if (ownerR()) return 'Read only'
    if (ownerW()) return 'Write only'
    return 'No access'
  })

  const isImageFile = createMemo(() => {
    const name = data()?.name || ''
    return /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(name)
  })

  const fileKind = createMemo(() => {
    const item = data()
    if (!item) return 'File'
    if (item.isDirectory) return 'Folder'
    if (item.isSymbolicLink) return 'Alias'
    const parts = item.name.split('.')
    if (parts.length > 1) {
      const ext = parts.pop()?.toUpperCase()
      return `${ext} File`
    }
    return 'Document'
  })

  return (
    <Show when={propertiesModalState().isOpen}>
      <div
        class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-[fadeIn_120ms_ease-out]"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePropertiesModal()
        }}
      >
        {/* Modal Card Surface: Pure OLED dark canvas with zero borders/outlines */}
        <div
          class="relative w-[440px] max-w-[94vw] bg-[#000000] border-0 rounded-[20px] p-5 shadow-[0_32px_96px_rgba(0,0,0,1)] flex flex-col gap-4 text-white font-sans overflow-hidden"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          {/* Animated Dither Aurora Background across Hero Header */}
          <div
            class="pointer-events-none absolute inset-x-0 top-0 h-[210px] overflow-hidden rounded-t-[20px] opacity-85 select-none [mask-image:linear-gradient(to_bottom,black_0%,black_65%,transparent_100%)]"
            aria-hidden="true"
          >
            <Aurora
              class="size-full"
              color="blue"
              tipColor="blue"
              background="transparent"
              curtains={3}
              height={0.5}
              spread={0.12}
              direction="down"
              intensity={0.88}
              glow={0.92}
              rays={9}
              sway={1.1}
              drift={0.2}
              shimmer={0.25}
              matrix="bayer8"
              cell={2}
            />
          </div>

          {/* Top Bar: Subtle Title & Pinned Close Icon */}
          <div class="relative z-10 flex items-center justify-between -mt-1">
            <span class="text-[11px] font-semibold tracking-wider uppercase text-white/40 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Properties
            </span>
            <button
              type="button"
              onClick={closePropertiesModal}
              class="w-6 h-6 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] border-0"
              title="Close (Esc)"
              aria-label="Close properties dialog"
            >
              <svg viewBox="0 0 16 16" fill="none" class="w-3.5 h-3.5" stroke="currentColor" stroke-width="1.8">
                <path d="M4 4L12 12M12 4L4 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <Show
            when={!loading() && data()}
            fallback={
              <div class="h-64 flex flex-col items-center justify-center text-white/40 text-xs gap-3 relative z-10">
                <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span class="font-mono text-[11px]">Reading properties…</span>
              </div>
            }
          >
            {(props) => (
              <>
                {/* Centered Hero Header */}
                <div class="relative z-10 flex flex-col items-center text-center -mt-1">
                  <div class="flex items-center justify-center h-16 mb-2">
                    <Show
                      when={!props().isDirectory}
                      fallback={<MonodriveFolderIcon class="w-16 h-14 drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]" />}
                    >
                      <Show
                        when={!isImageFile()}
                        fallback={
                          <ImageThumbnail
                            path={props().path}
                            name={props().name}
                            class="w-14 h-14 drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
                          />
                        }
                      >
                        <MonodriveFileIcon
                          name={props().name}
                          class="w-13 h-15 drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)]"
                        />
                      </Show>
                    </Show>
                  </div>

                  <h3 class="text-[15.5px] font-medium text-white tracking-tight break-all px-2 max-w-full leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {props().name}
                  </h3>

                  <p class="text-[12px] text-white/70 font-normal mt-0.5 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {fileKind()} · {props().isDirectory ? `${props().itemCount ?? 0} items` : formatBytes(props().size).split(' (')[0]}
                  </p>
                </div>

                {/* Dithercn Tabs: Animated Gliding Indicator */}
                <DitherTabs
                  value={activeTab()}
                  onChange={setActiveTab}
                  variant="pill"
                  color="blue"
                  cell={2}
                  matrix="bayer4"
                  class="relative z-10 flex flex-col gap-3.5"
                >
                  <DitherTabsList class="w-full bg-white/[0.015] border-0 p-1 rounded-xl h-10 gap-1 flex select-none">
                    <DitherTabsTrigger
                      value="general"
                      class="flex-1 h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer text-white/45 data-[selected]:text-white transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 opacity-70">
                        <path d="M8 1a7 7 0 1 0 7 7A7.008 7.008 0 0 0 8 1Zm0 12.5A5.5 5.5 0 1 1 13.5 8 5.506 5.506 0 0 1 8 13.5ZM8 4.25a.75.75 0 1 0 .75.75A.75.75 0 0 0 8 4.25ZM8.75 7H7.25a.75.75 0 0 0 0 1.5h.75v3a.75.75 0 0 0 1.5 0V7.75A.75.75 0 0 0 8.75 7Z" />
                      </svg>
                      General
                    </DitherTabsTrigger>

                    <DitherTabsTrigger
                      value="permissions"
                      class="flex-1 h-8 rounded-lg text-xs font-medium gap-1.5 cursor-pointer text-white/45 data-[selected]:text-white transition-colors"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 opacity-70">
                        <path d="M12 6V4.5a4 4 0 0 0-8 0V6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-6-1.5a2 2 0 0 1 4 0V6H6ZM8 11.5a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 8 11.5Z" />
                      </svg>
                      Permissions
                    </DitherTabsTrigger>
                  </DitherTabsList>

                  {/* Tab Panels */}
                  <div class="min-h-[220px] flex flex-col justify-between">
                    <DitherTabsContent value="general" class="flex flex-col gap-3 pt-0.5">
                      {/* Plate 1: Details */}
                      <div class="bg-white/[0.015] border-0 rounded-[14px] p-3.5 flex flex-col gap-2">
                        <div class="flex items-center gap-1.5 text-[11px] font-medium text-white/35">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="w-3.5 h-3.5 opacity-50">
                            <path d="M3 2.5C3 1.67 3.67 1 4.5 1H9L13 5V13.5C13 14.33 12.33 15 11.5 15H4.5C3.67 15 3 14.33 3 13.5V2.5Z" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M9 1V5H13" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                          Details
                        </div>

                        <div class="flex flex-col gap-1.5 text-[12px]">
                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Kind</span>
                            <span class="text-white/75 font-normal truncate">{fileKind()}</span>
                          </div>

                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">
                              {props().isDirectory ? 'Contents' : 'Size'}
                            </span>
                            <span class="text-white/75 font-mono text-[11px] tabular-nums truncate">
                              {props().isDirectory
                                ? `${props().itemCount ?? 0} item${props().itemCount === 1 ? '' : 's'}`
                                : formatBytes(props().size)}
                            </span>
                          </div>

                          <div class="h-6 flex items-center justify-between gap-2 min-w-0">
                            <span class="text-white/35 w-[84px] shrink-0">Where</span>
                            <div class="flex items-center gap-2 min-w-0">
                              <span
                                class="text-white/65 font-mono text-[11px] truncate select-all cursor-pointer hover:text-white/90 transition-colors"
                                title={props().path}
                                onClick={copyPath}
                              >
                                {props().path}
                              </span>
                              <button
                                type="button"
                                onClick={copyPath}
                                class="h-6 px-2.5 text-[11px] font-medium rounded-md bg-[#101010] hover:bg-[#181818] text-white/55 hover:text-white/90 transition-colors cursor-pointer shrink-0 border-0 focus:outline-none"
                              >
                                {copied() ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plate 2: Dates */}
                      <div class="bg-white/[0.015] border-0 rounded-[14px] p-3.5 flex flex-col gap-2">
                        <div class="flex items-center gap-1.5 text-[11px] font-medium text-white/35">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="w-3.5 h-3.5 opacity-50">
                            <circle cx="8" cy="8" r="6.5" />
                            <path d="M8 4.5V8L10.5 9.5" stroke-linecap="round" />
                          </svg>
                          Dates
                        </div>

                        <div class="flex flex-col gap-1.5 text-[12px]">
                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Created</span>
                            <span class="text-white/65 font-mono text-[11px] tabular-nums">
                              {formatDate(props().createdTime)}
                            </span>
                          </div>

                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Modified</span>
                            <span class="text-white/65 font-mono text-[11px] tabular-nums">
                              {formatDate(props().modifiedTime)}
                            </span>
                          </div>

                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Accessed</span>
                            <span class="text-white/65 font-mono text-[11px] tabular-nums">
                              {formatDate(props().accessedTime || props().modifiedTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DitherTabsContent>

                    <DitherTabsContent value="permissions" class="flex flex-col gap-3 pt-0.5">
                      {/* Plate 1: Summary */}
                      <div class="bg-white/[0.015] border-0 rounded-[14px] p-3.5 flex flex-col gap-2">
                        <div class="flex items-center gap-1.5 text-[11px] font-medium text-white/35">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="w-3.5 h-3.5 opacity-50">
                            <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
                            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke-linecap="round" />
                          </svg>
                          Access & Ownership
                        </div>

                        <div class="flex flex-col gap-1.5 text-[12px]">
                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Access</span>
                            <span class="text-white/75 font-medium">
                              {accessLabel()}{' '}
                              <span class="text-white/35 font-mono text-[11px] font-normal tabular-nums">
                                ({computedMode()})
                              </span>
                            </span>
                          </div>

                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Owner</span>
                            <span class="text-white/65 font-mono text-[11px]">{props().owner || 'user'}</span>
                          </div>

                          <div class="h-6 flex items-center justify-between">
                            <span class="text-white/35 w-[84px] shrink-0">Group</span>
                            <span class="text-white/65 font-mono text-[11px]">{props().group || 'user'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Plate 2: DitherSwitch Interactive Matrix */}
                      <div class="bg-white/[0.015] border-0 rounded-[14px] p-3.5 flex flex-col gap-2.5">
                        <div class="flex items-center justify-between text-[11px] font-medium text-white/45">
                          <span>Role</span>
                          <div class="flex items-center gap-7 pr-3 font-mono text-[10.5px]">
                            <span class="w-[34px] text-center">Read</span>
                            <span class="w-[34px] text-center">Write</span>
                            <span class="w-[34px] text-center">Exec</span>
                          </div>
                        </div>

                        <div class="flex flex-col gap-2.5">
                          {/* Owner */}
                          <div class="flex items-center justify-between">
                            <span class="text-[12px] text-white/90 font-medium">Owner</span>
                            <div class="flex items-center gap-7">
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={ownerR()}
                                onChange={setOwnerR}
                                aria-label="Owner Read"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={ownerW()}
                                onChange={setOwnerW}
                                aria-label="Owner Write"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={ownerX()}
                                onChange={setOwnerX}
                                aria-label="Owner Execute"
                              />
                            </div>
                          </div>

                          {/* Group */}
                          <div class="flex items-center justify-between">
                            <span class="text-[12px] text-white/90 font-medium">Group</span>
                            <div class="flex items-center gap-7">
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={groupR()}
                                onChange={setGroupR}
                                aria-label="Group Read"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={groupW()}
                                onChange={setGroupW}
                                aria-label="Group Write"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={groupX()}
                                onChange={setGroupX}
                                aria-label="Group Execute"
                              />
                            </div>
                          </div>

                          {/* Others */}
                          <div class="flex items-center justify-between">
                            <span class="text-[12px] text-white/90 font-medium">Others</span>
                            <div class="flex items-center gap-7">
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={otherR()}
                                onChange={setOtherR}
                                aria-label="Others Read"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={otherW()}
                                onChange={setOtherW}
                                aria-label="Others Write"
                              />
                              <DitherSwitch
                                size="sm"
                                color="blue"
                                cell={2}
                                checked={otherX()}
                                onChange={setOtherX}
                                aria-label="Others Execute"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </DitherTabsContent>
                  </div>
                </DitherTabs>

                {/* Tactile Dither Footer Actions */}
                <div class="relative z-10 flex items-center justify-between pt-1 mt-1">
                  <button
                    type="button"
                    onClick={openInDefaultApp}
                    class="h-8 px-3.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-colors cursor-pointer border-0 focus:outline-none"
                  >
                    Open in Default App
                  </button>

                  <DitherButton
                    variant="filled"
                    color="blue"
                    size="sm"
                    cell={2}
                    onClick={closePropertiesModal}
                  >
                    Done
                  </DitherButton>
                </div>
              </>
            )}
          </Show>
        </div>
      </div>
    </Show>
  )
}

export default PropertiesModal
