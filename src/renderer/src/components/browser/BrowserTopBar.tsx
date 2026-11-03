import { Component, For, Show, createMemo } from 'solid-js'
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
  setBrowserSearchFilter
} from '../../store'

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
  const currentPath = () => workspaceRoot() || '/mnt/storage/polaris'

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

  return (
    <header class="shrink-0 h-9 px-2 mb-2 flex items-center justify-between bg-transparent select-none">
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
                <div class="px-3.5 py-1 rounded-full bg-white/[0.12] text-white text-[13px] font-medium shadow-sm flex items-center gap-1.5">
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
                        ? 'bg-white/[0.12] text-white shadow-sm'
                        : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
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

      {/* ── Right: Minimal Transparent Glass Search Field ── */}
      <div class="relative flex items-center">
        <input
          type="text"
          placeholder="Search..."
          value={browserSearchFilter()}
          onInput={(e) => setBrowserSearchFilter(e.currentTarget.value)}
          class="w-36 focus:w-48 h-7 pl-7 pr-2.5 bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] rounded-full text-[12px] text-white placeholder:text-white/30 border border-transparent focus:border-white/10 outline-none transition-all duration-200"
        />
        <div class="absolute left-2.5 pointer-events-none text-white/35">
          <SearchIcon class="w-3 h-3" />
        </div>
        <Show when={browserSearchFilter()}>
          <button
            type="button"
            onClick={() => setBrowserSearchFilter('')}
            class="absolute right-2 text-white/40 hover:text-white text-[11px] cursor-pointer"
          >
            ×
          </button>
        </Show>
      </div>
    </header>
  )
}

export default BrowserTopBar
