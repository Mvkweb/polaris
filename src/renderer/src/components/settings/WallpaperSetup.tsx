import { createResource, createSignal, Show, type Component } from 'solid-js'
import { DitherButton } from '../dithercn/dither-button'
import { wallpaperSync } from '../../store'

/**
 * Wallpaper sync status. Polaris only *reads* a palette file that matugen
 * writes from Polaris's template; it never edits matugen's config. This card
 * says whether that's wired up and, if not, gives the 3 lines to add.
 */
export const WallpaperSetup: Component = () => {
  const [status, { refetch }] = createResource(() => window.api.getThemeSetup?.())
  const [copied, setCopied] = createSignal(false)

  const snippet = (): string => {
    const s = status()
    return [
      '[templates.polaris]',
      `input_path = '${s?.templatePath ?? ''}'`,
      `output_path = '${s?.outputPath ?? '~/.config/polaris/theme.json'}'`
    ].join('\n')
  }
  const copy = (): void => {
    void navigator.clipboard.writeText(snippet())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Show when={status()}>
      {(s) => (
        <div class="settings-tile flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <span
              class="mt-1.5 size-2 shrink-0 rounded-full"
              classList={{
                'bg-emerald-400': s().found,
                'bg-amber-400': !s().found
              }}
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="text-[13.5px] text-white/90">
                <Show when={s().found} fallback="No wallpaper palette yet">
                  Wallpaper palette found
                </Show>
              </div>
              <div class="mt-0.5 text-[12px] leading-snug text-white/38">
                <Show
                  when={s().found}
                  fallback={
                    <Show
                      when={s().matugenInstalled}
                      fallback="Install matugen (or use dithergen) to generate one from your wallpaper."
                    >
                      <Show
                        when={s().matugenConfigured}
                        fallback="matugen is installed but doesn’t have Polaris’s template yet."
                      >
                        matugen is set up. Run it once (e.g. change your wallpaper) to write the
                        palette.
                      </Show>
                    </Show>
                  }
                >
                  Read from <span class="font-mono text-white/55">{s().outputPath}</span>
                  <Show when={!wallpaperSync()}> · sync is off, so the accent is used</Show>
                </Show>
              </div>
            </div>
            <DitherButton size="sm" variant="outline" color="ink" onClick={() => void refetch()}>
              Check again
            </DitherButton>
          </div>

          <Show when={!s().found && s().matugenInstalled && !s().matugenConfigured}>
            <div class="flex flex-col gap-2">
              <div class="text-[12px] text-white/55">
                Add this to <span class="font-mono text-white/70">~/.config/matugen/config.toml</span>,
                then run matugen once (Polaris won’t edit your matugen config):
              </div>
              <pre class="overflow-x-auto rounded-[10px] bg-white/[0.04] px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-white/80 select-all">
                {snippet()}
              </pre>
              <div class="flex justify-end">
                <DitherButton size="sm" color="ink" onClick={copy}>
                  {copied() ? 'Copied' : 'Copy'}
                </DitherButton>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}

export default WallpaperSetup
