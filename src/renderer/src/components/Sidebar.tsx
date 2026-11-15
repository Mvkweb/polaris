import {
  Component,
  createSignal,
  Show,
  onMount,
  onCleanup,
  For,
  createEffect,
  createMemo
} from 'solid-js'
import { AnimatedGradient } from './dithercn/animated-gradient'
import { DitherButton } from './dithercn/dither-button'
import { Loader } from './dithercn/loader'
import { ProgressBar } from './dithercn/progress-bar'
import {
  setCurrentNote,
  currentView,
  setCurrentView,
  previousView,
  toggleSettings,
  isSidebarPinned,
  setIsSidebarPinned,
  currentChatSessionId,
  setCurrentChatSessionId,
  chatSessions,
  setChatSessions,
  initialFiles,
  sidebarSearchFocus,
  gitCommits,
  gitStatus,
  selectedCommitHash,
  setSelectedCommitHash,
  refreshGitData,
  activeAccentColor,
  openContextMenu,
  workspaceRoot,
  navigateTo
} from '../store'
import {
  SolarGhostBold,
  SolarTrashBinTrashLinear,
  SolarFileTextLinear,
  SolarChatRoundLineLinear,
  SolarHome2Linear,
  SolarDownloadCircleLinear,
  SolarMusicNoteLinear,
  SolarGalleryLinear,
  SolarClapperboardLinear,
  SolarClockCircleLinear,
  SolarHardDriveLinear,
  SolarTuningLinear
} from './ui/SolarIcons'
import type { FileNode, ChatSessionSummary, GitCommit, SystemDrive } from '../types'
import FileTree from './file-tree/FileTree'
import SearchPanel from './search/SearchPanel'

import { formatShortcut, isMac, isModKey, shortcutKeys } from '../shortcuts'

interface AtlasPlaceItem {
  id: string
  name: string
  path: string
  icon: Component<{ class?: string }>
}

const DEFAULT_PLACES: AtlasPlaceItem[] = [
  { id: 'home', name: 'Home', path: '', icon: SolarHome2Linear },
  { id: 'docs', name: 'Documents', path: '', icon: SolarFileTextLinear },
  { id: 'downloads', name: 'Downloads', path: '', icon: SolarDownloadCircleLinear },
  { id: 'music', name: 'Music', path: '', icon: SolarMusicNoteLinear },
  { id: 'pictures', name: 'Pictures', path: '', icon: SolarGalleryLinear },
  { id: 'videos', name: 'Videos', path: '', icon: SolarClapperboardLinear },
  { id: 'recent', name: 'Recent', path: '', icon: SolarClockCircleLinear },
  { id: 'trash', name: 'Trash', path: '', icon: SolarTrashBinTrashLinear }
]

const ICON_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons'

