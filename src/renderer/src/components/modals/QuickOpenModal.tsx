import {
  Component,
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  on,
  onCleanup,
  untrack,
  type JSX
} from 'solid-js'
import {
  isQuickOpenOpen,
  setIsQuickOpenOpen,
  openFileInEditor,
  openFileAtLocation,
  openTabs,
  workspaceRoot
} from '../../store'
import type { SearchResult } from '../../types'
import { I } from '../ui/AppIcons'
import { FileIcon } from '../file-tree/FileIcon'

/* ─────────────────────────── Constants ─────────────────────────── */

const LOCATION_SUFFIX_RE = /[:#]\d*(?::\d*)?$/
const LOCATION_TARGET_RE = /[:#](\d+)(?::(\d+))?$/

const MAX_RESULTS = 50
const SEARCH_DEBOUNCE_MS = 16
const TYPING_IDLE_MS = 450
const FALLBACK_WORKSPACE_NAME = 'ember-ide'
const FALLBACK_FONT = '400 14px -apple-system, BlinkMacSystemFont, sans-serif'
const MIN_THUMB_HEIGHT = 28

type HintKey = 'up' | 'down' | (string & {})

const FOOTER_HINTS: { keys: HintKey[]; label: string }[] = [
  { keys: ['up', 'down'], label: 'Navigate' },
  { keys: ['Enter'], label: 'Open file' },
  { keys: ['Esc'], label: 'Back' }
]

/* ─────────────────────────── Helpers ─────────────────────────── */

const stripLocation = (q: string): string => q.replace(LOCATION_SUFFIX_RE, '').trim()

let measureCtx: CanvasRenderingContext2D | null = null
function getTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return 0
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return 0
  if (measureCtx.font !== font) measureCtx.font = font
  return measureCtx.measureText(text).width
}

function findMatchIndices(value: string, query: string): number[] {
  if (!query) return []
  const v = value.toLowerCase()
  const q = query.toLowerCase()
  const indices: number[] = []
  let qi = 0

  for (let vi = 0; vi < v.length; vi += 1) {
    if (v[vi] !== q[qi]) continue
    indices.push(vi)
    qi += 1
    if (qi === q.length) break
  }
  return indices
}

function renderHighlightedName(name: string, cleanQuery: string): JSX.Element {
  if (!cleanQuery) return name
  const indices = findMatchIndices(name, cleanQuery)
  if (indices.length === 0) return name

  const parts: JSX.Element[] = []
  let cursor = 0
  let i = 0

  while (i < indices.length) {
    const runStart = indices[i]!
    let runEnd = runStart + 1
    while (i + 1 < indices.length && indices[i + 1] === runEnd) {
      i += 1
      runEnd += 1
    }
    if (runStart > cursor) {
      parts.push(<span class="text-white/60">{name.slice(cursor, runStart)}</span>)
    }
    parts.push(<span class="text-white">{name.slice(runStart, runEnd)}</span>)
    cursor = runEnd
    i += 1
  }
  if (cursor < name.length) {
    parts.push(<span class="text-white/60">{name.slice(cursor)}</span>)
  }
  return parts
}

function getWorkspaceName(): string {
  const root = workspaceRoot()
  if (!root) return FALLBACK_WORKSPACE_NAME
  const parts = root.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] || FALLBACK_WORKSPACE_NAME
}

const tabsAsResults = (): SearchResult[] =>
  untrack(() => openTabs()).map((t) => ({
    name: t.name,
    path: t.path,
    relativePath: t.name
  }))

/* ─────────────────────────── Small components ─────────────────────────── */


const ArrowIcon: Component<{ dir: 'up' | 'down' }> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    class="h-[11px] w-[11px]"
    classList={{ 'rotate-180': props.dir === 'down' }}
  >
    <path
      d="M8 13V3M3.75 7.25L8 3l4.25 4.25"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const Kbd: Component<{ children: JSX.Element }> = (props) => (
  <kbd class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-white/[0.07] px-1 font-mono text-[10px] font-medium leading-none text-white/65">
    {props.children}
  </kbd>
)

const HintKey: Component<{ k: HintKey }> = (props) => (
  <Kbd>
    <Show when={props.k === 'up' || props.k === 'down'} fallback={props.k}>
      <ArrowIcon dir={props.k === 'up' ? 'up' : 'down'} />
    </Show>
  </Kbd>
)

