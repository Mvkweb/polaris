import { createSignal, For, onMount, Show, type Component } from 'solid-js'
import {
  compressModalState,
  closeCompressModal,
  refreshFileExplorer
} from '../../store'
import type { ArchiveFormat } from '../../types'
import { Aurora } from '../dithercn/aurora'
import { DitherButton } from '../dithercn/dither-button'
import { DitherTabs, DitherTabsList, DitherTabsTrigger } from '../dithercn/dither-tabs'

export const ArchiveIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M12 7.5v9M8 12.5l4 4 4-4" />
  </svg>
)

const FORMATS: { id: ArchiveFormat; label: string }[] = [
  { id: 'zip', label: '.zip' },
  { id: 'tar.gz', label: '.tar.gz' },
  { id: 'tar.xz', label: '.tar.xz' },
  { id: 'tar.zst', label: '.tar.zst' },
  { id: '7z', label: '.7z' }
]

const CompressChooser: Component = () => {
  let dialog!: HTMLDialogElement
  let inputRef: HTMLInputElement | undefined

  const [name, setName] = createSignal('')
  const [format, setFormat] = createSignal<ArchiveFormat>('zip')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')

  const st = () => compressModalState()

  const dismiss = (): void => {
    if (busy()) return
    setError('')
    // Closing natively first restores focus to whatever opened the dialog.
    dialog?.close()
    closeCompressModal()
  }

  const handleSubmit = async (e?: Event): Promise<void> => {
    e?.preventDefault()
    const currentName = name().trim()
    const state = st()
    if (!currentName || !state.sources.length || busy()) return

    setBusy(true)
    setError('')

    try {
      const res = await window.api?.compressArchive(
        state.sources,
        state.destDir,
        currentName,
        format()
      )

      if (res?.success) {
        refreshFileExplorer()
        dismiss()
      } else {
        setError(res?.error || 'Compression failed')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  onMount(() => {
    setName(st().defaultName || 'archive')
    setFormat('zip')
    dialog.showModal()
    requestAnimationFrame(() => {
      inputRef?.focus()
      inputRef?.select()
    })
  })

  const fileName = (): string => `${name().trim() || 'archive'}.${format()}`
  const itemCount = (): number => st().sources.length

  return (
    <dialog
      ref={(el) => (dialog = el)}
      class="cmp-card"
      aria-labelledby="compress-dialog-title"
      aria-describedby="compress-dialog-sub"
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
      onClick={(e) => {
        if (e.target === dialog) dismiss()
      }}
    >
      <form onSubmit={handleSubmit} class="relative">
        <div class="cmp-aurora" aria-hidden="true">
          <Aurora
            class="size-full"
            color="ink"
            tipColor="ink"
            background="transparent"
            curtains={3}
            height={0.55}
            spread={0.14}
            direction="down"
            intensity={0.9}
            glow={0.9}
            rays={9}
            sway={1}
            drift={0.25}
            shimmer={0.3}
            matrix="bayer8"
            cell={2}
          />
        </div>

        <header class="relative px-5 pt-[58px]">
          <p class="text-[12px] text-white/40">New archive</p>
          <h2 id="compress-dialog-title" class="mt-0.5 truncate text-[15px] font-medium text-white">
            {fileName()}
          </h2>
          <p id="compress-dialog-sub" class="mt-0.5 truncate text-[12px] text-white/40">
            {itemCount()} <Show when={itemCount() === 1} fallback="items">item</Show>
            <span class="cmp-mono"> · {st().destDir}</span>
          </p>
        </header>

        <div class="relative px-5 pt-4">
          <p class="cmp-label" id="archive-name-label">
            Archive name
          </p>
          <input
            ref={(el) => (inputRef = el)}
            type="text"
            aria-labelledby="archive-name-label"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="archive"
            disabled={busy()}
            class="cmp-input"
          />

          <p class="cmp-label mt-4">Archive format</p>
          <DitherTabs
            value={format()}
            onChange={(v) => setFormat(v as ArchiveFormat)}
            variant="underline"
            color="ink"
            cell={2}
            class="w-full"
          >
            <DitherTabsList class="w-full px-1">
              <For each={FORMATS}>
                {(fmt) => (
                  <DitherTabsTrigger
                    value={fmt.id}
                    disabled={busy()}
                    class="text-[12.5px] text-white/45 data-[selected]:text-white"
                  >
                    {fmt.label}
                  </DitherTabsTrigger>
                )}
              </For>
            </DitherTabsList>
          </DitherTabs>
        </div>

        <div class="relative px-5">
          <Show when={error()}>
            <p role="alert" class="mt-3 text-[12px] text-rose-300/90 break-words">
              {error()}
            </p>
          </Show>
        </div>

        <footer class="relative flex justify-end gap-2 px-5 pt-4 pb-5">
          <DitherButton
            type="button"
            size="sm"
            variant="outline"
            color="ink"
            onClick={dismiss}
            disabled={busy()}
          >
            Cancel
          </DitherButton>
          <DitherButton
            type="submit"
            size="sm"
            color="ink"
            disabled={!name().trim() || busy()}
            loading={busy()}
          >
            <ArchiveIcon class="size-4" />
            <span>{busy() ? 'Compressing…' : 'Compress'}</span>
          </DitherButton>
        </footer>
      </form>

      <style>{`
        .cmp-card {
          --ease: cubic-bezier(0.22, 1, 0.36, 1);
          /* DitherTabs' underline list draws its track from this token. */
          --border: rgb(255 255 255 / 0.08);
          margin: auto;
          width: 400px;
          max-width: calc(100% - 2rem);
          padding: 0;
          overflow: hidden auto;
          overscroll-behavior: contain;
          border: none;
          border-radius: 18px;
          background: #070708;
          color: #fff;
          box-shadow: 0 18px 44px -18px rgb(0 0 0 / 0.7);
          animation: cmp-in 260ms var(--ease) both;
        }
        .cmp-card::backdrop {
          background: rgb(0 0 0 / 0.55);
          animation: cmp-fade 200ms ease both;
        }
        .cmp-aurora {
          position: absolute;
          inset: 0 0 auto 0;
          height: 84px;
          opacity: 0.9;
          pointer-events: none;
          mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%);
        }
        .cmp-mono {
          font-family: ui-monospace, monospace;
          font-size: 11px;
          color: rgb(255 255 255 / 0.28);
        }
        .cmp-label {
          padding: 6px 2px 5px;
          font-size: 11.5px;
          color: rgb(255 255 255 / 0.35);
        }
        .cmp-input {
          width: 100%;
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          background: rgb(255 255 255 / 0.04);
          font-size: 13px;
          color: #fff;
          outline: none;
          transition: background-color 110ms ease;
        }
        .cmp-input::placeholder {
          color: rgb(255 255 255 / 0.3);
        }
        .cmp-input:hover:not(:disabled) {
          background: rgb(255 255 255 / 0.055);
        }
        .cmp-input:focus-visible {
          background: rgb(255 255 255 / 0.06);
          outline: 2px solid var(--accent, #4da3f5);
          outline-offset: -2px;
        }
        .cmp-input:disabled {
          opacity: 0.6;
        }
        @keyframes cmp-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
            filter: blur(2px);
          }
        }
        @keyframes cmp-fade {
          from {
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cmp-card,
          .cmp-card::backdrop {
            animation: none;
          }
        }
      `}</style>
    </dialog>
  )
}

/** Opens only while a compress request is pending, so each open gets a fresh dialog. */
export const CompressDialog: Component = () => (
  <Show when={compressModalState().isOpen}>
    <CompressChooser />
  </Show>
)

export default CompressDialog
