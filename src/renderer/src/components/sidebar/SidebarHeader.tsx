import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  type Accessor,
  type Component,
  type Setter
} from 'solid-js'
import { formatShortcut, isMac } from '../../shortcuts'
import {
  currentView,
  explorerMode,
  gitStatus,
  isSidebarPinned,
  previousView,
  refreshGitData,
  setCurrentView,
  setExplorerMode,
  setIsSidebarPinned,
  sidebarSearchFocus,
  toggleSettings
} from '../../store'
import { I } from '../ui/AppIcons'
import { CheckCheckIcon, KbdHint } from './SidebarControls'

const PlacesGlyph = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
)

const TreeGlyph = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M4 4v13a2 2 0 0 0 2 2h3M4 9h5M13 7h7M13 17h7M13 12h4"
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

export const activeSidebarView = (): string =>
  currentView() === 'settings' ? previousView() : currentView()

export const cycleScopeView = (): void => {
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

// Duplicate the slots so the carousel wraps out of view.
const SCOPE_LABELS = ['Files', 'Search', 'Tasks', 'Chat']
const CAROUSEL_SLOTS = [...SCOPE_LABELS, ...SCOPE_LABELS]

const scopeIndex = (): number => {
  const view = activeSidebarView()
  if (view === 'search') return 1
  if (view === 'tasks') return 2
  if (view === 'chat') return 3
  return 0
}

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

export function createSidebarHeader(
  searchQuery: Accessor<string>,
  setSearchQuery: Setter<string>,
  handleNewAction: () => void
) {
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [settledShown, setSettledShown] = createSignal(false)
  const spaces = ['All Spaces', 'Ember', 'Notes']
  const [spaceIndex, setSpaceIndex] = createSignal(0)

  let searchInputRef: HTMLInputElement | undefined = undefined

  const focusSearch = (): void => {
    searchInputRef?.focus()
    searchInputRef?.select()
  }

  const openSearch = (): void => {
    setSearchOpen(true)
    setTimeout(focusSearch, 0)
  }

  createEffect(() => {
    if (sidebarSearchFocus() > 0) openSearch()
  })

  const Header: Component = () => (
    <>
      <div
        class={`relative z-10 flex px-2.5 pt-3 pb-1 drag-region shrink-0 ${isMac() ? 'flex-col gap-y-0.5' : 'items-center justify-between'}`}
      >
        <div class={`flex items-center gap-0.5 no-drag ${isMac() ? 'self-end' : ''}`}>
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
            <I.panel class="w-[16px] h-[16px]" />
          </button>
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
            <I.settings class="w-[16px] h-[16px]" />
          </button>
        </div>
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
      <div class="relative z-10 flex flex-col gap-px px-2 pt-2 shrink-0">
        <button
          type="button"
          onClick={handleNewAction}
          class="w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-[13px] font-normal text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <I.newNote class="w-3.5 h-3.5 text-white/60 shrink-0" />
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
          <I.folder class="w-3.5 h-3.5 text-white/60 shrink-0" />
          <ScopeCarousel />
          <KbdHint combo="Mod+I" />
        </button>

        <Show
          when={searchOpen()}
          fallback={
            <button
              type="button"
              onClick={openSearch}
              class="w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-[13px] font-normal text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <I.search class="w-3.5 h-3.5 text-white/60 shrink-0" />
              <span>Search</span>
              <KbdHint combo="Mod+F" />
            </button>
          }
        >
          <div class="group flex h-7 w-full items-center gap-2 border border-transparent px-1.5 text-[13px]">
            <I.search class="w-3.5 h-3.5 text-white/60 shrink-0" />
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
          <Show
            when={activeSidebarView() === 'files' || activeSidebarView() === 'editor'}
            fallback={
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
            }
          >
            <div
              role="tablist"
              aria-label="Explorer mode"
              class="relative flex items-center h-6 p-0.5 rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/[0.05]"
            >
              <span
                aria-hidden="true"
                class="absolute top-0.5 left-0.5 h-5 w-6 rounded-[5px] bg-white/[0.11] shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: explorerMode() === 'tree' ? 'translateX(24px)' : 'none'
                }}
              />
              <button
                type="button"
                role="tab"
                aria-selected={explorerMode() === 'places'}
                title="Places"
                onClick={() => setExplorerMode('places')}
                class={`relative z-10 w-6 h-5 flex items-center justify-center rounded-[5px] transition-colors cursor-pointer ${
                  explorerMode() === 'places' ? 'text-white' : 'text-white/40 hover:text-white/75'
                }`}
              >
                <PlacesGlyph class="w-3 h-3" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={explorerMode() === 'tree'}
                title="File tree"
                onClick={() => setExplorerMode('tree')}
                class={`relative z-10 w-6 h-5 flex items-center justify-center rounded-[5px] transition-colors cursor-pointer ${
                  explorerMode() === 'tree' ? 'text-white' : 'text-white/40 hover:text-white/75'
                }`}
              >
                <TreeGlyph class="w-3 h-3" />
              </button>
            </div>
          </Show>
        </div>
      </div>
    </>
  )

  return { Header, openSearch }
}