/* ─────────────────────────── Modal ─────────────────────────── */

export const QuickOpenModal: Component = () => {
  let inputRef: HTMLInputElement | undefined
  let listRef: HTMLDivElement | undefined
  let trackRef: HTMLDivElement | undefined

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let typingTimer: ReturnType<typeof setTimeout> | undefined
  let focusRaf = 0
  let caretRaf = 0
  let pillRaf = 0
  let scrollGlideTimer: ReturnType<typeof setTimeout> | undefined

  let searchId = 0
  let cachedFont = ''
  let lastMeasuredResults: SearchResult[] | undefined

  // Scrollbar drag states
  let isDraggingScroll = false
  let dragStartY = 0
  let dragStartScrollTop = 0

  const [query, setQuery] = createSignal('')
  const [results, setResults] = createSignal<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [isSearching, setIsSearching] = createSignal(false)

  // Gliding highlight pill
  const [pill, setPill] = createSignal({ y: 0, h: 48 })
  const [pillGlide, setPillGlide] = createSignal(false)

  // Expressive scroll indicator
  const [canScroll, setCanScroll] = createSignal(false)
  const [thumbTop, setThumbTop] = createSignal(0)
  const [thumbHeight, setThumbHeight] = createSignal(MIN_THUMB_HEIGHT)
  const [scrollGlide, setScrollGlide] = createSignal(false)
  const [isHoveringScroll, setIsHoveringScroll] = createSignal(false)

  // Gliding caret
  const [caretX, setCaretX] = createSignal(0)
  const [inputFocused, setInputFocused] = createSignal(false)
  const [hasRangeSelection, setHasRangeSelection] = createSignal(false)
  const [isTyping, setIsTyping] = createSignal(false)

  const cleanQuery = createMemo(() => stripLocation(query()))
  const caretVisible = createMemo(() => inputFocused() && !hasRangeSelection())
  const workspaceName = createMemo(getWorkspaceName)
  const isSelected = createSelector(selectedIndex)

  /* ── Caret ── */

  const syncCaret = (): void => {
    const input = inputRef
    if (!input) return

    if (!cachedFont) {
      const cs = window.getComputedStyle(input)
      cachedFont = cs.fontSize
        ? `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        : FALLBACK_FONT
    }

    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    const width = getTextWidth(input.value.slice(0, start), cachedFont)
    const maxOffset = Math.max(0, input.clientWidth - 2)

    batch(() => {
      setHasRangeSelection(start !== end)
      setCaretX(Math.min(maxOffset, Math.max(0, width - input.scrollLeft)))
    })
  }

  const scheduleCaretSync = (): void => {
    if (caretRaf) return
    caretRaf = requestAnimationFrame(() => {
      caretRaf = 0
      syncCaret()
    })
  }

  /* ── Scrollbar Metrics ── */

  const updateScrollMetrics = (smooth = false): void => {
    const el = listRef
    const track = trackRef
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight > clientHeight + 1
    setCanScroll(scrollable)

    if (!scrollable || !track) return

    const trackHeight = track.clientHeight
    const computedHeight = Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * trackHeight)
    const maxScroll = scrollHeight - clientHeight
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0
    const computedTop = ratio * (trackHeight - computedHeight)

    batch(() => {
      setThumbHeight(computedHeight)
      setThumbTop(computedTop)
      if (smooth) {
        setScrollGlide(true)
        clearTimeout(scrollGlideTimer)
        scrollGlideTimer = setTimeout(() => setScrollGlide(false), 200)
      } else {
        setScrollGlide(false)
      }
    })
  }

  const handleListScroll = (): void => {
    if (!isDraggingScroll) {
      updateScrollMetrics(false)
    }
  }

  /* ── Search & Navigation ── */

  const close = (): void => {
    searchId += 1
    clearTimeout(debounceTimer)
    clearTimeout(typingTimer)
    clearTimeout(scrollGlideTimer)
    batch(() => {
      setIsQuickOpenOpen(false)
      setQuery('')
      setCaretX(0)
      setIsTyping(false)
      setPillGlide(false)
    })
  }

  const selectItem = (item: SearchResult): void => {
    const match = query().match(LOCATION_TARGET_RE)
    if (match?.[1]) {
      const line = parseInt(match[1], 10)
      const col = match[2] ? parseInt(match[2], 10) : 1
      openFileAtLocation(item.path, item.name, line, col)
    } else {
      openFileInEditor(item.path, item.name)
    }
    close()
  }

  const fetchResults = async (raw: string): Promise<void> => {
    const q = stripLocation(raw)
    const id = ++searchId

    if (!q) {
      batch(() => {
        setResults(tabsAsResults())
        setSelectedIndex(0)
        setIsSearching(false)
      })
      requestAnimationFrame(() => updateScrollMetrics(false))
      return
    }

    const api = window.api
    if (!api?.searchFiles) return

    setIsSearching(true)
    try {
      const res = await api.searchFiles(q)
      if (id !== searchId) return
      batch(() => {
        setResults(res.slice(0, MAX_RESULTS))
        setSelectedIndex(0)
      })
      requestAnimationFrame(() => updateScrollMetrics(false))
    } catch (err) {
      if (id !== searchId) return
      console.warn('Quick open search failed:', err)
      setResults([])
    } finally {
      if (id === searchId) setIsSearching(false)
    }
  }

  /* ── Lifecycle ── */

  createEffect(
    on(isQuickOpenOpen, (open) => {
      if (!open) return
      batch(() => {
        setQuery('')
        setCaretX(0)
        setSelectedIndex(0)
        setIsSearching(false)
        setHasRangeSelection(false)
        setResults(tabsAsResults())
      })
      cancelAnimationFrame(focusRaf)
      focusRaf = requestAnimationFrame(() => {
        inputRef?.focus({ preventScroll: true })
        syncCaret()
        updateScrollMetrics(false)
      })
    })
  )

  createEffect(() => {
    const list = results()
    const idx = selectedIndex()

    if (!isQuickOpenOpen() || list.length === 0) {
      lastMeasuredResults = undefined
      setPillGlide(false)
      return
    }

    const el = listRef?.querySelector<HTMLElement>(`[data-index="${idx}"]`)
    if (!el) return

    const glide = list === lastMeasuredResults
    lastMeasuredResults = list

    batch(() => {
      setPill({ y: el.offsetTop, h: el.offsetHeight })
      if (glide) {
        setPillGlide(true)
      } else {
        setPillGlide(false)
        cancelAnimationFrame(pillRaf)
        pillRaf = requestAnimationFrame(() => setPillGlide(true))
      }
    })
  })

  // Global listeners for scroll thumb drag
  const onWindowMouseMove = (e: MouseEvent): void => {
    if (!isDraggingScroll || !listRef || !trackRef) return
    const trackHeight = trackRef.clientHeight
    const availableTrack = trackHeight - thumbHeight()
    const maxScroll = listRef.scrollHeight - listRef.clientHeight
    if (availableTrack <= 0 || maxScroll <= 0) return

    const deltaY = e.clientY - dragStartY
    const deltaScroll = (deltaY / availableTrack) * maxScroll
    listRef.scrollTop = Math.max(0, Math.min(maxScroll, dragStartScrollTop + deltaScroll))
    updateScrollMetrics(false)
  }

  const onWindowMouseUp = (): void => {
    if (isDraggingScroll) {
      isDraggingScroll = false
      setIsHoveringScroll(false)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
  }

  onCleanup(() => {
    clearTimeout(debounceTimer)
    clearTimeout(typingTimer)
    clearTimeout(scrollGlideTimer)
    cancelAnimationFrame(focusRaf)
    cancelAnimationFrame(caretRaf)
    cancelAnimationFrame(pillRaf)
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
    }
  })

  /* ── Events ── */

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
    const val = e.currentTarget.value
    batch(() => {
      setQuery(val)
      setIsTyping(true)
    })
    syncCaret()

    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => setIsTyping(false), TYPING_IDLE_MS)

    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void fetchResults(val), SEARCH_DEBOUNCE_MS)
  }

  const moveSelection = (next: number): void => {
    setSelectedIndex(next)
    const el = listRef?.querySelector<HTMLElement>(`[data-index="${next}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
      updateScrollMetrics(true)
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.isComposing) return

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        close()
        return
      case 'Tab':
        e.preventDefault()
        return
      case 'ArrowDown':
      case 'ArrowUp': {
        const items = results()
        if (items.length === 0) return
        e.preventDefault()
        const step = e.key === 'ArrowDown' ? 1 : -1
        moveSelection((selectedIndex() + step + items.length) % items.length)
        return
      }
      case 'Enter': {
        e.preventDefault()
        const current = results()[selectedIndex()]
        if (current) selectItem(current)
        return
      }
      default:
        scheduleCaretSync()
    }
  }

  const handleTrackMouseDown = (e: MouseEvent): void => {
    e.preventDefault()
    const track = trackRef
    const list = listRef
    if (!track || !list) return

    const rect = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const curTop = thumbTop()
    const curHeight = thumbHeight()

    if (clickY >= curTop && clickY <= curTop + curHeight) {
      isDraggingScroll = true
      dragStartY = e.clientY
      dragStartScrollTop = list.scrollTop
      setIsHoveringScroll(true)
    } else {
      const availableTrack = rect.height - curHeight
      const maxScroll = list.scrollHeight - list.clientHeight
      const targetRatio = Math.max(0, Math.min(1, (clickY - curHeight / 2) / availableTrack))
      list.scrollTo({ top: targetRatio * maxScroll, behavior: 'smooth' })
      updateScrollMetrics(true)
    }
  }

  const handleBackdropMouseDown = (e: MouseEvent): void => {
    if (e.target === e.currentTarget) close()
  }

  /* ── Render ── */

  return (
    <Show when={isQuickOpenOpen()}>
      <div
        class="qo-backdrop fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[12vh] backdrop-blur-md select-none sm:pt-[14vh]"
        onMouseDown={handleBackdropMouseDown}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick open"
          class="qo-card flex max-h-[500px] w-[580px] max-w-[92vw] flex-col overflow-hidden rounded-[20px] bg-[#0a0a0a] shadow-[0_36px_90px_rgba(0,0,0,0.9)]"
          onKeyDown={handleKeyDown}
        >
          {/* Search input with gliding caret */}
          <div class="relative flex items-center gap-3 px-4 pt-3.5 pb-2">
            <I.search class="h-[18px] w-[18px] shrink-0 text-white/45" />
            <div class="relative flex min-w-0 flex-1 items-center">
              <input
                ref={(el) => (inputRef = el)}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="qo-listbox"
                aria-activedescendant={
                  results().length > 0 ? `qo-opt-${selectedIndex()}` : undefined
                }
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                value={query()}
                onInput={handleInput}
                onClick={syncCaret}
                onSelect={syncCaret}
                onFocus={() => {
                  setInputFocused(true)
                  cachedFont = ''
                  syncCaret()
                }}
                onBlur={() => {
                  setInputFocused(false)
                  setIsTyping(false)
                }}
                placeholder="Search files…"
                class="w-full bg-transparent text-[14.5px] text-white/95 caret-transparent placeholder:text-white/30 focus:outline-none"
              />
              <span
                aria-hidden="true"
                class="qo-caret pointer-events-none absolute top-1/2 left-0 h-[17px] w-[1.5px] rounded-full bg-white/90 will-change-transform"
                classList={{
                  'opacity-0': !caretVisible(),
                  'opacity-100': caretVisible(),
                  'qo-caret-blink': caretVisible() && !isTyping()
                }}
                style={{ transform: `translate3d(${caretX()}px, -50%, 0)` }}
              />
            </div>
            <Show when={isSearching()}>
              <span class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </Show>
          </div>

          {/* Scope header */}
          <div class="px-4 pb-2 text-[11.5px] font-medium tracking-tight text-white/35">
            {workspaceName()}
          </div>

          {/* Listbox Container with Matte Monochrome Scrollbar */}
          <div class="relative flex min-h-[140px] max-h-[350px] flex-1 overflow-hidden px-2 py-1">
            <div
              id="qo-listbox"
              role="listbox"
              ref={(el) => (listRef = el)}
              onScroll={handleListScroll}
              class="no-scrollbar relative flex flex-1 flex-col gap-0.5 overflow-y-auto pr-3.5"
            >
              <Show
                when={results().length > 0}
                fallback={
                  <div class="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
                    <I.search class="w-7 h-7 text-white/25" />
                    <span class="text-[12.5px] text-white/35">
                      {query().trim()
                        ? 'No matching files'
                        : 'Start typing to search files in workspace'}
                    </span>
                  </div>
                }
              >
                {/* Gliding selection pill */}
                <div
                  aria-hidden="true"
                  class="qo-pill pointer-events-none absolute top-0 right-3.5 left-0 rounded-xl bg-white/[0.07] will-change-transform"
                  classList={{ 'qo-pill-glide': pillGlide() }}
                  style={{
                    height: `${pill().h}px`,
                    transform: `translate3d(0, ${pill().y}px, 0)`
                  }}
                />

                <For each={results()}>
                  {(item, index) => (
                    <button
                      type="button"
                      role="option"
                      id={`qo-opt-${index()}`}
                      data-index={index()}
                      aria-selected={isSelected(index())}
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectItem(item)}
                      onMouseMove={() => {
                        if (selectedIndex() !== index()) setSelectedIndex(index())
                      }}
                      class="relative z-10 flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-100"
                      classList={{
                        'text-white': isSelected(index()),
                        'text-white/70': !isSelected(index())
                      }}
                    >
                      <FileIcon name={item.name} isDirectory={false} class="h-5 w-5 shrink-0" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="truncate text-[13px] leading-snug font-medium text-white/95">
                          {renderHighlightedName(item.name, cleanQuery())}
                        </span>
                        <span class="truncate font-mono text-[11px] leading-tight text-white/35">
                          {item.relativePath}
                        </span>
                      </div>
                    </button>
                  )}
                </For>
              </Show>
            </div>

            {/* Clean Matte Monochrome Scrollbar (Zero Glow) */}
            <Show when={canScroll()}>
              <div
                ref={(el) => (trackRef = el)}
                aria-hidden="true"
                onMouseDown={handleTrackMouseDown}
                onMouseEnter={() => setIsHoveringScroll(true)}
                onMouseLeave={() => {
                  if (!isDraggingScroll) setIsHoveringScroll(false)
                }}
                class="group absolute top-2 right-2.5 bottom-2 z-20 flex w-2.5 cursor-pointer items-center justify-center select-none"
              >
                {/* Thin, static dark line */}
                <div class="relative h-full w-[2.5px] rounded-full bg-white/[0.08] transition-[width,background-color] duration-150 group-hover:w-[3.5px] group-hover:bg-white/[0.12]">
                  {/* Sliding matte highlight */}
                  <div
                    class="qo-scroll-thumb absolute left-0 w-full rounded-full bg-white/60 will-change-transform transition-colors duration-150"
                    classList={{
                      'qo-scroll-glide': scrollGlide(),
                      'bg-white/90': isHoveringScroll()
                    }}
                    style={{
                      height: `${thumbHeight()}px`,
                      transform: `translate3d(0, ${thumbTop()}px, 0)`
                    }}
                  />
                </div>
              </div>
            </Show>
          </div>

          {/* Keybind footer */}
          <div class="flex items-center gap-4 px-4 py-2.5 text-[11px] text-white/40">
            <For each={FOOTER_HINTS}>
              {(hint) => (
                <div class="flex items-center gap-1.5">
                  <div class="flex items-center gap-1">
                    <For each={hint.keys}>{(key) => <HintKey k={key} />}</For>
                  </div>
                  <span>{hint.label}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      <style>{`
        .qo-backdrop {
          --qo-ease: cubic-bezier(0.23, 1, 0.32, 1);
          --qo-caret-ms: 120ms;
          --qo-pill-ms: 190ms;
          animation: qoFadeIn 180ms ease-out;
        }
        .qo-card { animation: qoScaleUp 240ms cubic-bezier(0.16, 1, 0.3, 1); }

        .qo-caret {
          transition:
            transform var(--qo-caret-ms) var(--qo-ease),
            opacity 120ms ease;
        }
        .qo-caret-blink { animation: qoCaretBlink 1.05s ease-in-out infinite; }

        .qo-pill { transition: none; }
        .qo-pill-glide {
          transition:
            transform var(--qo-pill-ms) var(--qo-ease),
            height var(--qo-pill-ms) var(--qo-ease);
        }

        .qo-scroll-thumb { transition: none; }
        .qo-scroll-glide {
          transition:
            transform var(--qo-pill-ms) var(--qo-ease),
            height var(--qo-pill-ms) var(--qo-ease);
        }

        @keyframes qoFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qoScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes qoCaretBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.2; }
        }

        @media (prefers-reduced-motion: reduce) {
          .qo-backdrop, .qo-card, .qo-caret-blink { animation: none; }
          .qo-caret, .qo-pill-glide, .qo-scroll-glide { transition: none; }
        }
      `}</style>
    </Show>
  )
}

export default QuickOpenModal