const timeAgo = (unixSecs: number): string => {
  if (!unixSecs) return ''
  const diffSecs = Math.floor(Date.now() / 1000) - unixSecs
  if (diffSecs < 60) return 'now'
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h`
  return `${Math.floor(diffSecs / 86400)}d`
}

const formatFreeSpace = (raw?: string): string => {
  if (!raw) return ''
  return `${raw.replace(/\s*free$/i, '').trim()} free`
}

/* ── Reference Icons ── */

const PanelLeftIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4'}>
    <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.75" />
    <path d="M9 4v16" stroke="currentColor" stroke-width="1.75" />
    <rect x="4.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" />
  </svg>
)

const Cog6ToothIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4'}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.75" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const CircleDotIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
  </svg>
)

const UsbDriveIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="M10 2v4h4V2h-4z" />
    <rect x="7" y="6" width="10" height="15" rx="2" />
    <path d="M10 11v3" />
    <path d="M14 11v3" />
  </svg>
)

const PlusIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const SearchIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.75" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  </svg>
)

const PrBranchIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" class={props.class ?? 'w-3.5 h-3.5 text-[#a855f7]'}>
    <circle cx="4" cy="3.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <circle cx="4" cy="12.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <circle cx="12" cy="12.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <path
      d="M4 5.25v5.5M12 10.75V7.5a2.5 2.5 0 0 0-2.5-2.5H7"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
    />
  </svg>
)

const RotateCwIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M21 3v5h-5"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const CheckIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const CheckCheckIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const Undo2Icon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M9 14 4 9l5-5"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

/* ── DotTrack for SpaceSwitcher & ProjectFilter ── */
const DOT = 4
const DOT_GAP = 4
const DOT_PITCH = DOT + DOT_GAP
const DOT_TRACK_W = DOT_PITCH * 5 - DOT_GAP

const DotTrack = (props: { count: number; activeIndex: number; class?: string }) => (
  <div class="h-1.5">
    <Show when={props.count > 1}>
      <div
        class={`flex h-full items-center overflow-hidden ${props.class ?? ''}`}
        style={{
          width: `${DOT_TRACK_W}px`,
          'mask-image': 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)'
        }}
      >
        <div
          class="flex items-center transition-transform duration-200 ease-out"
          style={{
            gap: `${DOT_GAP}px`,
            transform: `translateX(${DOT_TRACK_W / 2 - DOT / 2 - props.activeIndex * DOT_PITCH}px)`
          }}
        >
          <For each={Array.from({ length: props.count }, (_, i) => i)}>
            {(i) => (
              <span
                class={`w-1 h-1 shrink-0 rounded-full transition-colors ${
                  i === props.activeIndex ? 'bg-white/80' : 'bg-white/25'
                }`}
              />
            )}
          </For>
        </div>
      </div>
    </Show>
  </div>
)

/* ── Keycaps Matching Platform ── */
const KbdHint = (props: { combo: string; muted?: boolean }) => (
  <span class="flex items-center gap-1 ml-auto shrink-0">
    <For each={shortcutKeys(props.combo)}>
      {(key) => (
        <kbd
          class={`flex items-center justify-center h-[19px] min-w-[19px] px-1 rounded-[4px] font-sans text-[11px] font-medium ${
            props.muted ? 'bg-white/[0.04] text-white/35' : 'bg-white/[0.07] text-white/50'
          }`}
        >
          {key}
        </kbd>
      )}
    </For>
  </span>
)

const handleNewChatGlobal = (): void => {
  const newId = `session-${Date.now()}`
  const newSession: ChatSessionSummary = {
    id: newId,
    title: 'New Conversation',
    modelId: 'gemini-2.5-flash',
    modelName: 'Gemini 2.5 Flash',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    preview: 'Ask anything or prompt agent...',
    fileRefs: [],
    messageCount: 0
  }
  setChatSessions((prev) => [newSession, ...prev])
  setCurrentChatSessionId(newId)
  setCurrentView('chat')
}

const handleDeleteSessionGlobal = (sessionId: string): void => {
  setChatSessions((prev) => prev.filter((s) => s.id !== sessionId))
  if (currentChatSessionId() === sessionId) {
    const remaining = chatSessions().filter((s) => s.id !== sessionId)
    setCurrentChatSessionId(remaining.length > 0 ? remaining[0].id : '')
  }
}

// Single source of truth for a full session card (header / title / footer).
const SessionCardBody = (props: {
  session: ChatSessionSummary
  showActiveBadge: boolean
  brightTitle: boolean
  onDelete: () => void
}) => {
  return (
    <>
      <div class="flex items-center gap-1.5 min-w-0">
        <img
          src={`${ICON_BASE}/${props.session.modelIcon}.svg`}
          alt=""
          class="w-3.5 h-3.5 shrink-0 opacity-100"
          style={{
            filter: !props.session.modelIcon.endsWith('-color') ? 'invert(1) brightness(2)' : 'none'
          }}
          onError={(e) => {
            e.currentTarget.src = `${ICON_BASE}/opencode.svg`
            e.currentTarget.style.filter = 'invert(1) brightness(2)'
          }}
        />
        <span class="text-[12px] font-semibold text-white/75 group-hover:text-white/90 truncate max-w-[135px]">
          {props.session.modelName}
        </span>
        <Show
          when={props.showActiveBadge}
          fallback={
            <span class="ml-auto text-[11.5px] font-medium text-white/40 shrink-0">
              {timeAgo(Math.floor(props.session.updatedAt / 1000))}
            </span>
          }
        >
          <span class="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] opacity-90">
            Active
          </span>
        </Show>
      </div>
      <div>
        <h3
          title={props.session.title || 'New Conversation'}
          class="relative text-[13px] leading-snug truncate font-semibold text-white/80 group-hover:text-white transition-colors"
        >
          <span
            class={`block truncate transition-opacity duration-300 ${
              props.brightTitle ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {props.session.title || 'New Conversation'}
          </span>
          <span
            aria-hidden
            class={`pointer-events-none absolute inset-0 truncate font-bold text-white transition-opacity duration-300 ${
              props.brightTitle ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {props.session.title || 'New Conversation'}
          </span>
        </h3>
      </div>
      <div class="flex items-center justify-between pt-0.5 min-w-0">
        <Show
          when={props.session.fileRefs && props.session.fileRefs.length > 0}
          fallback={
            <Show
              when={props.session.preview}
              fallback={
                <Show when={props.session.messageCount}>
                  <div class="flex items-center gap-1.5 text-[11px] text-white/40">
                    <SolarChatRoundLineLinear class="w-3 h-3 text-white/30 shrink-0" />
                    <span class="shrink-0">{props.session.messageCount} msgs</span>
                  </div>
                </Show>
              }
            >
              <div
                class="flex items-center gap-1.5 text-[11px] text-white/45 tracking-tight truncate"
                title={props.session.preview}
              >
                <SolarChatRoundLineLinear class="w-3 h-3 text-white/30 shrink-0" />
                <span class="truncate">{props.session.preview}</span>
                <Show when={props.session.messageCount}>
                  <span class="text-white/25 shrink-0">• {props.session.messageCount}</span>
                </Show>
              </div>
            </Show>
          }
        >
          <div
            class="flex items-center gap-1.5 text-[11px] text-white/55 font-mono tracking-tight truncate"
            title={`${props.session.fileRefs!.join(', ')}${
              props.session.preview ? ` — ${props.session.preview}` : ''
            }`}
          >
            <SolarFileTextLinear class="w-3 h-3 text-white/40 shrink-0" />
            <span class="truncate">
              {props.session.fileRefs![0]}
              {props.session.fileRefs!.length > 1 ? ` +${props.session.fileRefs!.length - 1}` : ''}
            </span>
            <Show when={props.session.messageCount}>
              <span class="text-white/25 shrink-0">• {props.session.messageCount}</span>
            </Show>
          </div>
        </Show>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onDelete()
          }}
          class="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 hover:bg-white/10 rounded transition-all text-white/50 hover:text-red-400 cursor-pointer shrink-0"
          title="Delete conversation"
        >
          <SolarTrashBinTrashLinear class="w-3 h-3" />
        </button>
      </div>
    </>
  )
}

/* ── Real Git Tasks Commit Row ── */
const GitCommitRow = (props: {
  commit: GitCommit
  index: number
  active: boolean
  isChild?: boolean
  copied?: boolean
  onSelect: () => void
  onCopyHash: () => void
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          props.onSelect()
        }
      }}
      class={`group relative flex min-h-7 w-full cursor-pointer items-center rounded-md pl-0 pr-1.5 select-none transition-[color,background-color,opacity] duration-150 outline-none ${
        props.active ? 'bg-white/[0.11] text-white' : 'text-white/80 hover:bg-white/[0.06]'
      }`}
    >
      {/* Left Active / Status Rail Slot (8px) */}
      <span class="flex w-2 shrink-0 items-center justify-center self-stretch">
        <Show when={props.index === 0 && !props.active}>
          <span class="h-1.5 w-0.5 rounded-[1px] bg-emerald-400" title="HEAD commit" />
        </Show>
        <Show when={props.active}>
          <span class="h-2 w-0.5 rounded-[1px] bg-[#a855f7]" title="Selected commit" />
        </Show>
      </span>

      {/* Nested L-Connector Rail for commit chain (matching 8bf93386.png row 2) */}
      <Show when={props.isChild}>
        <span
          aria-hidden
          class="pointer-events-none absolute top-0 h-1/2 w-px bg-white/[0.12]"
          style={{ left: '12px' }}
        />
        <span
          aria-hidden
          class="pointer-events-none absolute top-1/2 h-px bg-white/[0.12]"
          style={{ left: '13px', width: '7px' }}
        />
        <span aria-hidden class="shrink-0 w-[14px]" />
      </Show>

      {/* PR / Git Branch Mark */}
      <span class="mr-1.5 flex shrink-0 items-center">
        <PrBranchIcon class="w-3.5 h-3.5 text-[#a855f7]" />
      </span>

      {/* Short Hash Badge */}
      <span class="font-mono text-[10.5px] text-white/40 group-hover:text-white/60 mr-1.5 shrink-0 tabular-nums">
        {props.commit.shortHash}
      </span>

      {/* Commit Message with hover gradient mask */}
      <span
        title={props.commit.message}
        class="min-w-0 flex-1 truncate text-[13px] font-normal tracking-[-0.01em] group-hover:[mask-image:linear-gradient(to_left,transparent_36px,black_56px)]"
      >
        {props.commit.message}
      </span>

      {/* Right Timestamp + Copy Action */}
      <div class="flex shrink-0 items-center self-stretch pl-2 text-[12px]">
        <span class="pointer-events-none flex items-center whitespace-nowrap text-white/40 tabular-nums transition-opacity duration-150 group-hover:opacity-0">
          {timeAgo(Math.floor(props.commit.timestamp / 1000))}
        </span>

        <div class="pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            title={props.copied ? 'Copied SHA!' : 'Copy commit hash'}
            onClick={(e) => {
              e.stopPropagation()
              props.onCopyHash()
            }}
            class="w-5 h-5 rounded flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Show when={props.copied} fallback={<CheckIcon class="w-3.5 h-3.5" />}>
              <CheckCheckIcon class="w-3.5 h-3.5 text-emerald-400" />
            </Show>
          </button>
        </div>
      </div>
    </div>
  )
}

const activeSidebarView = (): string =>
  currentView() === 'settings' ? previousView() : currentView()

const cycleScopeView = (): void => {
  const v = activeSidebarView()
  if (v === 'files' || v === 'editor') {
    setCurrentView('search')
  } else if (v === 'search') {
    setCurrentView('tasks')
    refreshGitData()
  } else if (v === 'tasks') {
    setCurrentView('chat')
  } else {
    setCurrentView('files')
  }
}

// Scope views in cycle order. The carousel renders them twice so the slot that
// wraps from the far left to the far right is always an invisible one.
const SCOPE_LABELS = ['Files', 'Search', 'Tasks', 'Chat']
const CAROUSEL_SLOTS = [...SCOPE_LABELS, ...SCOPE_LABELS]

const scopeIndex = (): number => {
  const view = activeSidebarView()
  if (view === 'search') return 1
  if (view === 'tasks') return 2
  if (view === 'chat') return 3
  return 0
}

// Maps a slot to its position relative to the active one, in the range -2..3.
const slotOffset = (slot: number, step: number): number => {
  const n = CAROUSEL_SLOTS.length
  return ((((slot - step + 2) % n) + n) % n) - 2
}

const slotClass = (offset: number): string => {
  if (offset === 0) return 'opacity-100 text-white/90'
  if (offset === 1) return 'opacity-100 text-white/40'
  if (offset === 2) return 'opacity-100 text-white/20'
  return 'opacity-0 text-white/20'
}

const ScopeCarousel: Component = () => {
  // Absolute step count, so moving from the last view to the first keeps sliding
  // forward instead of rewinding across the strip.
  const step = createMemo<number>((prev) => {
    const delta = (((scopeIndex() - prev) % 4) + 4) % 4
    return prev + (delta === 3 ? -1 : delta)
  }, scopeIndex())

  return (
    <span class="relative h-full min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_75%,transparent)]">
      <For each={CAROUSEL_SLOTS}>
        {(label, i) => {
          const offset = createMemo(() => slotOffset(i(), step()))
          return (
            <span
              aria-hidden={offset() !== 0}
              style={{ transform: `translateX(${offset() * 100}%)` }}
              class={`absolute inset-y-0 left-0 flex w-[46px] items-center transition-[transform,opacity,color] duration-200 ease-out motion-reduce:transition-none ${slotClass(offset())}`}
            >
              {label}
            </span>
          )
        }}
      </For>
    </span>
  )
}

const DriveItemRow: Component<{
  drive: SystemDrive
  activePlaceId: () => string | null
  currentPath: () => string
  hoveredDriveId: () => string | null
  setHoveredDriveId: (val: string | null | ((curr: string | null) => string | null)) => void
  onSelectDrive: (drive: SystemDrive) => void
  mountingDriveId: () => string | null
  mountError: () => { id: string; message: string } | null
  openContextMenu: (x: number, y: number, data: any) => void
  icon: Component<{ class?: string }>
}> = (props) => {
  const isUnmounted = () => props.drive.isMounted === false
  const isReadOnly = () => props.drive.isReadOnly === true
  const isSelected = () =>
    !isUnmounted() && !props.activePlaceId() && props.currentPath() === props.drive.mountPoint
  const isDriveHovered = () => props.hoveredDriveId() === props.drive.id
  const isExpanded = () => isDriveHovered() || isSelected()
  const isMounting = () => props.mountingDriveId() === props.drive.id
  const mountError = () =>
    props.mountError()?.id === props.drive.id ? props.mountError()?.message : null

  const capacityLabel = (): string => {
    if (isUnmounted()) return props.drive.size
    if (isReadOnly()) return `${props.drive.size} / ${props.drive.size}`
    return formatFreeSpace(props.drive.freeSpace || props.drive.size)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => props.onSelectDrive(props.drive)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isUnmounted()) return
        props.openContextMenu(e.clientX, e.clientY, {
          path: props.drive.mountPoint,
          name: props.drive.name,
          isDrive: true,
          drive: props.drive
        })
      }}
      onMouseEnter={() => props.setHoveredDriveId(props.drive.id)}
      onMouseLeave={() =>
        props.setHoveredDriveId((curr) => (curr === props.drive.id ? null : curr))
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          props.onSelectDrive(props.drive)
        }
      }}
      class={`group rounded-md cursor-pointer outline-none transition-colors duration-150 select-none px-2.5 py-2 ${
        isExpanded()
          ? 'bg-white/[0.08] text-white/95'
          : 'bg-transparent hover:bg-white/[0.04] text-white/60'
      }`}
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <props.icon
          class={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isExpanded() ? 'text-white/90' : 'text-white/40 group-hover:text-white/75'
          }`}
        />
        <span
          class={`flex-1 truncate text-[13px] font-medium transition-colors ${
            isExpanded() ? 'text-white/95' : 'text-white/70'
          }`}
        >
          {props.drive.name}
        </span>
        <Show when={isMounting()}>
          <Loader
            variant="dots"
            size="sm"
            cell={1}
            color="ink"
            label={`Mounting ${props.drive.name}`}
            class="h-4 opacity-80"
          />
        </Show>
        <Show when={!isMounting() && (props.drive.freeSpace || props.drive.size)}>
          <span
            class={`text-[11px] font-mono tabular-nums shrink-0 transition-colors ${
              isExpanded() ? 'text-white/55' : 'text-white/35'
            }`}
          >
            {capacityLabel()}
          </span>
        </Show>
      </div>

      <Show when={!isUnmounted()}>
        <div class="w-full mt-2">
          <ProgressBar
            label={props.drive.name || props.drive.model || props.drive.mountPoint}
            value={Math.min(100, Math.max(0, Math.round(props.drive.usedPercent || 0)))}
            max={100}
            size="sm"
            fill="gradient"
            bloom="low"
            color="blue"
            hideLabel
            class="w-full"
          />
        </div>
      </Show>

      <div
        class="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{
          'grid-template-rows': isExpanded() ? '1fr' : '0fr'
        }}
      >
        <div class="overflow-hidden">
          <div
            class={`flex items-center justify-between pt-1.5 text-[11px] font-mono transition-opacity duration-200 ${
              isExpanded() ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Show
              when={!isUnmounted()}
              fallback={
                <span class="truncate text-white/40">
                  {isMounting() ? 'Mounting…' : 'Not mounted · click to mount'}
                </span>
              }
            >
              <span class="truncate text-white/40 max-w-[145px]" title={props.drive.mountPoint}>
                {props.drive.mountPoint}
              </span>
              <span class="text-white/35 tabular-nums shrink-0">
                {isReadOnly() ? 'read-only' : `${props.drive.usedPercent}% used`}
              </span>
            </Show>
          </div>
          <Show when={mountError()}>
            <p
              class="pt-1 text-[11px] leading-snug text-amber-300/80 truncate"
              title={mountError() ?? undefined}
            >
              {mountError()}
            </p>
          </Show>
        </div>
      </div>
    </div>
  )
}

const Sidebar: Component = () => {
  const [isHovered, setIsHovered] = createSignal(false)
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = createSignal(false)
  const [newNoteName, setNewNoteName] = createSignal('')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [_files, setFiles] = createSignal<FileNode[]>(initialFiles)
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [settledShown, setSettledShown] = createSignal(false)
  const [expandedSettledId, setExpandedSettledId] = createSignal<string | null>(null)
  const [copiedHash, setCopiedHash] = createSignal<string | null>(null)

  // Places & Real System Drives state
  const [drives, setDrives] = createSignal<SystemDrive[]>([])
  const [activePlaceId, setActivePlaceId] = createSignal<string | null>(null)
  const [placesOpen, setPlacesOpen] = createSignal(true)
  const [places, setPlaces] = createSignal<AtlasPlaceItem[]>(DEFAULT_PLACES)
  const [devicesOpen, setDevicesOpen] = createSignal(true)
  const [removableOpen, setRemovableOpen] = createSignal(true)
  const [hoveredDriveId, setHoveredDriveId] = createSignal<string | null>(null)
  const [mountingDriveId, setMountingDriveId] = createSignal<string | null>(null)
  const [mountError, setMountError] = createSignal<{ id: string; message: string } | null>(null)

  const internalDrives = createMemo(() => drives().filter((d) => !d.isRemovable))
  const removableDrives = createMemo(() =>
    drives()
      .filter((d) => d.isRemovable)
      .sort(
        (a, b) =>
          Number(b.isMounted !== false) - Number(a.isMounted !== false) ||
          a.name.localeCompare(b.name)
      )
  )

  const currentPath = () => workspaceRoot() || '.'

  const loadUserPlaces = async (): Promise<void> => {
    try {
      if (window.api?.getUserPlaces) {
        const u = await window.api.getUserPlaces()
        if (u?.home) {
          const list: AtlasPlaceItem[] = [
            { id: 'home', name: 'Home', path: u.home, icon: SolarHome2Linear }
          ]
          if (u.documents) list.push({ id: 'docs', name: 'Documents', path: u.documents, icon: SolarFileTextLinear })
          if (u.downloads) list.push({ id: 'downloads', name: 'Downloads', path: u.downloads, icon: SolarDownloadCircleLinear })
          if (u.music) list.push({ id: 'music', name: 'Music', path: u.music, icon: SolarMusicNoteLinear })
          if (u.pictures) list.push({ id: 'pictures', name: 'Pictures', path: u.pictures, icon: SolarGalleryLinear })
          if (u.videos) list.push({ id: 'videos', name: 'Videos', path: u.videos, icon: SolarClapperboardLinear })
          if (u.trash) list.push({ id: 'trash', name: 'Trash', path: u.trash, icon: SolarTrashBinTrashLinear })

          setPlaces(list)
        }
      }
    } catch (err) {
      console.warn('Failed to load user places:', err)
    }
  }

  const loadDrives = async (): Promise<void> => {
    try {
      if (window.api?.getSystemDrives) {
        const result = await window.api.getSystemDrives()
        setDrives(result || [])
      }
    } catch (err) {
      console.warn('Failed to load system drives:', err)
    }
  }

  const handleSelectPlace = (place: AtlasPlaceItem): void => {
    if (!place.path) return
    setActivePlaceId(place.id)
    navigateTo(place.path)
  }

  const handleSelectDrive = async (drive: SystemDrive): Promise<void> => {
    if (drive.isMounted !== false) {
      if (!drive.mountPoint) return
      setActivePlaceId(null)
      navigateTo(drive.mountPoint)
      return
    }

    if (!drive.device || mountingDriveId()) return

    setMountingDriveId(drive.id)
    setMountError(null)
    try {
      const result = await window.api?.mountDrive?.(drive.device)
      if (result?.ok && result.mountPoint) {
        await loadDrives()
        setActivePlaceId(null)
        navigateTo(result.mountPoint)
      } else {
        setMountError({ id: drive.id, message: result?.error || 'Could not mount the drive' })
      }
    } catch (err) {
      setMountError({
        id: drive.id,
        message: err instanceof Error ? err.message : 'Could not mount the drive'
      })
    } finally {
      setMountingDriveId(null)
    }
  }

  // Spaces state
  const spaces = ['All Spaces', 'Ember', 'Notes']
  const [spaceIndex, setSpaceIndex] = createSignal(0)

  let searchInputRef: HTMLInputElement | undefined = undefined

  const focusSearch = (): void => {
    searchInputRef?.focus()
    searchInputRef?.select()
  }

  createEffect(() => {
    if (sidebarSearchFocus() > 0) {
      setSearchOpen(true)
      setTimeout(focusSearch, 0)
    }
  })

  const copyCommitHash = (hash: string): void => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const handleNewAction = (): void => {
    if (currentView() === 'chat') {
      handleNewChatGlobal()
    } else if (currentView() === 'tasks') {
      refreshGitData()
    } else {
      setIsNewNoteModalOpen(true)
    }
  }

  const handleCreateNote = (): void => {
    if (!newNoteName().trim()) return
    const name = newNoteName().trim().endsWith('.md')
      ? newNoteName().trim()
      : `${newNoteName().trim()}.md`
    const newFile: FileNode = {
      name,
      is_dir: false,
      last_modified: Date.now()
    }
    setFiles((prev) => [newFile, ...prev])
    setNewNoteName('')
    setIsNewNoteModalOpen(false)
    setCurrentNote(name.replace('.md', ''))
    setCurrentView('editor')
  }

  const isVisible = (): boolean => isSidebarPinned() || isHovered()

  const filteredSessions = createMemo((): ChatSessionSummary[] => {
    const q = searchQuery().trim().toLowerCase()
    const list = chatSessions()
    if (!q) return list
    return list.filter((s) => {
      return (
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.modelName && s.modelName.toLowerCase().includes(q)) ||
        (s.provider && s.provider.toLowerCase().includes(q)) ||
        (s.preview && s.preview.toLowerCase().includes(q)) ||
        (s.fileRefs && s.fileRefs.some((f) => f.toLowerCase().includes(q)))
      )
    })
  })

  const activeSessions = createMemo((): ChatSessionSummary[] => filteredSessions().slice(0, 5))
  const settledSessions = createMemo((): ChatSessionSummary[] => filteredSessions().slice(5))

  const filteredCommits = createMemo((): GitCommit[] => {
    const q = searchQuery().trim().toLowerCase()
    const list = gitCommits()
    if (!q) return list
    return list.filter((c) => {
      return (
        c.message.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q)
      )
    })
  })

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isModKey(e)) return

    const key = e.key.toLowerCase()

    if (key === 'b') {
      e.preventDefault()
      setIsSidebarPinned(!isSidebarPinned())
      return
    }

    if (key === ',') {
      e.preventDefault()
      toggleSettings()
      return
    }

    if (key === 'i') {
      e.preventDefault()
      cycleScopeView()
      return
    }

    // Step through items with Mod+Shift+Up/Down
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (currentView() === 'tasks') {
        const list = filteredCommits()
        if (list.length === 0) return
        e.preventDefault()
        const currentIdx = list.findIndex((c) => c.hash === selectedCommitHash())
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + delta + list.length) % list.length
        setSelectedCommitHash(list[nextIdx].hash)
        return
      }

      if (currentView() === 'chat') {
        const rows = filteredSessions()
        if (rows.length === 0) return
        e.preventDefault()
        const currentIdx = rows.findIndex((s) => s.id === currentChatSessionId())
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + delta + rows.length) % rows.length
        setCurrentChatSessionId(rows[nextIdx].id)
        return
      }
    }

    if (key === 'n') {
      const target = e.target as HTMLElement | null
      const isInsideEditor =
        Boolean(target?.closest('main')) || Boolean(document.activeElement?.closest('main'))
      if (isInsideEditor) return

      e.preventDefault()
      handleNewAction()
      return
    }

    if (key === 'f') {
      if (e.shiftKey) {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(focusSearch, 0)
        return
      }

      const target = e.target as HTMLElement | null
      const isInsideEditor =
        Boolean(target?.closest('main')) ||
        Boolean(document.activeElement?.closest('main')) ||
        Boolean(document.activeElement?.closest('.cm-editor'))

      if (isInsideEditor) {
        return
      }

      e.preventDefault()
      setSearchOpen(true)
      setTimeout(focusSearch, 0)
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    refreshGitData()
    loadUserPlaces()
    loadDrives()
    window.addEventListener('focus', refreshGitData)
    window.addEventListener('focus', loadDrives)

    let unsubscribeDrives: (() => void) | undefined
    if (window.api?.onDrivesChanged) {
      unsubscribeDrives = window.api.onDrivesChanged(() => {
        loadDrives()
      })
    }

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focus', refreshGitData)
      window.removeEventListener('focus', loadDrives)
      unsubscribeDrives?.()
    })
  })

  return (
    <>
      {/* Invisible hover trigger strip on screen edge when sidebar is collapsed */}
      <div
        class="fixed left-0 top-0 bottom-0 w-3 z-[60]"
        style={{ 'pointer-events': isSidebarPinned() ? 'none' : 'auto' }}
        onMouseEnter={() => setIsHovered(true)}
      />

      <div
        class="shrink-0 h-full relative z-20"
        style={{
          width: isVisible() ? '260px' : '0px',
          overflow: 'hidden',
          transition: 'width 350ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <aside
          class="absolute left-0 top-0 bottom-0 w-[260px] bg-[#050505] border-r border-white/[0.06] flex flex-col overflow-hidden z-20 will-change-transform select-none"
          style={{
            transform: isVisible() ? 'translate3d(0,0,0)' : 'translate3d(-100%,0,0)',
            transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div class="w-[260px] h-full flex flex-col text-white relative">
            {/* Dithercn AnimatedGradient Banner — Mist-style accent glow */}
            <div class="absolute top-0 left-0 right-0 h-[120px] pointer-events-none select-none overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]">
              <AnimatedGradient
                preset="Mist"
                color1="#050505"
                color2={activeAccentColor()}
                color3="#050505"
                speed={8}
                softness={100}
                distortion={4}
                swirl={55}
                scale={0.5}
                class="w-full h-full"
              />
            </div>

            {/* ── Top Titlebar Strip (SidebarToggle + SettingsButton + SpaceSwitcher) ── */}
            <div
              class={`relative z-10 flex px-2.5 pt-3 pb-1 drag-region shrink-0 ${isMac() ? 'flex-col gap-y-0.5' : 'items-center justify-between'}`}
            >
              <div class={`flex items-center gap-0.5 no-drag ${isMac() ? 'self-end' : ''}`}>
                {/* SidebarToggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarPinned(!isSidebarPinned())}
                  aria-label="Toggle sidebar"
                  title={
                    isSidebarPinned()
                      ? `Unpin Sidebar (${formatShortcut('Mod+B')})`
                      : `Pin Sidebar (${formatShortcut('Mod+B')})`
                  }
                  class="w-7 h-7 rounded-md flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <PanelLeftIcon class="w-[16px] h-[16px]" />
                </button>

                {/* SettingsButton (Up top beside SidebarToggle) */}
                <button
                  type="button"
                  onClick={toggleSettings}
                  aria-label="Settings"
                  title={`Settings (${formatShortcut('Mod+,')})`}
                  class={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    currentView() === 'settings'
                      ? 'text-white bg-white/[0.08]'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Cog6ToothIcon class="w-[16px] h-[16px]" />
                </button>
              </div>

              {/* SpaceSwitcher ("All Spaces" with hover DotTrack) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const next = (spaceIndex() + 1) % spaces.length
                  setSpaceIndex(next)
                  if (spaces[next] === 'Notes') setCurrentView('files')
                  else if (spaces[next] === 'Ember') setCurrentView('tasks')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSpaceIndex((i) => (i + 1) % spaces.length)
                  }
                }}
                class={`group/spaces relative flex cursor-pointer items-center px-1.5 py-0.5 no-drag select-none focus-visible:outline-none ${isMac() ? 'self-start' : ''}`}
              >
                <span class="grid max-w-28 text-[13px] font-medium">
                  <For each={spaces}>
                    {(label, i) => (
                      <span
                        aria-hidden={i() !== spaceIndex()}
                        class={`col-start-1 row-start-1 truncate text-right text-white/55 transition-colors group-hover/spaces:text-white/90 ${
                          i() !== spaceIndex() ? 'invisible' : ''
                        }`}
                      >
                        {label}
                      </span>
                    )}
                  </For>
                </span>
                <div class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2">
                  <DotTrack
                    count={spaces.length}
                    activeIndex={spaceIndex()}
                    class="opacity-0 transition-opacity duration-150 group-hover/spaces:opacity-100"
                  />
                </div>
              </div>
            </div>

            {/* ── Top Action Rows (New Task / Tasks Switcher / Search) ── */}
            <div class="relative z-10 flex flex-col gap-px px-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={handleNewAction}
                class="w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-[13px] font-normal text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <PlusIcon class="w-3.5 h-3.5 text-white/60 shrink-0" />
                <span>
                  {activeSidebarView() === 'chat'
                    ? 'New Chat'
                    : activeSidebarView() === 'tasks'
                      ? 'New Task'
                      : 'New Note'}
                </span>
                <KbdHint combo="Mod+N" />
              </button>

              <button
                type="button"
                onClick={cycleScopeView}
                class={`w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-[13px] font-normal transition-colors cursor-pointer ${
                  activeSidebarView() === 'tasks'
                    ? 'bg-white/[0.11] text-white'
                    : 'text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                <CircleDotIcon class="w-3.5 h-3.5 text-white/60 shrink-0" />
                <ScopeCarousel />
                <KbdHint combo="Mod+I" />
              </button>

              <Show
                when={searchOpen()}
                fallback={
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(true)
                      setTimeout(focusSearch, 0)
                    }}
                    class="w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-[13px] font-normal text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <SearchIcon class="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <span>Search</span>
                    <KbdHint combo="Mod+F" />
                  </button>
                }
              >
                <div class="group flex h-7 w-full items-center gap-2 border border-transparent px-1.5 text-[13px]">
                  <SearchIcon class="w-3.5 h-3.5 text-white/60 shrink-0" />
                  <input
                    ref={(el) => {
                      searchInputRef = el
                    }}
                    type="text"
                    value={searchQuery()}
                    placeholder="Search"
                    aria-label="Search tasks"
                    onInput={(e) => setSearchQuery(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Escape') return
                      e.preventDefault()
                      setSearchQuery('')
                      e.currentTarget.blur()
                      setSearchOpen(false)
                    }}
                    onBlur={() => {
                      if (!searchQuery()) setSearchOpen(false)
                    }}
                    class="min-w-0 flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/40"
                  />
                  <Show when={searchQuery()}>
                    <kbd class="hidden group-focus-within:inline-flex items-center justify-center h-[19px] px-1 rounded-[4px] bg-white/[0.07] text-[11px] font-medium text-white/50">
                      Esc
                    </kbd>
                  </Show>
                  <Show when={!searchQuery()}>
                    <span class="ml-auto group-focus-within:hidden">
                      <KbdHint combo="Mod+F" />
                    </span>
                  </Show>
                </div>
              </Show>
            </div>

            {/* ── Project / Scope Filter Band + Settled Toggle ── */}
            <div class="mt-3.5 flex items-start justify-between py-1 pr-2 pl-3 shrink-0">
              <div
                role="button"
                tabIndex={0}
                onClick={cycleScopeView}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    cycleScopeView()
                  }
                }}
                class="group/projects -my-1 flex min-w-0 flex-1 cursor-pointer flex-col items-start py-1 pl-0.5 select-none focus-visible:outline-none"
              >
                <div class="flex max-w-full flex-col items-center gap-1">
                  <span class="flex items-center gap-1 text-[13px] font-medium text-white/45 transition-colors group-hover/projects:text-white/85">
                    <span class="max-w-40 truncate">
                      {activeSidebarView() === 'files' || activeSidebarView() === 'editor'
                        ? 'workspace'
                        : activeSidebarView() === 'search'
                          ? 'search'
                          : activeSidebarView() === 'chat'
                            ? settledShown()
                              ? 'ember · settled'
                              : 'ember · chat'
                            : gitStatus()?.clean
                              ? gitStatus()?.branch || 'ember'
                              : `${gitStatus()?.branch || 'ember'} · ${gitStatus()?.modifiedCount} modified`}
                    </span>
                  </span>
                  <DotTrack
                    count={4}
                    activeIndex={
                      activeSidebarView() === 'files' || activeSidebarView() === 'editor'
                        ? 0
                        : activeSidebarView() === 'search'
                          ? 1
                          : activeSidebarView() === 'tasks'
                            ? 2
                            : 3
                    }
                    class="opacity-0 transition-opacity duration-150 group-hover/projects:opacity-100"
                  />
                </div>
              </div>

              <div class="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={settledShown() ? 'Show active' : 'Show settled'}
                  title={settledShown() ? 'Show active' : 'Show settled'}
                  onClick={() => {
                    if (currentView() !== 'chat') setCurrentView('chat')
                    setSettledShown((prev) => !prev)
                  }}
                  class="w-6 h-6 rounded flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Show when={settledShown()} fallback={<CheckCheckIcon class="w-3.5 h-3.5" />}>
                    <Undo2Icon class="w-3.5 h-3.5" />
                  </Show>
                </button>
              </div>
            </div>

            {/* ── Main Scrollable Area ── */}
            <div
              onContextMenu={(e) => {
                if (activeSidebarView() === 'files' || activeSidebarView() === 'editor') {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, {
                    path: workspaceRoot(),
                    isDirectory: true
                  })
                }
              }}
              class="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-px pb-3 pl-2 pr-1.5"
            >
              {/* 0. Full-Text Project Search View */}
              <Show when={activeSidebarView() === 'search'}>
                <SearchPanel />
              </Show>

              {/* 1. Places & Devices File Explorer View */}
              <Show when={activeSidebarView() === 'files' || activeSidebarView() === 'editor'}>
                <Show
                  when={!searchQuery()}
                  fallback={
                    <div class="flex flex-col">
                      <FileTree searchQuery={searchQuery()} />
                    </div>
                  }
                >
                  {/* ── Section: Places ── */}
                  <div class="flex flex-col">
                    <div
                      class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
                      onClick={() => setPlacesOpen(!placesOpen())}
                    >
                      <span>Places</span>
                      <SolarTuningLinear class="w-3.5 h-3.5 text-white/30 hover:text-white/70 transition-colors" />
                    </div>

                    <Show when={placesOpen()}>
                      <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
                        <For each={places()}>
                          {(place) => {
                            const isSelected = () =>
                              activePlaceId()
                                ? activePlaceId() === place.id
                                : currentPath() === place.path && place.id !== 'recent'

                            return (
                              <div
                                onClick={() => handleSelectPlace(place)}
                                class={`group flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer select-none ${
                                  isSelected()
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white/90'
                                }`}
                              >
                                <place.icon
                                  class={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                    isSelected()
                                      ? 'text-white/90'
                                      : 'text-white/40 group-hover:text-white/75'
                                  }`}
                                />
                                <span class="truncate">{place.name}</span>
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>

                  {/* ── Section: Devices (Internal Drives) ── */}
                  <div class="flex flex-col pt-4">
                    <div
                      class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
                      onClick={() => setDevicesOpen(!devicesOpen())}
                    >
                      <span>Devices</span>
                    </div>

                    <Show when={devicesOpen()}>
                      <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
                        <For each={internalDrives()}>
                          {(drive) => (
                            <DriveItemRow
                              drive={drive}
                              activePlaceId={activePlaceId}
                              currentPath={currentPath}
                              hoveredDriveId={hoveredDriveId}
                              setHoveredDriveId={setHoveredDriveId}
                              onSelectDrive={handleSelectDrive}
                              mountingDriveId={mountingDriveId}
                              mountError={mountError}
                              openContextMenu={openContextMenu}
                              icon={SolarHardDriveLinear}
                            />
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  {/* ── Section: Removable Devices (USB / Hot-plugged Disks) ── */}
                  <Show when={removableDrives().length > 0}>
                    <div class="flex flex-col pt-3">
                      <div
                        class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
                        onClick={() => setRemovableOpen(!removableOpen())}
                      >
                        <span>Removable Devices</span>
                      </div>

                      <Show when={removableOpen()}>
                        <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
                          <For each={removableDrives()}>
                            {(drive) => (
                              <DriveItemRow
                                drive={drive}
                                activePlaceId={activePlaceId}
                                currentPath={currentPath}
                                hoveredDriveId={hoveredDriveId}
                                setHoveredDriveId={setHoveredDriveId}
                                onSelectDrive={handleSelectDrive}
                                mountingDriveId={mountingDriveId}
                                mountError={mountError}
                                openContextMenu={openContextMenu}
                                icon={UsbDriveIcon}
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </Show>
              </Show>

              {/* 2. Real Git Tasks View ── */}
              <Show when={activeSidebarView() === 'tasks'}>
                <div class="flex flex-col gap-px">
                  <Show
                    when={filteredCommits().length > 0}
                    fallback={
                      <div class="px-2 py-8 text-center text-[13px] text-white/40 select-none">
                        <p>
                          {searchQuery().trim()
                            ? `No commits matching "${searchQuery().trim()}".`
                            : 'No Git commits found.'}
                        </p>
                        <div class="mt-2 flex justify-center">
                          <DitherButton
                            variant="outline"
                            color="ink"
                            size="sm"
                            onClick={refreshGitData}
                          >
                            Check again
                          </DitherButton>
                        </div>
                      </div>
                    }
                  >
                    <For each={filteredCommits()}>
                      {(commit, index) => (
                        <>
                          {/* Visual stage break after the second row */}
                          <Show when={index() === 2}>
                            <div aria-hidden class="h-2.5 shrink-0" />
                          </Show>
                          <GitCommitRow
                            commit={commit}
                            index={index()}
                            active={selectedCommitHash() === commit.hash}
                            isChild={index() === 1}
                            copied={copiedHash() === commit.hash}
                            onSelect={() => setSelectedCommitHash(commit.hash)}
                            onCopyHash={() => copyCommitHash(commit.hash)}
                          />
                        </>
                      )}
                    </For>

                    {/* Shortcut Hint Row directly under the commits */}
                    <Show when={filteredCommits().length > 1}>
                      <div class="mt-2 flex min-h-7 items-center justify-between pr-0.5 pl-2 text-[12.5px] text-white/35">
                        <span>Switch tasks</span>
                        <KbdHint combo="Mod+Shift+↑ ↓" muted />
                      </div>
                    </Show>
                  </Show>
                </div>
              </Show>

              {/* ── 3. Chat Sessions View (Authentic Reference Code) ── */}
              <Show when={activeSidebarView() === 'chat'}>
                {/* Active / Recent Chat Sessions List */}
                <div class="px-1 flex flex-col gap-2">
                  <Show when={filteredSessions().length === 0}>
                    <div class="py-8 px-4 text-center flex flex-col items-center gap-2 text-white/35 select-none">
                      <SolarGhostBold class="w-7 h-7 opacity-40 mb-1 text-[var(--accent)]" />
                      <p class="text-[13px] font-medium text-white/60">No conversations yet</p>
                      <p class="text-[11.5px] leading-relaxed max-w-[200px]">
                        Start a new conversation to brainstorm, draft, or code.
                      </p>
                      <DitherButton
                        variant="filled"
                        color="ink"
                        size="sm"
                        onClick={handleNewChatGlobal}
                        class="mt-2 gap-1.5"
                      >
                        <PlusIcon class="w-3.5 h-3.5" />
                        <span>Start Chat</span>
                      </DitherButton>
                    </div>
                  </Show>

                  <For each={activeSessions()}>
                    {(session: ChatSessionSummary) => {
                      const isActive = () => currentChatSessionId() === session.id

                      return (
                        <div
                          onClick={() => {
                            setCurrentChatSessionId(session.id)
                            setCurrentView('chat')
                          }}
                          class={`group relative w-full cursor-pointer overflow-hidden rounded-md transition-colors px-2.5 py-2 flex flex-col gap-1 ${
                            isActive() ? 'bg-white/[0.08]' : 'bg-transparent hover:bg-white/[0.04]'
                          }`}
                        >
                          <SessionCardBody
                            session={session}
                            showActiveBadge={isActive()}
                            brightTitle={isActive()}
                            onDelete={() => handleDeleteSessionGlobal(session.id)}
                          />
                        </div>
                      )
                    }}
                  </For>
                </div>

                {/* Settled Chat Sessions Header */}
                <Show when={settledSessions().length > 0}>
                  <div class="mt-6 mb-3 flex items-center gap-3 px-2">
                    <span class="text-[12px] font-semibold text-white/30 tracking-wide">
                      Settled
                    </span>
                    <div class="h-[1px] flex-1 bg-white/[0.04]" />
                  </div>

                  {/* Settled Chat Sessions List — expands into the full card */}
                  <div class="px-1 flex flex-col gap-[2px]">
                    <For each={settledSessions()}>
                      {(session: ChatSessionSummary) => {
                        const isActive = () => currentChatSessionId() === session.id
                        const expanded = () => expandedSettledId() === session.id
                        const openSession = (): void => {
                          setCurrentChatSessionId(session.id)
                          setCurrentView('chat')
                        }

                        return (
                          <div
                            onClick={openSession}
                            onMouseEnter={() => setExpandedSettledId(session.id)}
                            onMouseLeave={() =>
                              setExpandedSettledId((id) => (id === session.id ? null : id))
                            }
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                openSession()
                              } else if (e.key === 'Delete' || e.key === 'Backspace') {
                                e.preventDefault()
                                handleDeleteSessionGlobal(session.id)
                              }
                            }}
                            class={`group rounded-md cursor-pointer outline-none transition-colors focus-visible:bg-white/[0.05] ${
                              expanded() || isActive()
                                ? 'bg-[#0c0c0c] text-white/90'
                                : 'hover:bg-white/[0.03] text-white/50 hover:text-white/80'
                            }`}
                          >
                            <div class="flex items-center gap-2.5 px-2.5 h-9">
                              <img
                                src={`${ICON_BASE}/${session.modelIcon}.svg`}
                                alt=""
                                class="w-3.5 h-3.5 shrink-0 opacity-70"
                                style={{
                                  filter: !session.modelIcon.endsWith('-color')
                                    ? 'invert(1) brightness(2)'
                                    : 'none'
                                }}
                                onError={(e) => {
                                  e.currentTarget.src = `${ICON_BASE}/opencode.svg`
                                  e.currentTarget.style.filter = 'invert(1) brightness(2)'
                                }}
                              />
                              <span
                                title={`${session.title || 'Conversation'}${
                                  session.fileRefs?.length
                                    ? ` — ${session.fileRefs.join(', ')}`
                                    : ''
                                }${session.preview ? ` — ${session.preview}` : ''}`}
                                class={`flex-1 text-[13px] truncate font-medium transition-colors ${
                                  expanded() || isActive() ? 'text-white/90' : ''
                                }`}
                              >
                                {session.title || 'Conversation'}
                              </span>
                              <Show when={session.fileRefs && session.fileRefs.length > 0}>
                                <span
                                  title={session.fileRefs!.join(', ')}
                                  class="flex items-center gap-1 text-[10.5px] font-mono text-white/30 shrink-0 max-w-[90px]"
                                >
                                  <SolarFileTextLinear class="w-2.5 h-2.5 shrink-0 opacity-70" />
                                  <span class="truncate">{session.fileRefs![0]}</span>
                                </span>
                              </Show>
                              <span
                                class={`text-[11.5px] font-medium w-7 text-right transition-colors ${
                                  isActive()
                                    ? 'text-[var(--accent)]'
                                    : 'text-white/30 group-hover:text-white/50'
                                }`}
                              >
                                {timeAgo(Math.floor(session.updatedAt / 1000))}
                              </span>
                            </div>
                            <div
                              class="grid transition-[grid-template-rows] duration-300 ease-out"
                              style={{
                                'grid-template-rows': expanded() ? '1fr' : '0fr'
                              }}
                            >
                              <div class="overflow-hidden">
                                <div
                                  class={`px-2.5 pb-2 flex flex-col gap-1 transition-opacity duration-200 ${
                                    expanded() ? 'opacity-100' : 'opacity-0'
                                  }`}
                                >
                                  <SessionCardBody
                                    session={session}
                                    showActiveBadge={isActive()}
                                    brightTitle={isActive()}
                                    onDelete={() => handleDeleteSessionGlobal(session.id)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>

            {/* ── Bottom Update / Version Row ── */}
            <div class="shrink-0 px-3 pb-3 pt-1.5 mt-auto">
              <button
                type="button"
                onClick={() => setCurrentView('settings')}
                class="group w-full flex items-center justify-between py-1 text-[13px] text-white/85 hover:text-white transition-colors cursor-pointer"
              >
                <span class="flex items-center gap-2 font-medium">
                  <RotateCwIcon class="w-3.5 h-3.5 text-white/70 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Restart to update</span>
                </span>
                <span class="font-mono text-[12px] text-white/40 group-hover:text-white/60 transition-colors">
                  v0.22.3
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* New Note Glassmorphism Modal */}
      <Show when={isNewNoteModalOpen()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            onClick={() => setIsNewNoteModalOpen(false)}
          />

          <div class="relative w-[400px] bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col animate-[scaleUp_300ms_cubic-bezier(0.16,1,0.3,1)]">
            <div class="px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <h2 class="text-[16px] font-bold text-white/90">Create New Note</h2>
              <p class="text-[13px] text-white/40 mt-1">
                Enter a title for your new markdown file.
              </p>
            </div>

            <div class="p-5">
              <input
                type="text"
                value={newNoteName()}
                onInput={(e) => setNewNoteName(e.currentTarget.value)}
                placeholder="e.g. Brainstorming Session"
                class="w-full h-[40px] bg-black/40 border border-white/10 rounded-lg px-3 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-[var(--accent)] focus:bg-white/[0.02] transition-colors shadow-inner"
                autofocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNote()
                  if (e.key === 'Escape') {
                    setIsNewNoteModalOpen(false)
                    setNewNoteName('')
                  }
                }}
              />
            </div>

            <div class="px-5 py-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNewNoteModalOpen(false)
                  setNewNoteName('')
                }}
                class="px-4 h-[32px] rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                class="px-4 h-[32px] rounded-md text-[13px] font-medium text-black bg-white hover:bg-white/90 transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Animation Styles */}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}

export default Sidebar
