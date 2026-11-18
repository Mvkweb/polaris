import { onMount, Show } from 'solid-js'
import { brokenLink, setBrokenLink, showLinkTarget, type BrokenLinkInfo } from '../../links'
import { refreshFileExplorer } from '../../store'
import { DitherButton } from '../dithercn/dither-button'
import { LinkBadge } from '../ui/LinkBadge'
import './open-with.css'

/** Double-clicking a broken symlink explains it instead of failing silently. */
const Dialog = (props: { link: BrokenLinkInfo }) => {
  let dialog!: HTMLDialogElement
  const close = (): void => {
    dialog.close()
    setBrokenLink(null)
  }
  onMount(() => dialog.showModal())
  return (
    <dialog
      ref={(el) => (dialog = el)}
      class="ow-card"
      aria-labelledby="broken-link-title"
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          close()
        }
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === dialog && close()}
    >
      <div class="px-5 pt-5">
        <div class="flex items-center gap-2.5">
          <LinkBadge broken class="is-large" />
          <h2 id="broken-link-title" class="text-[15px] font-medium text-white">
            This link is broken
          </h2>
        </div>
        <p class="mt-3 text-[13px] leading-relaxed text-white/60">
          <span class="text-white/85">{props.link.name}</span> points to a location that doesn’t
          exist anymore:
        </p>
        <p class="mt-2 break-all rounded-[10px] bg-white/[0.04] px-3 py-2 font-mono text-[11.5px] text-rose-300/90">
          {props.link.target}
        </p>
      </div>
      <footer class="flex flex-wrap justify-end gap-2 px-5 pt-4 pb-5">
        <DitherButton type="button" size="sm" variant="outline" color="ink" onClick={close}>
          Close
        </DitherButton>
        <DitherButton
          type="button"
          size="sm"
          variant="outline"
          color="ink"
          onClick={() => {
            close()
            showLinkTarget(props.link.target)
          }}
        >
          Open folder
        </DitherButton>
        <DitherButton
          type="button"
          size="sm"
          color="ink"
          onClick={async () => {
            // Moves only the link itself to Trash; there's nothing behind it.
            await window.api.trashPath(props.link.path)
            close()
            refreshFileExplorer()
          }}
        >
          Move link to Trash
        </DitherButton>
      </footer>
    </dialog>
  )
}

export const BrokenLinkDialog = () => (
  <Show when={brokenLink()} keyed>
    {(link) => <Dialog link={link} />}
  </Show>
)
