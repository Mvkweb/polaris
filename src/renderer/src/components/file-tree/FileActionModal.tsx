import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import {
  fileActionModalState,
  closeFileActionModal,
  openFileInEditor,
  renameOpenFile,
  refreshFileExplorer
} from '../../store'
import { DitherCard } from '../dithercn/dither-card'
import { DitherButton } from '../dithercn/dither-button'

const INVALID_CHARS_REGEX = /[<>:"/\\|?*]/

export const FileActionModal: Component = () => {
  let inputRef: HTMLInputElement | undefined = undefined
  const [value, setValue] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [isSubmitting, setIsSubmitting] = createSignal(false)

  const mode = createMemo(() => fileActionModalState().mode)

  const title = createMemo(() => {
    switch (mode()) {
      case 'newFile':
        return 'Create New File'
      case 'newFolder':
        return 'Create New Folder'
      case 'rename':
        return 'Rename Item'
      default:
        return 'File Action'
    }
  })

  const actionLabel = createMemo(() => {
    switch (mode()) {
      case 'newFile':
        return 'Create File'
      case 'newFolder':
        return 'Create Folder'
      case 'rename':
        return 'Rename'
      default:
        return 'Confirm'
    }
  })

  const placeholder = createMemo(() => {
    switch (mode()) {
      case 'newFile':
        return 'e.g. index.ts'
      case 'newFolder':
        return 'e.g. components'
      case 'rename':
        return 'e.g. new-name.ts'
    }
  })

  createEffect(() => {
    if (fileActionModalState().isOpen) {
      const initial = fileActionModalState().initialValue
      setValue(initial)
      setError(null)
      setIsSubmitting(false)

      setTimeout(() => {
        if (!inputRef) return
        inputRef.focus()
        if (fileActionModalState().mode === 'rename') {
          const dotIdx = initial.lastIndexOf('.')
          if (dotIdx > 0) {
            inputRef.setSelectionRange(0, dotIdx)
          } else {
            inputRef.select()
          }
        } else {
          inputRef.select()
        }
      }, 50)
    }
  })

  const handleSubmit = async (): Promise<void> => {
    const raw = value().trim()
    if (!raw) {
      setError('Name cannot be empty')
      return
    }

    if (INVALID_CHARS_REGEX.test(raw)) {
      setError('Name contains invalid characters (/ \\ : * ? " < > |)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const dir = fileActionModalState().targetDir
    const newFullPath = `${dir}/${raw}`

    try {
      if (mode() === 'newFile') {
        if (window.api?.writeFile) {
          await window.api.writeFile(newFullPath, '')
          refreshFileExplorer()
          openFileInEditor(newFullPath, raw)
          closeFileActionModal()
        }
      } else if (mode() === 'newFolder') {
        if (window.api?.createDirectory) {
          await window.api.createDirectory(newFullPath)
          refreshFileExplorer()
          closeFileActionModal()
        }
      } else if (mode() === 'rename') {
        const oldPath = fileActionModalState().targetPath
        if (oldPath && window.api?.renamePath) {
          await window.api.renamePath(oldPath, newFullPath)
          renameOpenFile(oldPath, newFullPath, raw)
          refreshFileExplorer()
          closeFileActionModal()
        }
      }
    } catch (err: any) {
      console.error('File operation failed:', err)
      setError(err?.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Show when={fileActionModalState().isOpen}>
      <div
        class="confirm-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-sm select-none p-4 antialiased"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeFileActionModal()
        }}
      >
        {/* Modal DitherCard */}
        <DitherCard
          glow="top-left"
          reach={240}
          strength={0.4}
          color="ink"
          role="dialog"
          aria-modal="true"
          aria-label={title()}
          class="confirm-card relative w-[380px] max-w-[92vw] overflow-hidden rounded-2xl bg-[#070708] p-5 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)] border border-transparent flex flex-col outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between">
            <h3 class="text-[15px] font-semibold text-white/95 tracking-tight">{title()}</h3>
            <span class="text-[11px] font-mono text-white/25">Esc</span>
          </div>

          {/* Subtitle / Path */}
          <p class="text-[12px] text-white/45 leading-relaxed mt-1.5 font-mono truncate">
            {fileActionModalState().targetDir}
          </p>

          {/* Body Input */}
          <input
            ref={(el) => (inputRef = el)}
            type="text"
            value={value()}
            onInput={(e) => {
              setValue(e.currentTarget.value)
              if (error()) setError(null)
            }}
            placeholder={placeholder()}
            class="w-full h-8 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.07] rounded-lg px-3 text-[12.5px] text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-white/20 transition-all font-mono mt-3.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                closeFileActionModal()
              }
            }}
          />

          <Show when={error()}>
            <p class="text-[11.5px] text-rose-400 font-medium mt-2 animate-[fadeIn_150ms_ease-out]">
              {error()}
            </p>
          </Show>

          {/* Footer Actions */}
          <div class="flex items-center justify-end gap-2 mt-5">
            <DitherButton
              variant="outline"
              color="ink"
              size="sm"
              onClick={closeFileActionModal}
            >
              Cancel
            </DitherButton>
            <DitherButton
              variant="filled"
              color="ink"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting()}
              loading={isSubmitting()}
            >
              <span>{actionLabel()}</span>
            </DitherButton>
          </div>
        </DitherCard>
      </div>

      <style>{`
        .confirm-backdrop {
          animation: confirmFadeIn 160ms ease-out both;
        }
        .confirm-card {
          animation: confirmScaleUp 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes confirmScaleUp {
          from {
            opacity: 0;
            transform: scale3d(0.96, 0.96, 1) translate3d(0, 6px, 0);
          }
          to {
            opacity: 1;
            transform: scale3d(1, 1, 1) translate3d(0, 0, 0);
          }
        }
      `}</style>
    </Show>
  )
}

export default FileActionModal
