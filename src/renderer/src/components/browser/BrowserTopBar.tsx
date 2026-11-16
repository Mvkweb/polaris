import { Component, For, Show, createMemo, onCleanup } from 'solid-js'
import {
  canNavigateBack,
  canNavigateForward,
  navigateBack,
  navigateForward,
  navigateTo,
  browserTabs,
  activeTabId,
  openNewTab,
  closeBrowserTab,
  switchTab,
  workspaceRoot,
  browserSearchFilter,
  setBrowserSearchFilter,
  isInspectorOpen,
  toggleInspector,
  isFilterTabActive,
  setBrowserFilterFocused,
  inspectorVisibleWidth,
  inspectorResizing,
  INSPECTOR_TRANSITION
} from '../../store'
import { SolarInfoCircleLinear } from '../ui/SolarIcons'

/* ── Monodrive Exact Hugeicons SVGs ── */
const ChevronLeftIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-4 h-4'}
  >
    <path
      d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const ChevronRightIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-4 h-4'}
  >
    <path
      d="M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const Add01Icon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-3.5 h-3.5'}
  >
    <path
      d="M12.001 5.00003V19.002M19.002 12.002L4.99998 12.002"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const SearchIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-3.5 h-3.5'}
  >
    <path
      d="M17 17L21 21M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
    />
  </svg>
)

