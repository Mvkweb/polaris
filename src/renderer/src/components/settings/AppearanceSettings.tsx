import { Component, For, JSX, Show, createSignal, onCleanup } from 'solid-js'
import { SolarCheckLinear, SolarRotateCcwLinear } from '../ui/SolarIcons'
import MockupBadge from '../ui/MockupBadge'
import {
  ColorSchemeMode,
  ThemePresetId,
  colorScheme,
  setColorScheme,
  activeThemeId,
  setActiveThemeId,
  appearanceContrast,
  setAppearanceContrast,
  glassOpacity,
  setGlassOpacity,
  showSunrays,
  setShowSunrays
} from '../../store'

// ── Motion (transitions.dev vocabulary) ──────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_IO = 'ease-in-out'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const ms = (n: number) => (reducedMotion() ? 0 : n)

// ── Layout ───────────────────────────────────────────────────────────────────

const Section: Component<{
  title: string
  count?: number
  badge?: JSX.Element
  children: JSX.Element
}> = (props) => (
  <section class="flex flex-col">
    <div class="flex items-center gap-2 pb-1 select-none">
      <h2 class="text-[13px] font-medium text-white/45">{props.title}</h2>
      <Show when={props.count !== undefined}>
        <span class="text-[12px] text-white/25 tabular-nums">{props.count}</span>
      </Show>
      <Show when={props.badge}>{props.badge}</Show>
    </div>
    {props.children}
  </section>
)

interface SettingRowProps {
  title: string
  description: string
  children: JSX.Element
  badge?: JSX.Element
  clickable?: boolean
  onClick?: () => void
  onPointerDown?: (e: PointerEvent) => void
}

const SettingRow: Component<SettingRowProps> = (props) => (
  <div
    class={`group relative py-3.5 flex items-center justify-between gap-8 select-none ${
      props.clickable ? 'cursor-pointer' : ''
    }`}
    onClick={() => props.onClick?.()}
    onPointerDown={(e) => props.onPointerDown?.(e)}
  >
    <div class="flex flex-col min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-[13.5px] font-medium text-white/90">{props.title}</span>
        <Show when={props.badge}>{props.badge}</Show>
      </div>
      <span class="text-[12px] text-white/40 mt-0.5">{props.description}</span>
    </div>
    <div class="shrink-0 flex items-center">{props.children}</div>
  </div>
)

// ── Mini app preview ─────────────────────────────────────────────────────────
// A small but believable slice of the app: glowing sidebar, rounded editor panel
// with tabs, gutter, syntax-coloured lines, an active line with caret, status bar.
// Horizontal sizes are percentages so it scales from the 3-up grid to anything.

interface Palette {
  sidebar: string
  panel: string
  tab: string
  accent: string
  code1: string
  code2: string
  code3: string
  glow: string
  /** r,g,b used for text lines */
  ink: string
}

const LIGHT: Palette = {
  sidebar: '#e4e4e7',
  panel: '#f8f8f9',
  tab: '#e9e9ec',
  accent: '#52525b',
  code1: '#71717a',
  code2: '#a1a1aa',
  code3: '#d4d4d8',
  glow: 'rgba(113,113,122,0.2)',
  ink: '0,0,0'
}

const DARK: Palette = {
  sidebar: '#050506',
  panel: '#0e0e10',
  tab: '#1a1a1d',
  accent: '#a1a1aa',
  code1: '#a1a1aa',
  code2: '#71717a',
  code3: '#3f3f46',
  glow: 'rgba(161,161,170,0.14)',
  ink: '255,255,255'
}

const seg = (w: string, color: string, opacity = 1) => (
  <span
    class="h-[3px] rounded-full shrink-0"
    style={{ width: w, 'background-color': color, opacity }}
  />
)

