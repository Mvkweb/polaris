import { createSignal, onMount, Show, type Component } from 'solid-js'
import { closeEditorTab, isFileDirty, refreshFileExplorer } from '../../store'
import { DitherButton } from '../dithercn/dither-button'
import { prefs } from '../settings/prefs'

interface TrashDialogProps {
  path: string
  name: string
  onDismiss: () => void
}

export const TrashDialog: Component<TrashDialogProps> = (props) => {
  let dialog!: HTMLDialogElement
  const [busy, setBusy] = createSignal(false)
  const [failed, setFailed] = createSignal(false)

  const dismiss = (): void => {
    if (dialog.open) dialog.close()
    props.onDismiss()
  }

  const moveToTrash = async (): Promise<void> => {
    if (busy()) return
    setBusy(true)

    let moved = false
    try {
      moved = (await window.api?.trashPath(props.path)) === true
    } catch (err) {
      console.error('Trash request failed:', err)
    }

    setBusy(false)
    if (moved) {
      closeEditorTab(props.path)
      refreshFileExplorer()
      dismiss()
      return
    }

    setFailed(true)
    if (!dialog.open) dialog.showModal()
    dialog.querySelector('button')?.focus()
  }

  onMount(() => {
    if (prefs.confirmTrash || isFileDirty(props.path)) dialog.showModal()
    else void moveToTrash()
  })

  return (
    <dialog
      ref={(el) => (dialog = el)}
      aria-labelledby="trash-dialog-title"
      aria-describedby="trash-dialog-description"
      onKeyDown={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy()) dismiss()
      }}
      class="m-auto w-[380px] max-w-[calc(100%-2rem)] rounded-2xl border border-white/[0.08] bg-[#0d0b10] p-5 text-white shadow-2xl backdrop:bg-black/55"
    >
      <h2 id="trash-dialog-title" class="text-[15px] font-semibold">
        <Show when={failed()} fallback="Move to Trash?">
          Couldn’t move to Trash
        </Show>
      </h2>
      <p
        id="trash-dialog-description"
        aria-live="polite"
        class="mt-2 break-words text-[13px] text-white/75"
      >
        <Show
          when={failed()}
          fallback={
            <>
              <strong>{props.name}</strong> will be moved to Trash.
            </>
          }
        >
          Polaris couldn’t move <strong>{props.name}</strong> to Trash. Check that the item still
          exists and the drive supports Trash.
        </Show>
      </p>
      <Show when={!failed() && isFileDirty(props.path)}>
        <p class="mt-2 text-[13px] text-white/75">
          Moving this file to Trash will discard its unsaved edits.
        </p>
      </Show>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <DitherButton autofocus disabled={busy()} onClick={dismiss} size="sm" variant="outline">
          <Show when={failed()} fallback="Cancel">
            Close
          </Show>
        </DitherButton>
        <Show when={!failed()}>
          <DitherButton
            color="red"
            disabled={busy()}
            loading={busy()}
            onClick={moveToTrash}
            size="sm"
          >
            Move to Trash
          </DitherButton>
        </Show>
      </div>
    </dialog>
  )
}