export const BrowserTopBar: Component = () => {
  const currentPath = () => workspaceRoot() || '.'

  const pathParts = createMemo(() => {
    return currentPath().split(/[/\\]/).filter(Boolean)
  })

  const parentFolder = createMemo(() => {
    const parts = pathParts()
    if (parts.length <= 1) return null
    const parentPath = '/' + parts.slice(0, parts.length - 1).join('/')
    return {
      name: parts[parts.length - 2],
      path: parentPath
    }
  })

  const hasMultipleTabs = () => browserTabs().length > 1

  // "/" focuses the filter from anywhere that isn't already taking text input.
  let filterInputRef: HTMLInputElement | undefined
  const focusFilterOnSlash = (e: KeyboardEvent): void => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
    const el = document.activeElement as HTMLElement | null
    if (el?.closest('input, textarea, [contenteditable="true"], .cm-editor, .xterm')) return
    e.preventDefault()
    filterInputRef?.focus()
    filterInputRef?.select()
  }
  window.addEventListener('keydown', focusFilterOnSlash)
  onCleanup(() => window.removeEventListener('keydown', focusFilterOnSlash))

  return (
    <header class="relative z-20 shrink-0 h-9 pl-2 mb-2 flex items-center justify-between bg-transparent select-none">
      {/* ── Left: Navigation History Chevrons & Tab Pills ── */}
      <div class="flex items-center gap-1.5">
        {/* Back & Forward Chevrons */}
        <div class="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            onClick={navigateBack}
            disabled={!canNavigateBack()}
            class={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              canNavigateBack()
                ? 'text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            title="Back (Backspace)"
          >
            <ChevronLeftIcon />
          </button>

          <button
            type="button"
            onClick={navigateForward}
            disabled={!canNavigateForward()}
            class={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              canNavigateForward()
                ? 'text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            title="Forward"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Tabs / Pills (Sitting directly on window base above canvas) */}
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Show
            when={hasMultipleTabs()}
            fallback={
              /* Single Tab View: Shows Parent Pill + Active Pill */
              <>
                <Show when={parentFolder()}>
                  {(parent) => (
                    <button
                      type="button"
                      onClick={() => navigateTo(parent().path)}
                      class="px-2.5 py-1 rounded-full text-[13px] font-medium text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-all cursor-pointer"
                      title={`Up to ${parent().name}`}
                    >
                      {parent().name}
                    </button>
                  )}
                </Show>

                {/* Active Tab Pill */}
                <div class="px-3.5 py-1 rounded-full bg-white/[0.10] text-white text-[13px] font-medium shadow-sm flex items-center gap-1.5">
                  <span>{browserTabs()[0]?.name || 'folder'}</span>
                </div>
              </>
            }
          >
            {/* Multi-Tab View: Shows all open tabs */}
            <For each={browserTabs()}>
              {(tab) => {
                const isActive = () => activeTabId() === tab.id

                return (
                  <div
                    onClick={() => switchTab(tab.id)}
                    class={`group px-3 py-1 rounded-full text-[13px] font-medium transition-all cursor-pointer flex items-center gap-2 ${
                      isActive()
                        ? 'bg-white/[0.10] text-white shadow-sm'
                        : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    <span>{tab.name}</span>
                    <button
                      type="button"
                      onClick={(e) => closeBrowserTab(tab.id, e)}
                      class="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[11px] text-white/60 hover:text-white transition-opacity leading-none"
                      title="Close Tab"
                    >
                      ×
                    </button>
                  </div>
                )
              }}
            </For>
          </Show>

          {/* New Tab Button */}
          <button
            type="button"
            onClick={() => openNewTab()}
            class="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="New Tab"
          >
            <Add01Icon />
          </button>
        </div>
      </div>

      {/* ── Right: filter tab ──
           Transparent at rest. When the filter is focused or holds a query, a
           canvas-coloured fill rises out of the canvas below (clip-path wipe), a
           concave fillet blooms on its left and the canvas' corner squares off, so
           the field reads as melted into the canvas. Rides along with the
           inspector drawer so it always caps the canvas edge. */}
      <div
        class="relative isolate self-end shrink-0 flex items-start gap-1 h-[45px] -mb-[9px] pt-1 pl-1.5 pr-2"
        data-active={isFilterTabActive() ? '' : undefined}
        style={{
          'margin-right': `${inspectorVisibleWidth()}px`,
          transition: inspectorResizing() ? 'none' : `margin-right ${INSPECTOR_TRANSITION}`
        }}
      >
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 -z-10 rounded-t-[16px] bg-[#0a0a0a]"
          style={{
            'clip-path': isFilterTabActive()
              ? 'inset(0 0 0 0 round 16px 16px 0 0)'
              : 'inset(100% 0 0 0 round 16px 16px 0 0)',
            transition: `clip-path 320ms cubic-bezier(0.16, 1, 0.3, 1)`
          }}
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute -left-4 bottom-0 w-4 h-4 origin-bottom-right"
          style={{
            background: 'radial-gradient(circle at 0 0, transparent 15.5px, #0a0a0a 16px)',
            opacity: isFilterTabActive() ? 1 : 0,
            transform: isFilterTabActive() ? 'scale(1)' : 'scale(0)',
            transition: isFilterTabActive()
              ? 'opacity 160ms ease-out 120ms, transform 260ms cubic-bezier(0.16, 1, 0.3, 1) 120ms'
              : 'opacity 120ms ease-in, transform 160ms ease-in'
          }}
        />
        <button
          type="button"
          onClick={() => toggleInspector()}
          class={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
            isInspectorOpen()
              ? 'bg-white/[0.08] text-white'
              : 'text-white/45 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Details (Space)"
          aria-label="Toggle details"
          aria-pressed={isInspectorOpen()}
        >
          <SolarInfoCircleLinear class="w-3.5 h-3.5" />
        </button>

        <label
          class={`group flex items-center gap-2 h-7 px-2 rounded-md cursor-text transition-[width,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isFilterTabActive() ? 'w-56' : 'w-44 hover:bg-white/[0.04]'
          }`}
        >
          <SearchIcon class="w-3.5 h-3.5 shrink-0 text-white/45 group-focus-within:text-[var(--accent)] transition-colors" />
          <input
            ref={(el) => (filterInputRef = el)}
            type="text"
            placeholder="Filter"
            aria-label="Filter items in this folder"
            spellcheck={false}
            value={browserSearchFilter()}
            onInput={(e) => setBrowserSearchFilter(e.currentTarget.value)}
            onFocus={() => setBrowserFilterFocused(true)}
            onBlur={() => setBrowserFilterFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return
              e.preventDefault()
              e.stopPropagation()
              setBrowserSearchFilter('')
              e.currentTarget.blur()
            }}
            class="min-w-0 flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-white/35"
          />
          <Show
            when={browserSearchFilter()}
            fallback={
              <kbd class="group-focus-within:hidden flex items-center justify-center h-[19px] min-w-[19px] px-1 rounded-[4px] bg-white/[0.07] font-sans text-[11px] font-medium text-white/50">
                /
              </kbd>
            }
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setBrowserSearchFilter('')
                filterInputRef?.focus()
              }}
              class="flex items-center justify-center h-[19px] px-1 rounded-[4px] bg-white/[0.07] hover:bg-white/[0.12] font-sans text-[11px] font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Clear (Esc)"
            >
              Esc
            </button>
          </Show>
        </label>
      </div>
    </header>
  )
}

export default BrowserTopBar
