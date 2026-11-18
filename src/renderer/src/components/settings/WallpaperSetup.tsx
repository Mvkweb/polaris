import {
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  type Component
} from 'solid-js'
import type { MatugenSetupResult, ThemeSetupStatus } from '../../../../shared/ipcModels'
import { Aurora } from '../dithercn/aurora'
import { DitherButton } from '../dithercn/dither-button'
import { addTerminal, setWallpaperSync } from '../../store'
import '../file-tree/open-with.css'

/**
 * Wallpaper sync setup, step by step. Polaris reads the palette matugen
 * writes from Polaris's template. The modal follows along live (no "check
 * again"): install matugen → add the template (one click, done safely by
 * main) → wait for a wallpaper change or pick one now → done.
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

/** After "Install matugen" the modal steps aside for the terminal; reopen it once installed. */
let installWatch: number | undefined
const reopenWhenInstalled = (): void => {
  window.clearInterval(installWatch)
  const started = Date.now()
  installWatch = window.setInterval(async () => {
    const s = await window.api.getThemeSetup().catch(() => null)
    if (s?.matugenInstalled || Date.now() - started > 10 * 60_000) {
      window.clearInterval(installWatch)
      if (s?.matugenInstalled) setSetupOpen(true)
    }
  }, 2000)
}

type Step = 'install' | 'configure' | 'waiting' | 'done'

const Dialog: Component = () => {
  let dialog!: HTMLDialogElement
  const [status, setStatus] = createSignal<ThemeSetupStatus | null>(null)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const [backup, setBackup] = createSignal('')
  const [copied, setCopied] = createSignal(false)

  const refresh = async (): Promise<void> => {
    const s = await window.api.getThemeSetup().catch(() => null)
    if (s) setStatus(s)
  }
  // Follow along live while open: cheap checks (a `which` and a file read).
  onMount(() => {
    dialog.showModal()
    void refresh()
    const poll = window.setInterval(() => void refresh(), 1500)
    const off = window.api.onWallpaperTheme?.(() => void refresh())
    onCleanup(() => {
      window.clearInterval(poll)
      off?.()
    })
  })

  const step = createMemo<Step | null>(() => {
    const s = status()
    if (!s) return null
    if (s.found) return 'done'
    if (!s.matugenInstalled) return 'install'
    if (!s.matugenConfigured) return 'configure'
    return 'waiting'
  })

  const close = (): void => {
    dialog.close()
    setSetupOpen(false)
  }
  const snippet = (): string =>
    [
      '[templates.polaris]',
      `input_path = '${status()?.templatePath ?? ''}'`,
      `output_path = '${status()?.outputPath ?? ''}'`
    ].join('\n')

  const install = (): void => {
    addTerminal(undefined, 'sudo pacman -S --needed matugen')
    reopenWhenInstalled()
    close()
  }
  const setUp = async (): Promise<void> => {
    setBusy(true)
    setError('')
    const res: MatugenSetupResult = await window.api.addMatugenTemplate().catch(() => ({
      ok: false,
      error: 'Something went wrong; nothing was changed.'
    }))
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'Nothing was changed.')
    else setBackup(res.backupPath ?? '')
    await refresh()
  }
  const useWallpaperNow = async (): Promise<void> => {
    setBusy(true)
    setError('')
    await window.api
      .generateThemeFromImage()
      .catch(() => setError('matugen couldn’t read that image.'))
    setBusy(false)
    await refresh()
  }
  const copy = (): void => {
    void navigator.clipboard.writeText(snippet())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const title = (): string =>
    ({
      install: 'Install matugen to sync colours',
      configure: 'Let matugen make Polaris’s palette',
      waiting: 'All set, waiting for your wallpaper',
      done: 'Palette found, colours are synced'
    })[step() ?? 'configure']

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
            {title()}
          </h2>
        </header>

        <div class="relative px-5 pt-3 text-[12.5px] leading-relaxed text-white/60">
          <Switch>
            <Match when={step() === 'install'}>
              <p>
                Polaris takes its colours from your wallpaper through{' '}
                <span class="text-white/85">matugen</span>. Install it and this window comes back
                for the next step.
              </p>
            </Match>
            <Match when={step() === 'configure'}>
              <p>
                Polaris will add these lines to your matugen config (
                <span class="font-mono text-white/75">{status()?.configPath}</span>). Your current
                config is backed up first and checked by matugen before it’s saved.
              </p>
              <pre class="mt-2 overflow-x-auto rounded-[10px] bg-white/[0.04] px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-white/80 select-all">
                {snippet()}
              </pre>
              <p class="mt-2 text-[11.5px] text-white/35">
                Prefer doing it yourself?{' '}
                <button type="button" class="underline hover:text-white/70" onClick={copy}>
                  {copied() ? 'Copied' : 'Copy the lines'}
                </button>{' '}
                and paste them into that file.
              </p>
            </Match>
            <Match when={step() === 'waiting'}>
              <p>
                matugen will update Polaris the next time your wallpaper changes. Want colours right
                now? Pick your current wallpaper.
              </p>
              <Show when={backup()}>
                <p class="mt-2 text-[11.5px] text-white/35">
                  Your previous matugen config is saved as{' '}
                  <span class="font-mono text-white/55">{backup()}</span>.
                </p>
              </Show>
              <p class="mt-2 text-[11.5px] text-white/35">
                If your wallpaper script runs matugen with its own <span class="font-mono">-c</span>{' '}
                config, add the lines there too.
              </p>
            </Match>
            <Match when={step() === 'done'}>
              <p>Polaris is following your wallpaper. Change it anytime and the colours follow.</p>
            </Match>
          </Switch>
          <Show when={error()}>
            <p role="alert" class="mt-2 text-[12px] text-rose-300/90">
              {error()}
            </p>
          </Show>
        </div>

        <footer class="relative flex flex-wrap justify-end gap-2 px-5 pt-4 pb-5">
          <DitherButton type="button" size="sm" variant="outline" color="ink" onClick={close}>
            {step() === 'done' ? 'Done' : 'Close'}
          </DitherButton>
          <Switch>
            <Match when={step() === 'install'}>
              <DitherButton type="button" size="sm" color="ink" onClick={install}>
                Install matugen
              </DitherButton>
            </Match>
            <Match when={step() === 'configure'}>
              <DitherButton
                type="button"
                size="sm"
                color="ink"
                disabled={busy()}
                loading={busy()}
                onClick={() => void setUp()}
              >
                Set it up for me
              </DitherButton>
            </Match>
            <Match when={step() === 'waiting'}>
              <DitherButton
                type="button"
                size="sm"
                color="ink"
                disabled={busy()}
                loading={busy()}
                onClick={() => void useWallpaperNow()}
              >
                Use a wallpaper now…
              </DitherButton>
            </Match>
          </Switch>
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
