import { For, Show, createMemo, onCleanup, onMount, type Component } from 'solid-js'
import {
  activeSettingsPage,
  closeSettingsModal,
  isSettingsModalOpen,
  restorePageDefaults,
  setActiveSettingsPage
} from '../../store'
import { Contours } from '../dithercn/contours'
import { DitherButton } from '../dithercn/dither-button'
import { PAGES } from './schema'
import { resetPrefs } from './prefs'
import { SettingTile } from './SettingTile'
import { UiIcon } from '../ui/AppIcons'
import './settings.css'

/** Contour palette from the live accent: near-black paper, two quiet ink steps. */
const CONTOUR_PALETTE = [
  '#0b0b0c',
  'color-mix(in oklch, var(--accent, #4da3f5) 24%, #0b0b0c)',
  'color-mix(in oklch, var(--accent, #4da3f5) 62%, #0b0b0c)'
] as const

/** Each page gets its own patch of terrain. */
const TERRAIN: Record<string, number> = {
  General: 1,
  Appearance: 0.8,
  Editor: 1.25,
  Files: 0.95,
  Media: 1.1,
  Uploads: 0.85,
  Keyboard: 1.35,
  About: 0.7
}

/**
 * Settings: rail · contour hero · tiles. The hero is a dithered topographic
 * map in the wallpaper accent that summarises the page (live chips + the one
 * action you came for); the tiles hold the controls.
 */
export const SettingsModal: Component = () => {
  const page = createMemo(() => PAGES.find((p) => p.id === activeSettingsPage()) ?? PAGES[0])

  const onKey = (e: KeyboardEvent): void => {
    if (!isSettingsModalOpen()) return
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSettingsModal()
    }
  }
  onMount(() => window.addEventListener('keydown', onKey))
  onCleanup(() => window.removeEventListener('keydown', onKey))

  const restore = (): void => {
    restorePageDefaults(page().id)
    resetPrefs(page().prefKeys)
  }

  return (
    <Show when={isSettingsModalOpen()}>
      <div
        class="settings-overlay fixed inset-0 z-50 flex items-center justify-center p-6 select-none"
        onClick={(e) => e.target === e.currentTarget && closeSettingsModal()}
      >
        <div
          class="settings-sheet relative flex gap-3 p-3 rounded-[26px] text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          {/* ── Rail ─────────────────────────────────────────────── */}
          <nav class="w-[200px] shrink-0 flex flex-col">
            <div class="h-11 px-3 flex items-center text-[15px] font-medium text-white/85">
              Settings
            </div>
            <div class="flex flex-col gap-1 mt-1" role="tablist" aria-orientation="vertical">
              <For each={PAGES}>
                {(p) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={page().id === p.id}
                    onClick={() => setActiveSettingsPage(p.id)}
                    class="settings-nav h-10 px-3 rounded-[13px] flex items-center gap-3 text-[13.5px]"
                    classList={{ 'is-active': page().id === p.id }}
                  >
                    <UiIcon name={p.icon} size={20} />
                    <span>{p.label}</span>
                  </button>
                )}
              </For>
            </div>
            <div class="mt-auto px-1 pb-1">
              <button
                type="button"
                onClick={restore}
                class="settings-nav w-full h-9 px-3 rounded-[12px] flex items-center gap-2.5 text-[12.5px]"
                title="Restore this page's defaults"
              >
                <svg
                  viewBox="0 0 16 16"
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3h3" />
                </svg>
                Restore defaults
              </button>
            </div>
          </nav>

          {/* ── Hero: contour map summarising the page ───────────── */}
          <section class="settings-hero relative w-[340px] shrink-0 rounded-[22px] overflow-hidden">
            <Contours
              class="absolute inset-0"
              palette={CONTOUR_PALETTE}
              lines={16}
              index={5}
              relief={0.45}
              scale={TERRAIN[page().id] ?? 1}
            />
            <div class="settings-hero-shade absolute inset-0" />

            <Show when={page()} keyed>
              {(p) => (
                <div class="settings-hero-content relative h-full flex flex-col p-6">
                  <div class="flex flex-wrap gap-1.5">
                    <For each={p.hero.chips()}>{(c) => <span class="settings-chip">{c}</span>}</For>
                  </div>

                  <div class="settings-hero-glyph mx-auto my-auto">
                    <UiIcon name={p.icon} size={44} />
                  </div>

                  <div class="text-[12.5px] text-white/55">{p.hero.eyebrow()}</div>
                  <h2 class="mt-0.5 text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] text-white">
                    {p.hero.title}
                  </h2>
                  <p class="mt-2 text-[13px] leading-relaxed text-white/55">{p.hero.blurb}</p>

                  <Show when={p.hero.primary}>
                    {(primary) => (
                      <div class="mt-5">
                        <DitherButton size="md" color="ink" onClick={() => primary()().run()}>
                          {primary()().label}
                        </DitherButton>
                      </div>
                    )}
                  </Show>
                </div>
              )}
            </Show>
          </section>

          {/* ── Tiles ────────────────────────────────────────────── */}
          <section class="flex-1 min-w-0 flex flex-col">
            <header class="h-11 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={closeSettingsModal}
                aria-label="Close settings"
                title="Close (Esc)"
                class="settings-close w-9 h-9 rounded-full flex items-center justify-center"
              >
                <svg
                  viewBox="0 0 16 16"
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="m4.5 4.5 7 7m0-7-7 7" />
                </svg>
              </button>
            </header>

            <Show when={page()} keyed>
              {(p) => (
                <div class="settings-body flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
                  <For each={p.sections}>
                    {(section) => (
                      <div class="settings-section">
                        <Show when={section.title}>
                          <div class="settings-section-title">{section.title}</div>
                        </Show>
                        <div class="grid grid-cols-2 gap-2">
                          <For each={section.tiles}>{(tile) => <SettingTile tile={tile} />}</For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </Show>
          </section>
        </div>
      </div>
    </Show>
  )
}

export default SettingsModal
