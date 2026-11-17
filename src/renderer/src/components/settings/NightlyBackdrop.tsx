import { Show, createEffect, createSignal, on, onCleanup, type Component } from 'solid-js'
import { DitherShader } from '../../lib/dither'

/**
 * "Unstable" backdrop for the Nightly channel: a dithered accent gradient that
 * glitches subtly — rows of dither jump sideways in steps, the edge breathes
 * with noise. Strongest bottom-right (away from the tile's text), zero under
 * the title. Unmounted entirely on Stable, so it costs nothing there.
 */
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  // Rows of ~5 cells sway sideways. Every term is continuous in time, so the
  // "instability" wobbles and drifts instead of jumping between frames.
  float row = floor(uv.y * res.y / 5.0);
  float j = snoise(vec2(row * 0.37, t * 0.55));
  // Only the stronger sways read as glitches; smoothstep eases them in and out.
  float glitch = smoothstep(0.45, 0.85, abs(j)) * sign(j) * 0.07;
  float sway = snoise(vec2(row * 0.11, t * 0.25)) * 0.012;
  vec2 p = uv + vec2(glitch + sway, 0.0);

  // Drifting diagonal gradient toward the bottom-right corner.
  float g = p.x * 0.8 + (1.0 - p.y) * 0.55;
  float n = snoise(p * vec2(2.6, 1.8) + vec2(t * 0.12, -t * 0.09)) * 0.16;
  float tone = smoothstep(0.55, 1.35, g + n);

  // Static: a few cells fade in and out on their own slow phase.
  vec2 cell = floor(uv * res / 2.0);
  float seed = hash21(cell);
  float twinkle = smoothstep(0.92, 1.0, sin(t * (0.6 + seed * 1.4) + seed * 6.2831) * 0.5 + 0.5);
  float sparkle = step(0.97, seed) * twinkle * tone;
  return clamp(tone * 0.62 + sparkle * 0.35, 0.0, 1.0);
}
`

const PALETTE = [
  'transparent',
  'color-mix(in oklch, var(--accent, #4da3f5) 28%, #121212)',
  'color-mix(in oklch, var(--accent, #4da3f5) 62%, #121212)'
] as const

export const NightlyBackdrop: Component<{ active: boolean }> = (props) => {
  // Mount → next frame turn on (so the enter transition runs from the hidden
  // state); off → transition out, then unmount and drop the WebGL context.
  const [mounted, setMounted] = createSignal(props.active)
  const [visible, setVisible] = createSignal(false)
  let timer: number | undefined
  let raf = 0
  createEffect(
    on(
      () => props.active,
      (on) => {
        window.clearTimeout(timer)
        cancelAnimationFrame(raf)
        if (on) {
          setMounted(true)
          raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        } else {
          setVisible(false)
          timer = window.setTimeout(() => setMounted(false), 760)
        }
      }
    )
  )
  onCleanup(() => {
    window.clearTimeout(timer)
    cancelAnimationFrame(raf)
  })

  return (
    <Show when={mounted()}>
      <div
        class="nightly-backdrop absolute inset-0 pointer-events-none"
        classList={{ 'is-on': visible() }}
        aria-hidden="true"
      >
        <DitherShader
          class="absolute inset-0"
          field={FIELD}
          palette={PALETTE}
          cell={2}
          matrix="bayer4"
          fps={24}
        />
      </div>
    </Show>
  )
}

export default NightlyBackdrop
