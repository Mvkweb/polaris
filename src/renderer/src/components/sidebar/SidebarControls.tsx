import { For } from 'solid-js'
import { shortcutKeys } from '../../shortcuts'

export const CheckCheckIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const KbdHint = (props: { combo: string; muted?: boolean }) => (
  <span class="flex items-center gap-1 ml-auto shrink-0">
    <For each={shortcutKeys(props.combo)}>
      {(key) => (
        <kbd
          class={`flex items-center justify-center h-[19px] min-w-[19px] px-1 rounded-[4px] font-sans text-[11px] font-medium ${
            props.muted ? 'bg-white/[0.04] text-white/35' : 'bg-white/[0.07] text-white/50'
          }`}
        >
          {key}
        </kbd>
      )}
    </For>
  </span>
)
