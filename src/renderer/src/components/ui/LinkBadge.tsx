import { Show, type Component } from 'solid-js'
import { fillStyle } from '../../lib/dither'
import './link-badge.css'

/**
 * Small corner badge for symlinks (bottom-left of the icon, like other file
 * managers). Broken links get red hatching so they stand out at a glance.
 */
export const LinkBadge: Component<{ broken?: boolean; class?: string; title?: string }> = (
  props
) => (
  <span
    class={`link-badge ${props.class ?? ''}`}
    classList={{ 'is-broken': !!props.broken }}
    title={props.title}
    aria-hidden="true"
  >
    <Show when={props.broken}>
      <span class="link-badge-hatch" style={fillStyle('hatched', { color: 'red', cell: 1 })} />
    </Show>
    <svg viewBox="0 0 16 16" class="relative">
      <Show when={props.broken} fallback={<path d="M5 11.5 11 5.5M6.5 5h5v5" />}>
        <path d="M5 5l6 6M11 5l-6 6" />
      </Show>
    </svg>
  </span>
)

export default LinkBadge
