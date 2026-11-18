import { createResource, createSignal, onMount, Show, type Component } from 'solid-js'
import { Aurora } from '../dithercn/aurora'
import { DitherButton } from '../dithercn/dither-button'
import { setWallpaperSync } from '../../store'
import '../file-tree/open-with.css'

/**
 * Wallpaper sync help. Polaris only *reads* the palette matugen writes from
 * Polaris's template; it never edits matugen's config. When sync is switched
 * on and no palette exists yet, this modal explains the one-time setup.
 */
const [setupOpen, setSetupOpen] = createSignal(false)

/** Settings → Sync with wallpaper: turn it on, and help if nothing to sync yet. */
export const setWallpaperSyncWithHelp = (on: boolean): void => {
  setWallpaperSync(on)
  if (!on) return
  void window.api
    .getThemeSetup?.()
    .then((s) => !s.found && setSetupOpen(true))
    .catch(() => {})
}

const Dialog: Component = () => {
  let dialog!: HTMLDialogElement
  const [status, { refetch }] = createResource(() => window.api.getThemeSetup())
  const [copied, setCopied] = createSignal(false)
  const close = (): void => {
    dialog.close()
    setSetupOpen(false)
  }
  const snippet = (): string =>
    [
      '[templates.polaris]',
      `input_path = '${status()?.templatePath ?? ''}'`,
      `output_path = '${status()?.outputPath ?? '~/.config/polaris/theme.json'}'`
    ].join('\n')
  const copy = (): void => {
    void navigator.clipboard.writeText(snippet())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  onMount(() => dialog.showModal())

  return (
    <dialog
      ref={(el) => (dialog = el)}
      class="ow-card"
      aria-labelledby="wallpaper-setup-title"
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
      <div class="relative">
        <div class="ow-aurora" aria-hidden="true">
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
          <p class="text-[12px] text-white/40">Wallpaper colours</p>
          <h2 id="wallpaper-setup-title" class="mt-0.5 text-[15px] font-medium text-white">
            <Show when={status()?.found} fallback="Let matugen make Polaris’s palette">
              Palette found, you’re all set
            </Show>
          </h2>
        </header>

        <Show when={status() && !status()!.found}>
          <div class="relative px-5 pt-3 text-[12.5px] leading-relaxed text-white/60">
            <Show
              when={status()!.matugenInstalled}
              fallback={
                <p>
                  Install <span class="text-white/85">matugen</span> first
                  (<span class="font-mono text-white/70">sudo pacman -S matugen</span>), then
                  follow the steps below.
                </p>
              }
            >
              <Show
                when={!status()!.matugenConfigured}
                fallback={
                  <p>
                    matugen already has Polaris’s template. Run it once, or change your wallpaper,
                    and the colours appear.
                  </p>
                }
              >
                <p>
                  <span class="text-white/85">1.</span> Add this to{' '}
                  <span class="font-mono text-white/75">~/.config/matugen/config.toml</span>:
                </p>
              </Show>
            </Show>
            <Show when={!status()!.matugenConfigured}>
              <pre class="mt-2 overflow-x-auto rounded-[10px] bg-white/[0.04] px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-white/80 select-all">
                {snippet()}
              </pre>
              <p class="mt-3">
                <span class="text-white/85">2.</span> Run matugen once, or just change your
                wallpaper. Polaris picks the colours up live.
              </p>
            </Show>
            <p class="mt-3 text-[11.5px] text-white/35">
              Polaris only reads the palette; it never changes your matugen setup.
            </p>
          </div>
        </Show>

        <footer class="relative flex flex-wrap justify-end gap-2 px-5 pt-4 pb-5">
          <DitherButton type="button" size="sm" variant="outline" color="ink" onClick={close}>
            Close
          </DitherButton>
          <Show when={status() && !status()!.found}>
            <DitherButton
              type="button"
              size="sm"
              variant="outline"
              color="ink"
              onClick={() => void refetch()}
            >
              Check again
            </DitherButton>
            <Show when={!status()!.matugenConfigured}>
              <DitherButton type="button" size="sm" color="ink" onClick={copy}>
                {copied() ? 'Copied' : 'Copy lines'}
              </DitherButton>
            </Show>
          </Show>
        </footer>
      </div>
    </dialog>
  )
}

export const WallpaperSetupDialog: Component = () => (
  <Show when={setupOpen()}>
    <Dialog />
  </Show>
)
