import { Component } from 'solid-js'

/**
 * [MOCKUP INDICATOR]
 * Visual badge marking features/settings that are currently UI mockups
 * and not yet wired to real engine IPC or persistent storage.
 *
 * To toggle off all mockup badges visually at once: set SHOW_MOCKUP_BADGES = false below.
 * To remove individually: search for '<MockupBadge' across the codebase.
 */
export const SHOW_MOCKUP_BADGES = true

interface MockupBadgeProps {
  label?: string
  title?: string
  class?: string
}

export const MockupBadge: Component<MockupBadgeProps> = (props) => {
  if (!SHOW_MOCKUP_BADGES) return null

  return (
    <span
      class={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold bg-amber-400/10 text-amber-300/80 border-0 select-none shrink-0 ${
        props.class ?? ''
      }`}
      title={props.title ?? 'Mockup: UI preview only (not yet wired to backend/engine)'}
    >
      {props.label ?? 'Mockup'}
    </span>
  )
}

export default MockupBadge
