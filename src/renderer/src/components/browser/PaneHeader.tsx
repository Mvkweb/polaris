import { Component, For, createMemo, Show } from 'solid-js'

export interface PaneHeaderProps {
  paneId: 'left' | 'right'
  path: () => string
  isActive: () => boolean
  canGoBack: () => boolean
  canGoForward: () => boolean
  onNavigateBack: () => void
  onNavigateForward: () => void
  onNavigateTo: (path: string) => void
  onActivate: () => void
  showClose?: boolean
  onClose?: () => void
}

const ChevronLeftIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-3.5 h-3.5'}
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
    class={props.class ?? 'w-3.5 h-3.5'}
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

const CloseIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-3 h-3'}
  >
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const PaneHeader: Component<PaneHeaderProps> = (props) => {
  const segments = createMemo(() => {
    const raw = props.path() || '/'
    const parts = raw.split(/[/\\]/).filter(Boolean)
    if (parts.length === 0) {
      return [{ name: '/', path: '/' }]
    }

    const isAbsolute = raw.startsWith('/')
    const result: Array<{ name: string; path: string }> = []
    let currentPath = isAbsolute ? '' : ''

    for (const part of parts) {
      currentPath += isAbsolute ? `/${part}` : `${part}/`
      result.push({ name: part, path: currentPath })
    }

    return result
  })

  return (
    <div
      class="h-8 px-2.5 shrink-0 flex items-center justify-between border-b border-white/[0.06] bg-black/25 text-xs select-none backdrop-blur-md transition-colors"
      classList={{
        'border-b-[var(--accent,#4da3f5)]/30 bg-black/40': props.isActive()
      }}
      onPointerDown={() => props.onActivate()}
    >
      {/* Left: Nav Buttons & Breadcrumbs */}
      <div class="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
        {/* Active Indicator dot */}
        <div
          class="w-1.5 h-1.5 rounded-full mr-1 shrink-0 transition-all duration-200"
          classList={{
            'bg-[var(--accent,#4da3f5)] shadow-[0_0_6px_var(--accent,#4da3f5)] scale-110': props.isActive(),
            'bg-white/20': !props.isActive()
          }}
          title={props.isActive() ? 'Active Pane' : 'Click to activate'}
        />

        {/* Back / Forward */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onNavigateBack()
          }}
          disabled={!props.canGoBack()}
          class={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            props.canGoBack()
              ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
              : 'text-white/20 cursor-not-allowed'
          }`}
          title="Back"
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onNavigateForward()
          }}
          disabled={!props.canGoForward()}
          class={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            props.canGoForward()
              ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
              : 'text-white/20 cursor-not-allowed'
          }`}
          title="Forward"
        >
          <ChevronRightIcon />
        </button>

        {/* Breadcrumb Segments */}
        <div class="flex items-center gap-0.5 ml-1 text-white/50 overflow-hidden text-ellipsis whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onNavigateTo('/')
            }}
            class="px-1 py-0.5 rounded text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Root (/)"
          >
            /
          </button>

          <For each={segments()}>
            {(seg, idx) => {
              const isLast = () => idx() === segments().length - 1
              return (
                <div class="flex items-center gap-0.5">
                  <span class="text-white/20 text-[10px] select-none">&gt;</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      props.onNavigateTo(seg.path)
                    }}
                    class={`px-1.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      isLast()
                        ? 'font-semibold text-white bg-white/[0.06]'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title={seg.path}
                  >
                    {seg.name}
                  </button>
                </div>
              )
            }}
          </For>
        </div>
      </div>

      {/* Right: Close button or Active Badge */}
      <div class="flex items-center gap-2 shrink-0 ml-2">
        <Show when={props.showClose}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onClose?.()
            }}
            class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
            title="Close Split View (F3)"
          >
            <CloseIcon class="text-white/50 group-hover:text-white" />
            <span>Close</span>
          </button>
        </Show>
      </div>
    </div>
  )
}

export default PaneHeader
