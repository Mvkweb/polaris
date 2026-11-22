import { Component, For, Show, createMemo } from 'solid-js'
import { I } from '../ui/AppIcons'

export interface PaneHeaderProps {
  paneId: 'left' | 'right'
  path: () => string
  isActive: () => boolean
  onNavigateTo: (path: string) => void
  onActivate: () => void
  showClose?: boolean
  onClose?: () => void
}

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
        <I.folder
          class={`w-3.5 h-3.5 shrink-0 transition-colors ${
            props.isActive() ? 'text-[var(--accent,#4da3f5)]' : 'text-white/35'
          }`}
        />
        <div class="flex items-center gap-0.5 text-[11.5px] ml-1 overflow-hidden text-ellipsis whitespace-nowrap">
          <For each={segments()}>
            {(seg, index) => (
              <div class="flex items-center gap-0.5 shrink-0">
                <Show when={index() > 0}>
                  <span class="text-white/20 text-[10px] select-none mx-0.5">›</span>
                </Show>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onNavigateTo(seg.path)
                  }}
                  class={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                    seg.isLast
                      ? props.isActive()
                        ? 'font-medium text-white'
                        : 'font-medium text-white/70'
                      : props.isActive()
                        ? 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                        : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
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

      {/* Right: Close button */}
      <div class="flex items-center gap-1.5 shrink-0 ml-2">
        <Show when={props.showClose}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              props.onClose?.()
            }}
            class="w-5 h-5 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs leading-none"
            title="Close Split View (F3)"
            aria-label="Close split view"
          >
            ×
          </button>
        </Show>
      </div>
    </div>
  )
}

export default PaneHeader
