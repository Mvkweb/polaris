import { Component, For, Show, createMemo } from 'solid-js'

export interface PaneHeaderProps {
  paneId: 'left' | 'right'
  path: () => string
  isActive: () => boolean
  onNavigateTo: (path: string) => void
  onActivate: () => void
  showClose?: boolean
  onClose?: () => void
}

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

const FolderIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class ?? 'w-3.5 h-3.5'}
  >
    <path
      d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H12L10 5H5C3.89543 5 3 5.89543 3 7Z"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const PaneHeader: Component<PaneHeaderProps> = (props) => {
  const segments = createMemo(() => {
    const raw = props.path() || '/'
    const parts = raw.split(/[/\\]/).filter(Boolean)
    if (parts.length === 0) return [{ name: '/', path: '/', isLast: true }]

    const out: Array<{ name: string; path: string; isLast: boolean }> = [
      { name: '/', path: '/', isLast: false }
    ]
    const absolute = raw.startsWith('/')
    let current = ''
    parts.forEach((part, i) => {
      current += absolute ? `/${part}` : `${part}/`
      out.push({ name: part, path: current, isLast: i === parts.length - 1 })
    })
    return out
  })

  return (
    <div
      class="h-8 px-3 shrink-0 flex items-center justify-between border-b border-white/[0.04] bg-white/[0.015] text-xs select-none transition-colors"
      onPointerDown={() => props.onActivate()}
      aria-label={`${props.paneId} pane`}
    >
      {/* Left: Breadcrumbs path */}
      <div class="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
        <FolderIcon
          class={`w-3.5 h-3.5 shrink-0 transition-colors ${
            props.isActive() ? 'text-[var(--accent,#4da3f5)]' : 'text-white/35'
          }`}
        />
        <div class="flex items-center gap-0.5 text-[11.5px] ml-1 overflow-hidden text-ellipsis whitespace-nowrap">
          <For each={segments()}>
            {(seg) => (
              <div class="flex items-center gap-0.5 shrink-0">
                <Show when={seg.name !== '/'}>
                  <span class="text-white/20 text-[10px] select-none mx-0.5">/</span>
                </Show>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onNavigateTo(seg.path)
                  }}
                  class={`px-1 py-0.5 rounded transition-colors cursor-pointer ${
                    seg.isLast
                      ? 'font-medium text-white/90 hover:text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                  }`}
                  title={seg.path}
                >
                  {seg.name}
                </button>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Right: Active indicator & Close button */}
      <div class="flex items-center gap-1.5 shrink-0 ml-2">
        <Show when={props.isActive()}>
          <span class="text-[9.5px] font-mono tracking-wider uppercase text-[var(--accent,#4da3f5)] bg-[var(--accent,#4da3f5)]/10 px-1.5 py-0.5 rounded-full border border-[var(--accent,#4da3f5)]/20 select-none">
            Active
          </span>
        </Show>

        <Show when={props.showClose}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onClose?.()
            }}
            class="w-5 h-5 rounded-md flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Split View (F3)"
            aria-label="Close split view"
          >
            <CloseIcon class="w-3 h-3" />
          </button>
        </Show>
      </div>
    </div>
  )
}

export default PaneHeader
