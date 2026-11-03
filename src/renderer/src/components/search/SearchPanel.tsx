import {
  Component,
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onCleanup,
  onMount
} from 'solid-js'
import {
  globalSearchQuery,
  setGlobalSearchQuery,
  globalSearchCaseSensitive,
  setGlobalSearchCaseSensitive,
  globalSearchWholeWord,
  setGlobalSearchWholeWord,
  openFileAtLocation
} from '../../store'
import type { TextMatch, TextSearchResult } from '../../types'
import { SolarMagniferLinear } from '../ui/SolarIcons'

interface FileGroup {
  file: string
  path: string
  matches: TextMatch[]
}

const ChevronRightIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M9 5l7 7-7 7"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const CloseIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

// Highlight needle in preview text
const renderHighlightedSnippet = (lineText: string, query: string, caseSensitive: boolean) => {
  if (!query) return lineText
  const qLower = query.toLowerCase()
  const textToSearch = caseSensitive ? lineText : lineText.toLowerCase()
  const targetQuery = caseSensitive ? query : qLower

  const parts: Array<{ text: string; isMatch: boolean }> = []
  let cursor = 0

  while (cursor < lineText.length) {
    const idx = textToSearch.indexOf(targetQuery, cursor)
    if (idx === -1) {
      parts.push({ text: lineText.slice(cursor), isMatch: false })
      break
    }
    if (idx > cursor) {
      parts.push({ text: lineText.slice(cursor, idx), isMatch: false })
    }
    parts.push({ text: lineText.slice(idx, idx + query.length), isMatch: true })
    cursor = idx + query.length
  }

  return (
    <span class="font-mono text-[11.5px] leading-relaxed break-all">
      <For each={parts}>
        {(part) =>
          part.isMatch ? (
            <span class="rounded-[3px] bg-[var(--accent)]/20 px-0.5 text-[var(--accent)] font-medium">
              {part.text}
            </span>
          ) : (
            <span>{part.text}</span>
          )
        }
      </For>
    </span>
  )
}

