import { Component, For, Show, createEffect, createMemo } from 'solid-js'
import { fillStyle } from '../../lib/dither'

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
  // Root pill first, then each segment; the last one is the active pill.
  const segments = createMemo(() => {
    const raw = props.path() || '/'
    const parts = raw.split(/[/\\]/).filter(Boolean)
    if (parts.length === 0) return [{ name: '/', path: '/', last: true }]

    const out: Array<{ name: string; path: string; last: boolean }> = [
      { name: '/', path: '/', last: false }
    ]
    const absolute = raw.startsWith('/')
    let current = ''
    parts.forEach((part, i) => {
      current += absolute ? `/${part}` : `${part}/`
      out.push({ name: part, path: current, last: i === parts.length - 1 })
    })
    return out
  })

  // Keep the active pill in view: deep paths scroll their crumbs to the end.
  let crumbs: HTMLDivElement | undefined
  createEffect(() => {
    props.path()
    crumbs?.scrollTo({ left: crumbs.scrollWidth })
  })

  return (
    <div
      class="relative h-9 px-2 shrink-0 flex items-center justify-between gap-2 border-b border-white/[0.06] select-none"
      classList={{ 'bg-white/[0.03]': props.isActive() }}
      onPointerDown={() => props.onActivate()}
      aria-label={`${props.paneId} pane`}
    >
      {/* Left: nav + breadcrumb pills (same pill language as the top bar) */}
      <div class="flex items-center gap-0.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onNavigateBack()
          }}
          disabled={!props.canGoBack()}
          class={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-colors ${
            props.canGoBack()
              ? 'text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer'
              : 'text-white/20 cursor-not-allowed'
          }`}
          title="Back"
        >
          <ChevronLeftIcon class="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onNavigateForward()
          }}
          disabled={!props.canGoForward()}
          class={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-colors ${
            props.canGoForward()
              ? 'text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer'
              : 'text-white/20 cursor-not-allowed'
          }`}
          title="Forward"
        >
          <ChevronRightIcon class="w-3.5 h-3.5" />
        </button>

        <div
          ref={crumbs}
          class="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar ml-1"
        >
          <For each={segments()}>
            {(seg) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  props.onNavigateTo(seg.path)
                }}
                class={`shrink-0 px-2 py-0.5 rounded-full text-[12px] transition-colors cursor-pointer ${
                  seg.last
                    ? 'bg-white/[0.10] text-white font-medium shadow-sm'
                    : 'text-white/45 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={seg.path}
              >
                {seg.name}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Right: close split view */}
      <Show when={props.showClose}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onClose?.()
          }}
          class="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Close Split View (F3)"
          aria-label="Close split view"
        >
          <CloseIcon />
        </button>
      </Show>

      {/* Active pane: dithered accent underline riding the header hairline */}
      <Show when={props.isActive()}>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 -bottom-px h-[4px]"
          style={fillStyle('gradient', {
            color: '--accent',
            edge: 'bottom',
            length: 4,
            to: 0,
            cell: 1
          })}
        />
      </Show>
    </div>
  )
}

export default PaneHeader
