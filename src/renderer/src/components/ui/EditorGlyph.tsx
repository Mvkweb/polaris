import { Show } from 'solid-js'
import type { JSX } from 'solid-js'
import type { ExternalEditor } from '../../types'
import emberLogo from '../../assets/ember-logo.svg'

/** An editor's real app icon; `null` renders the built-in Polaris mark. */
export const EditorGlyph = (props: {
  editor: ExternalEditor | null
  class?: string
}): JSX.Element => (
  <Show
    when={props.editor?.icon}
    fallback={
      <img
        src={emberLogo}
        alt=""
        draggable={false}
        class={`${props.class ?? 'w-4 h-4'} opacity-80 shrink-0`}
      />
    }
  >
    {(src) => (
      <img src={src()} alt="" draggable={false} class={`${props.class ?? 'w-4 h-4'} shrink-0`} />
    )}
  </Show>
)