export const SearchPanel: Component = () => {
  let searchInputRef: HTMLInputElement | undefined = undefined
  let searchTimer: ReturnType<typeof setTimeout> | undefined = undefined

  const [isSearching, setIsSearching] = createSignal(false)
  const [result, setResult] = createSignal<TextSearchResult | null>(null)
  const [collapsedFiles, setCollapsedFiles] = createSignal<Set<string>>(new Set())

  const toggleFileCollapse = (path: string): void => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const collapseAll = (): void => {
    const groups = fileGroups()
    setCollapsedFiles(new Set(groups.map((g) => g.path)))
  }

  const expandAll = (): void => {
    setCollapsedFiles(new Set<string>())
  }

  const runSearch = async (
    query: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ): Promise<void> => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResult(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      if (window.api?.searchText) {
        const res = await window.api.searchText(trimmed, {
          caseSensitive,
          wholeWord,
          maxResults: 200
        })
        setResult(res)
      }
    } catch (err) {
      console.warn('Text search error:', err)
      setResult(null)
    } finally {
      setIsSearching(false)
    }
  }

  // Trigger search on query / option changes with 80ms debounce
  createEffect(() => {
    const q = globalSearchQuery()
    const cs = globalSearchCaseSensitive()
    const ww = globalSearchWholeWord()

    if (searchTimer) clearTimeout(searchTimer)

    if (!q.trim()) {
      setResult(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimer = setTimeout(() => {
      runSearch(q, cs, ww)
    }, 80)
  })

  onCleanup(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  onMount(() => {
    searchInputRef?.focus()
  })

  // Group matches by file path
  const fileGroups = createMemo<FileGroup[]>(() => {
    const r = result()
    if (!r || !r.matches || r.matches.length === 0) return []

    const map = new Map<string, FileGroup>()
    for (const match of r.matches) {
      let group = map.get(match.path)
      if (!group) {
        group = {
          file: match.file,
          path: match.path,
          matches: []
        }
        map.set(match.path, group)
      }
      group.matches.push(match)
    }
    return Array.from(map.values())
  })

  const totalMatchesCount = createMemo(() => result()?.total_matches ?? 0)
  const filesCount = createMemo(() => fileGroups().length)

  return (
    <div class="flex flex-col h-full select-none">
      {/* Search Input Box */}
      <div class="flex flex-col gap-1.5 px-2 pt-1 pb-2">
        <div class="relative flex items-center">
          <SolarMagniferLinear class="absolute left-2.5 w-3.5 h-3.5 text-white/35 pointer-events-none" />
          <input
            ref={(el) => (searchInputRef = el)}
            type="text"
            value={globalSearchQuery()}
            onInput={(e) => setGlobalSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setGlobalSearchQuery('')
              } else if (e.key === 'Enter') {
                if (searchTimer) clearTimeout(searchTimer)
                runSearch(globalSearchQuery(), globalSearchCaseSensitive(), globalSearchWholeWord())
              }
            }}
            placeholder="Search across files..."
            class="w-full h-8 pl-8 pr-16 rounded-md bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.07] border border-white/[0.08] focus:border-[var(--accent)]/50 text-[12.5px] text-white/90 placeholder:text-white/30 focus:outline-none transition-all"
          />

          {/* Right Action Icons in Input: Case sensitivity, Whole word, Clear */}
          <div class="absolute right-1.5 flex items-center gap-0.5">
            <Show when={globalSearchQuery().length > 0}>
              <button
                type="button"
                onClick={() => setGlobalSearchQuery('')}
                aria-label="Clear search"
                title="Clear"
                class="w-5 h-5 flex items-center justify-center rounded text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                <CloseIcon class="w-3 h-3" />
              </button>
            </Show>

            {/* Case Sensitivity Toggle */}
            <button
              type="button"
              onClick={() => setGlobalSearchCaseSensitive((prev) => !prev)}
              aria-label="Match Case"
              title="Match Case (Alt+C)"
              class={`h-5 px-1 flex items-center justify-center rounded font-mono text-[10px] font-medium border transition-colors cursor-pointer ${
                globalSearchCaseSensitive()
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40'
                  : 'text-white/40 hover:text-white/70 border-transparent hover:bg-white/[0.05]'
              }`}
            >
              Aa
            </button>

            {/* Whole Word Toggle */}
            <button
              type="button"
              onClick={() => setGlobalSearchWholeWord((prev) => !prev)}
              aria-label="Match Whole Word"
              title="Match Whole Word (Alt+W)"
              class={`h-5 px-1 flex items-center justify-center rounded font-mono text-[10px] font-medium border transition-colors cursor-pointer ${
                globalSearchWholeWord()
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40'
                  : 'text-white/40 hover:text-white/70 border-transparent hover:bg-white/[0.05]'
              }`}
            >
              \b
            </button>
          </div>
        </div>

        {/* Stats Summary & Action Bar */}
        <div class="flex items-center justify-between min-h-[22px] px-0.5 text-[11px] text-white/40">
          <Show
            when={!isSearching()}
            fallback={
              <div class="flex items-center gap-1.5 text-white/50">
                <span class="w-3 h-3 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin" />
                <span>Searching codebase...</span>
              </div>
            }
          >
            <Show
              when={result() !== null && globalSearchQuery().trim().length > 0}
              fallback={
                <span class="text-white/30">
                  {globalSearchQuery().trim().length === 0
                    ? 'Type to search project'
                    : 'Ready to search'}
                </span>
              }
            >
              <Show
                when={totalMatchesCount() > 0}
                fallback={<span class="text-white/40">No results found</span>}
              >
                <span>
                  {totalMatchesCount()} {totalMatchesCount() === 1 ? 'result' : 'results'} in{' '}
                  {filesCount()} {filesCount() === 1 ? 'file' : 'files'}{' '}
                  <span class="text-white/25">({result()?.elapsed_ms}ms)</span>
                </span>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={collapseAll}
                    title="Collapse all"
                    class="hover:text-white/80 transition-colors cursor-pointer px-1 py-0.5 rounded"
                  >
                    Collapse
                  </button>
                  <span class="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={expandAll}
                    title="Expand all"
                    class="hover:text-white/80 transition-colors cursor-pointer px-1 py-0.5 rounded"
                  >
                    Expand
                  </button>
                </div>
              </Show>
            </Show>
          </Show>
        </div>
      </div>

      {/* Results Tree View */}
      <div class="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1 pb-4">
        <For each={fileGroups()}>
          {(group) => {
            const isCollapsed = () => collapsedFiles().has(group.path)
            const fileName = () => group.file.split(/[/\\]/).pop() || group.file
            const dirName = () => {
              const parts = group.file.split(/[/\\]/)
              parts.pop()
              return parts.join('/')
            }

            return (
              <div class="flex flex-col">
                {/* File Header Row */}
                <button
                  type="button"
                  onClick={() => toggleFileCollapse(group.path)}
                  class="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-left hover:bg-white/[0.04] transition-colors cursor-pointer group/file"
                >
                  <ChevronRightIcon
                    class={`w-3.5 h-3.5 text-white/30 transition-transform duration-150 ${
                      isCollapsed() ? '' : 'rotate-90'
                    }`}
                  />
                  <div class="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span class="text-[12.5px] font-medium text-white/85 truncate">
                      {fileName()}
                    </span>
                    <Show when={dirName()}>
                      <span class="text-[11px] text-white/30 truncate">{dirName()}</span>
                    </Show>
                  </div>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 group-hover/file:text-white/70">
                    {group.matches.length}
                  </span>
                </button>

                {/* Match Lines in this File */}
                <Show when={!isCollapsed()}>
                  <div class="flex flex-col pl-4 pr-1 gap-px mt-0.5">
                    <For each={group.matches}>
                      {(match) => (
                        <button
                          type="button"
                          onClick={() => {
                            openFileAtLocation(match.path, fileName(), match.line, match.column)
                          }}
                          class="flex items-baseline gap-2 w-full px-2 py-1 rounded text-left hover:bg-white/[0.06] transition-colors cursor-pointer text-white/60 hover:text-white group/match"
                        >
                          <span class="w-8 shrink-0 font-mono text-[10.5px] text-white/30 group-hover/match:text-white/50 text-right">
                            {match.line}
                          </span>
                          <span class="flex-1 truncate">
                            {renderHighlightedSnippet(
                              match.line_text,
                              globalSearchQuery(),
                              globalSearchCaseSensitive()
                            )}
                          </span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}

export default SearchPanel
