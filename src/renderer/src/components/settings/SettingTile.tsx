import { For, Match, Show, Switch, type Component } from 'solid-js'
import { DitherSwitch } from '../dithercn/dither-switch'
import { DitherSlider } from '../dithercn/dither-slider'
import { DitherTabs, DitherTabsList, DitherTabsTrigger } from '../dithercn/dither-tabs'
import { DitherButton } from '../dithercn/dither-button'
import type { Tile } from './schema'

/** One setting as a card: title + hint on top, the control where the hand goes. */
export const SettingTile: Component<{ tile: Tile }> = (props) => {
  const t = () => props.tile
  const toggleTile = () =>
    t().kind === 'toggle' ? (t() as Extract<Tile, { kind: 'toggle' }>) : null

  return (
    <Show
      when={t().kind !== 'custom'}
      fallback={<div class="col-span-2">{(t() as Extract<Tile, { kind: 'custom' }>).render()}</div>}
    >
      <div
        class="settings-tile group flex flex-col gap-3"
        classList={{
          'col-span-2': !!t().wide,
          'is-clickable': t().kind === 'toggle'
        }}
        onClick={() => {
          const tt = toggleTile()
          if (tt) tt.set(!tt.get())
        }}
      >
        <div class="flex items-start gap-3 min-w-0">
          <div class="min-w-0 flex-1">
            <div class="text-[13.5px] text-white/90">{t().title}</div>
            <Show when={t().hint}>
              <div class="mt-0.5 text-[12px] text-white/38 leading-snug">{t().hint}</div>
            </Show>
          </div>
          <Show when={toggleTile()}>
            {(tt) => (
              <div onClick={(e) => e.stopPropagation()} class="shrink-0">
                <DitherSwitch size="sm" color="ink" checked={tt().get()} onChange={tt().set} />
              </div>
            )}
          </Show>
          <Show when={t().kind === 'slider'}>
            <span class="shrink-0 text-[12.5px] tabular-nums text-white/70">
              {(t() as Extract<Tile, { kind: 'slider' }>).format(
                (t() as Extract<Tile, { kind: 'slider' }>).get()
              )}
            </span>
          </Show>
        </div>

        <Switch>
          <Match
            when={
              t().kind === 'choice' &&
              (t() as Extract<Tile, { kind: 'choice' }>).layout === 'grid' &&
              (t() as Extract<Tile, { kind: 'choice' }>)
            }
          >
            {(c) => (
              <div class="grid grid-cols-2 gap-1" role="radiogroup" aria-label={c().title}>
                <For each={c().options()}>
                  {(o) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={c().get() === o.value}
                      onClick={(e) => {
                        e.stopPropagation()
                        c().set(o.value)
                      }}
                      class="settings-option"
                      classList={{ 'is-active': c().get() === o.value }}
                    >
                      <span class="settings-option-dot" />
                      <span class="truncate">{o.label}</span>
                      <Show when={o.detail}>
                        <span class="ml-auto shrink-0 text-[11.5px] text-white/35">{o.detail}</span>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            )}
          </Match>
          <Match when={t().kind === 'choice' && (t() as Extract<Tile, { kind: 'choice' }>)}>
            {(c) => (
              <DitherTabs value={c().get()} onChange={c().set} variant="pill" color="ink">
                <DitherTabsList class="settings-tabs">
                  <For each={c().options()}>
                    {(o) => <DitherTabsTrigger value={o.value}>{o.label}</DitherTabsTrigger>}
                  </For>
                </DitherTabsList>
              </DitherTabs>
            )}
          </Match>
          <Match when={t().kind === 'slider' && (t() as Extract<Tile, { kind: 'slider' }>)}>
            {(s) => (
              <DitherSlider
                variant="bar"
                size="sm"
                color="ink"
                label={s().title}
                hideLabel
                ticks={s().ticks}
                min={s().min}
                max={s().max}
                step={s().step}
                value={s().get()}
                onValueChange={(v) => s().set(v[0])}
              />
            )}
          </Match>
          <Match when={t().kind === 'swatches' && (t() as Extract<Tile, { kind: 'swatches' }>)}>
            {(w) => (
              <div
                class="flex items-center gap-2"
                classList={{ 'opacity-35 pointer-events-none': !!w().disabled?.() }}
              >
                <For each={w().colors}>
                  {(c) => (
                    <button
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={w().get() === c.hex}
                      onClick={() => w().set(c.hex)}
                      class="settings-swatch"
                      classList={{ 'is-active': w().get() === c.hex }}
                      style={{ '--swatch': c.hex }}
                    />
                  )}
                </For>
              </div>
            )}
          </Match>
          <Match when={t().kind === 'action' && (t() as Extract<Tile, { kind: 'action' }>)}>
            {(a) => (
              <div>
                <DitherButton
                  size="sm"
                  variant="outline"
                  color={a().tone === 'danger' ? 'red' : 'ink'}
                  onClick={a().run}
                >
                  {a().label}
                </DitherButton>
              </div>
            )}
          </Match>
        </Switch>
      </div>
    </Show>
  )
}

export default SettingTile