const Wireframe: Component<{ palette: Palette; style?: JSX.CSSProperties }> = (props) => {
  const p = () => props.palette
  const ink = (a: number) => `rgba(${p().ink},${a})`

  // [indent, segments, isActiveLine]
  const rows: { indent: number; active?: boolean; parts: JSX.Element[] }[] = [
    { indent: 0, parts: [seg('14%', p().code1), seg('24%', ink(0.6)), seg('12%', p().code2)] },
    { indent: 1, parts: [seg('26%', p().code2), seg('16%', ink(0.3))] },
    {
      indent: 1,
      active: true,
      parts: [seg('12%', p().code1), seg('24%', p().accent), seg('10%', ink(0.3))]
    },
    { indent: 2, parts: [seg('30%', ink(0.3))] },
    { indent: 1, parts: [seg('18%', p().code1), seg('14%', p().code2)] },
    { indent: 0, parts: [seg('20%', p().code3, 0.9)] }
  ]

  return (
    <div
      class="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ 'background-color': p().sidebar, ...props.style }}
    >
      {/* Sidebar glow, like the app's */}
      <div
        class="absolute left-0 top-0 w-[46%] h-[85%]"
        style={{
          background: `radial-gradient(ellipse 85% 80% at 0% 0%, ${p().glow}, transparent)`
        }}
      />

      {/* Sidebar */}
      <div class="absolute left-0 top-0 bottom-0 w-[27%] p-2 flex flex-col gap-1.5">
        <div class="flex items-center gap-[3px] mb-1">
          <span class="w-1 h-1 rounded-full" style={{ 'background-color': ink(0.25) }} />
          <span class="w-1 h-1 rounded-full" style={{ 'background-color': ink(0.25) }} />
          <span class="w-1 h-1 rounded-full" style={{ 'background-color': ink(0.25) }} />
        </div>
        <div
          class="h-[10px] rounded-[3px] flex items-center gap-1.5 px-1"
          style={{ 'background-color': p().tab }}
        >
          <span
            class="w-[5px] h-[5px] rounded-[1.5px]"
            style={{ 'background-color': p().accent }}
          />
          <span class="h-[3px] w-3/5 rounded-full" style={{ 'background-color': ink(0.55) }} />
        </div>
        <div class="h-[10px] flex items-center gap-1.5 px-1">
          <span class="w-[5px] h-[5px] rounded-[1.5px]" style={{ 'background-color': ink(0.2) }} />
          <span class="h-[3px] w-1/2 rounded-full" style={{ 'background-color': ink(0.25) }} />
        </div>
        <div class="h-[10px] flex items-center gap-1.5 px-1">
          <span class="w-[5px] h-[5px] rounded-[1.5px]" style={{ 'background-color': ink(0.2) }} />
          <span class="h-[3px] w-2/5 rounded-full" style={{ 'background-color': ink(0.25) }} />
        </div>
        <span class="mt-1.5 h-[3px] w-4/5 rounded-full" style={{ 'background-color': ink(0.12) }} />
        <span class="h-[3px] w-3/5 rounded-full" style={{ 'background-color': ink(0.09) }} />
      </div>

      {/* Editor panel */}
      <div
        class="absolute top-1.5 right-1.5 bottom-1.5 left-[29%] rounded-lg overflow-hidden"
        style={{ 'background-color': p().panel }}
      >
        {/* Tabs */}
        <div class="absolute top-0 inset-x-0 h-[22px] flex items-center gap-1 px-1.5">
          <div
            class="h-[12px] px-1.5 rounded-[4px] flex items-center gap-1"
            style={{ 'background-color': p().tab }}
          >
            <span class="w-1 h-1 rounded-full" style={{ 'background-color': p().accent }} />
            <span class="h-[3px] w-6 rounded-full" style={{ 'background-color': ink(0.55) }} />
          </div>
          <div class="h-[12px] px-1.5 flex items-center">
            <span class="h-[3px] w-5 rounded-full" style={{ 'background-color': ink(0.18) }} />
          </div>
        </div>

        {/* Code */}
        <div class="absolute inset-x-0 top-[24px] bottom-[15px] overflow-hidden flex flex-col">
          <For each={rows}>
            {(row) => (
              <div
                class="h-[9px] shrink-0 flex items-center"
                style={{ 'background-color': row.active ? ink(0.05) : undefined }}
              >
                <span class="w-[18px] flex justify-center shrink-0">
                  <span
                    class="h-[2px] w-[6px] rounded-full"
                    style={{ 'background-color': ink(row.active ? 0.3 : 0.13) }}
                  />
                </span>
                <div
                  class="flex-1 flex items-center gap-1 pr-2"
                  style={{ 'padding-left': `${row.indent * 8}px` }}
                >
                  {row.parts}
                  {row.active && (
                    <span class="w-px h-[7px]" style={{ 'background-color': p().accent }} />
                  )}
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Status bar */}
        <div class="absolute bottom-0 inset-x-0 h-[14px] flex items-center justify-between px-2">
          <div class="flex items-center gap-1">
            <span class="h-[3px] w-5 rounded-full" style={{ 'background-color': p().accent }} />
            <span class="h-[3px] w-7 rounded-full" style={{ 'background-color': ink(0.18) }} />
          </div>
          <span class="h-[3px] w-4 rounded-full" style={{ 'background-color': ink(0.14) }} />
        </div>
      </div>
    </div>
  )
}

// ── Preview tile ─────────────────────────────────────────────────────────────
// Selection = a soft plate behind the tile (tinted with the theme's accent when
// there is one), a brighter preview and label, and a check that swaps in.

const PreviewTile: Component<{
  active: boolean
  label: string
  height: number
  dot?: string
  tint?: string
  onSelect: () => void
  children: JSX.Element
}> = (props) => (
  <button
    type="button"
    role="radio"
    aria-checked={props.active}
    onClick={props.onSelect}
    class="group flex flex-col gap-2 p-1.5 rounded-[14px] text-left outline-none cursor-pointer select-none transition-all duration-[130ms] active:scale-[0.985] focus-visible:brightness-125"
    style={{
      'background-color': props.active ? (props.tint ?? 'rgba(255,255,255,0.07)') : 'transparent'
    }}
  >
    <div
      class={`relative rounded-lg overflow-hidden transition-opacity duration-[130ms] ${
        props.active ? 'opacity-100' : 'opacity-65 group-hover:opacity-100'
      }`}
      style={{ height: `${props.height}px` }}
    >
      {props.children}
    </div>

    <div class="h-5 px-1 flex items-center gap-2">
      <Show when={props.dot}>
        <span class="w-2 h-2 rounded-full shrink-0" style={{ 'background-color': props.dot }} />
      </Show>
      <span
        class={`flex-1 min-w-0 truncate text-[12px] font-medium transition-colors duration-[130ms] ${
          props.active ? 'text-white/95' : 'text-white/50 group-hover:text-white/80'
        }`}
      >
        {props.label}
      </span>
      <SolarCheckLinear
        class="shrink-0 text-white w-[13px] h-[13px]"
        style={{
          opacity: props.active ? 1 : 0,
          transform: props.active ? 'scale(1)' : 'scale(0.6)',
          filter: props.active ? 'blur(0px)' : 'blur(2px)',
          transition: `opacity ${ms(250)}ms ${EASE_IO}, transform ${ms(250)}ms ${EASE_OUT}, filter ${ms(250)}ms ${EASE_IO}`
        }}
      />
    </div>
  </button>
)

// ── Data ─────────────────────────────────────────────────────────────────────

const COLOR_SCHEMES: { id: ColorSchemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
]

interface ThemeDefinition extends Palette {
  id: ThemePresetId
  label: string
}

const theme = (t: Omit<ThemeDefinition, 'ink' | 'glow'>): ThemeDefinition => ({
  ...t,
  ink: '255,255,255',
  glow: `${t.accent}59`
})

const THEME_PRESETS: ThemeDefinition[] = [
  theme({
    id: 'ember',
    label: 'Ember',
    accent: '#FF66B8',
    panel: '#0c0609',
    sidebar: '#070305',
    tab: '#180b13',
    code1: '#FF66B8',
    code2: '#FDA4AF',
    code3: '#9F1239'
  }),
  theme({
    id: 'abyssal',
    label: 'Abyssal Blue',
    accent: '#38BDF8',
    panel: '#050a12',
    sidebar: '#03060a',
    tab: '#0a1424',
    code1: '#38BDF8',
    code2: '#93C5FD',
    code3: '#1E3A8A'
  }),
  theme({
    id: 'obsidian',
    label: 'Obsidian',
    accent: '#CBD5E1',
    panel: '#090a0c',
    sidebar: '#050607',
    tab: '#14171c',
    code1: '#E2E8F0',
    code2: '#94A3B8',
    code3: '#475569'
  }),
  theme({
    id: 'nocturne',
    label: 'Nocturne Pine',
    accent: '#10B981',
    panel: '#040d08',
    sidebar: '#020704',
    tab: '#081a10',
    code1: '#10B981',
    code2: '#6EE7B7',
    code3: '#064E3B'
  }),
  theme({
    id: 'amethyst',
    label: 'Twilight Amethyst',
    accent: '#A855F7',
    panel: '#0a0512',
    sidebar: '#06030b',
    tab: '#170a26',
    code1: '#A855F7',
    code2: '#D8B4FE',
    code3: '#581C87'
  }),
  theme({
    id: 'umber',
    label: 'Burnt Umber',
    accent: '#FB923C',
    panel: '#100602',
    sidebar: '#090301',
    tab: '#240c04',
    code1: '#FB923C',
    code2: '#FDBA74',
    code3: '#7C2D12'
  })
]

// ── Inline ScrubSlider (unchanged) ───────────────────────────────────────────

interface ScrubSliderProps {
  label?: string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  displayValue: string
  onChange: (val: number) => void
  onReset: () => void
}

const ScrubSlider: Component<ScrubSliderProps> = (props) => {
  const fillPct = () =>
    Math.min(100, Math.max(0, ((props.value - props.min) / (props.max - props.min)) * 100))

  return (
    <div class="flex items-center gap-1.5">
      {/* Reset button sits to the left so the slider itself stays flush-right */}
      <Show when={props.value !== props.defaultValue}>
        <button
          type="button"
          onClick={props.onReset}
          title="Reset to default"
          class="h-7 w-7 rounded-md flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none"
        >
          <SolarRotateCcwLinear class="w-3 h-3" />
        </button>
      </Show>

      <div class="relative w-40 h-8 rounded-md bg-white/[0.04] hover:bg-white/[0.06] transition-colors overflow-hidden select-none cursor-ew-resize group/slider">
        <div
          class="absolute inset-y-0 left-0 bg-white/[0.09] group-hover/slider:bg-white/[0.13] transition-[width,background-color] duration-75 pointer-events-none"
          style={{ width: `${fillPct()}%` }}
        />

        <span class="absolute inset-y-0 left-2.5 flex items-center text-[11px] font-medium text-white/40 group-hover/slider:text-white/60 pointer-events-none z-10 transition-colors">
          {props.label}
        </span>

        <span class="absolute inset-y-0 right-2.5 flex items-center text-[11.5px] font-mono text-white/85 pointer-events-none z-10 tabular-nums">
          {props.displayValue}
        </span>

        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onInput={(e) => props.onChange(Number(e.currentTarget.value))}
          aria-label={props.label || 'Slider'}
          class="appearance-none absolute inset-0 w-full h-full m-0 p-0 bg-transparent cursor-ew-resize opacity-0 z-20"
        />
      </div>
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────────────────

const TRACK_W = 30
const TRACK_PAD = 2
const KNOB = 14

const ToggleRow: Component<{
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}> = (props) => {
  const [pressed, setPressed] = createSignal(false)

  const release = () => {
    setPressed(false)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }
  onCleanup(release)

  const knobWidth = () => (pressed() ? KNOB + 4 : KNOB)
  const knobX = () => (props.checked ? TRACK_W - TRACK_PAD * 2 - knobWidth() : 0)

  return (
    <SettingRow
      title={props.title}
      description={props.description}
      clickable
      onClick={() => props.onChange(!props.checked)}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        setPressed(true)
        window.addEventListener('pointerup', release)
        window.addEventListener('pointercancel', release)
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.title}
        class={`flex items-center h-[18px] rounded-full outline-none cursor-pointer focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.18)] ${
          props.checked ? 'bg-white/[0.32]' : 'bg-white/[0.08] group-hover:bg-white/[0.12]'
        }`}
        style={{
          width: `${TRACK_W}px`,
          padding: `${TRACK_PAD}px`,
          transition: `background-color ${ms(130)}ms ${EASE_OUT}, box-shadow ${ms(130)}ms ${EASE_OUT}`
        }}
      >
        <span
          class="block rounded-full"
          style={{
            height: `${KNOB}px`,
            width: `${knobWidth()}px`,
            background: props.checked ? '#fff' : 'rgba(255,255,255,0.55)',
            transform: `translateX(${knobX()}px)`,
            transition: `transform ${ms(130)}ms ${EASE_OUT}, width ${ms(90)}ms ${EASE_OUT}, background-color ${ms(130)}ms ${EASE_OUT}`
          }}
        />
      </button>
    </SettingRow>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export const AppearanceSettings: Component = () => {
  return (
    <div class="flex flex-col gap-8 w-full max-w-[680px] mx-auto pb-12 select-none">
      <div class="flex flex-col gap-1">
        <h1 class="text-[20px] font-semibold text-white/95 tracking-tight">Appearance</h1>
        <p class="text-[13.5px] text-white/40">Color scheme, theme and interface effects.</p>
      </div>

      <div class="flex flex-col gap-8">
        <Section title="Color Scheme" badge={<MockupBadge />}>
          {/* -mx-1.5 lines the previews up with the text column above and below */}
          <div
            role="radiogroup"
            aria-label="Color scheme"
            class="grid grid-cols-3 gap-2 -mx-1.5 pt-1"
          >
            <For each={COLOR_SCHEMES}>
              {(option) => (
                <PreviewTile
                  active={colorScheme() === option.id}
                  label={option.label}
                  height={88}
                  onSelect={() => setColorScheme(option.id)}
                >
                  <Show when={option.id === 'system'}>
                    <Wireframe palette={LIGHT} />
                    <Wireframe palette={DARK} style={{ 'clip-path': 'inset(0 0 0 50%)' }} />
                  </Show>
                  <Show when={option.id === 'light'}>
                    <Wireframe palette={LIGHT} />
                  </Show>
                  <Show when={option.id === 'dark'}>
                    <Wireframe palette={DARK} />
                  </Show>
                </PreviewTile>
              )}
            </For>
          </div>
        </Section>

        <Section title="Themes" count={THEME_PRESETS.length} badge={<MockupBadge />}>
          <div role="radiogroup" aria-label="Theme" class="grid grid-cols-3 gap-2 -mx-1.5 pt-1">
            <For each={THEME_PRESETS}>
              {(t) => (
                <PreviewTile
                  active={activeThemeId() === t.id}
                  label={t.label}
                  height={104}
                  dot={t.accent}
                  tint={`${t.accent}1f`}
                  onSelect={() => setActiveThemeId(t.id)}
                >
                  <Wireframe palette={t} />
                </PreviewTile>
              )}
            </For>
          </div>
        </Section>

        <Section title="Interface">
          <SettingRow
            title="Contrast"
            description="Contrast of surfaces and text across the app"
            badge={<MockupBadge />}
          >
            <ScrubSlider
              label="Level"
              min={80}
              max={120}
              step={5}
              value={appearanceContrast()}
              defaultValue={100}
              displayValue={`${appearanceContrast()}%`}
              onChange={setAppearanceContrast}
              onReset={() => setAppearanceContrast(100)}
            />
          </SettingRow>

          <SettingRow
            title="Glass Opacity"
            description="How solid sidebars, dialogs and popovers are"
            badge={<MockupBadge />}
          >
            <ScrubSlider
              label="Alpha"
              min={30}
              max={100}
              step={5}
              value={glassOpacity()}
              defaultValue={65}
              displayValue={`${glassOpacity()}%`}
              onChange={setGlassOpacity}
              onReset={() => setGlassOpacity(65)}
            />
          </SettingRow>

          <ToggleRow
            title="Ambient Sunrays"
            description="Light-ray shader behind the settings pages"
            checked={showSunrays()}
            onChange={setShowSunrays}
          />
        </Section>
      </div>
    </div>
  )
}

export default AppearanceSettings
