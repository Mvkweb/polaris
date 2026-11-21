import { createSignal, onMount, Show, type Component } from 'solid-js'
import {
  closeEditorTab,
  isFileDirty,
  refreshFileExplorer,
  trashModalState,
  closeTrashModal
} from '../../store'
import { DitherButton } from '../dithercn/dither-button'
import { prefs } from '../settings/prefs'

interface TrashDialogProps {
  path?: string
  name?: string
  permanent?: boolean
  paths?: string[]
  onDismiss?: () => void
  onClose?: () => void
}

export const TrashDialog: Component<TrashDialogProps> = (props) => {
  let dialog!: HTMLDialogElement
  const [busy, setBusy] = createSignal(false)
  const [failed, setFailed] = createSignal(false)

  const activePath = () => props.path ?? trashModalState().path
  const activePaths = () => {
    const list = props.paths ?? trashModalState().paths
    return list && list.length > 0 ? list : [activePath()]
  }
  const isMultiple = () => activePaths().length > 1
  const count = () => activePaths().length
  const activeName = () => props.name ?? trashModalState().name
  const isPermanent = () => props.permanent ?? trashModalState().permanent

  const dismiss = (): void => {
    if (dialog?.open) dialog.close()
    closeTrashModal()
    ;(props.onDismiss ?? props.onClose)?.()
  }

  const handleDelete = async (): Promise<void> => {
    const targets = activePaths()
    if (targets.length === 0 || busy()) return
    setBusy(true)

    let allSuccess = true
    try {
      for (const p of targets) {
        let success = false
        if (isPermanent()) {
          success = (await window.api?.deletePermanent(p)) === true
        } else {
          success = (await window.api?.trashPath(p)) === true
        }
        if (success) {
          closeEditorTab(p)
        } else {
          allSuccess = false
        }
      }
    } catch (err) {
      console.error('Delete request failed:', err)
      allSuccess = false
    }

    setBusy(false)
    if (allSuccess) {
      refreshFileExplorer()
      dismiss()
      return
    }

    setFailed(true)
    if (!dialog.open) dialog.showModal()
    dialog.querySelector('button')?.focus()
  }

  onMount(() => {
    setBusy(false)
    setFailed(false)
    if (isPermanent() || prefs.confirmTrash || activePaths().some((p) => isFileDirty(p))) {
      dialog.showModal()
    } else {
      void handleDelete()
    }
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
      onClick={(e) => {
        if (e.target === dialog && !busy()) dismiss()
      }}
      class="m-auto w-[380px] max-w-[calc(100%-2rem)] overflow-hidden rounded-[18px] border border-transparent bg-[#070708] p-5 text-white shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)] backdrop:bg-black/55 forced-colors:border-[CanvasText]"
    >
      <h2 id="trash-dialog-title" class="text-[15px] font-semibold">
        <Show
          when={failed()}
          fallback={isPermanent() ? 'Delete Permanently?' : 'Move to Trash?'}
        >
          {isPermanent() ? 'Couldn’t delete item' : 'Couldn’t move to Trash'}
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
            isPermanent() ? (
              isMultiple() ? (
                <>
                  <strong>{count()} items</strong> will be permanently deleted. This action cannot be
                  undone.
                </>
              ) : (
                <>
                  <strong>{activeName()}</strong> will be permanently deleted. This action cannot be
                  undone.
                </>
              )
            ) : isMultiple() ? (
              <>
                <strong>{count()} items</strong> will be moved to Trash.
              </>
            ) : (
              <>
                <strong>{activeName()}</strong> will be moved to Trash.
              </>
            )
          }
        >
          {isPermanent() ? (
            <>
              Polaris couldn’t permanently delete{' '}
              {isMultiple() ? `${count()} items` : <strong>{activeName()}</strong>}. Check file
              permissions.
            </>
          ) : (
            <>
              Polaris couldn’t move{' '}
              {isMultiple() ? `${count()} items` : <strong>{activeName()}</strong>} to Trash. Check
              that the item still exists and the drive supports Trash.
            </>
          )}
        </Show>
      </p>
      <Show when={!failed() && activePaths().some((p) => isFileDirty(p))}>
        <p class="mt-2 text-[13px] text-white/75">
          Deleting this file will discard its unsaved edits.
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
            onClick={handleDelete}
            size="sm"
          >
            {isPermanent() ? 'Delete' : 'Move to Trash'}
          </DitherButton>
        </Show>
      </div>
    </dialog>
  )
}

export default TrashDialog
