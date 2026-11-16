import { createEffect, onCleanup } from 'solid-js'
import { activeAccentColor, activeWallpaperTheme, setWallpaperTheme } from './store'
import type { WallpaperPalette } from './types'

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0
  ]
}

/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
const onColor = (hex: string): string => {
  const lin = hexToRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
  return L > 0.179 ? '#000000' : '#ffffff'
}

/**
 * Publishes the palette as CSS variables in one pass on :root. Everything else
 * (glows, tints, dither ink) derives from these with color-mix, so a wallpaper
 * change is a handful of property writes and one style recalc.
 *
 *   --accent / --accent-rgb  primary
 *   --accent-on              text on primary
 *   --accent-container       deep, low-chroma primary for filled surfaces
 *   --accent-2               tertiary — secondary glow / highlights
 */
export const useThemeVariables = (): void => {
  createEffect(() => {
    const accent = activeAccentColor()
    const wp = activeWallpaperTheme()
    const [r, g, b] = hexToRgb(accent)
    const root = document.documentElement.style
    root.setProperty('--accent', accent)
    root.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    root.setProperty('--accent-on', wp?.onPrimary ?? onColor(accent))
    root.setProperty(
      '--accent-container',
      wp?.primaryContainer ?? `color-mix(in oklab, ${accent} 28%, #0a0a0a)`
    )
    root.setProperty('--accent-2', wp?.tertiary ?? `oklch(from ${accent} l c calc(h + 40))`)

    // Folder icons: rebuild the stock blue gradient around the wallpaper primary,
    // keeping its light→deep shape. Cleared (stock blue) when sync is off.
    if (wp) {
      const mix = (pct: number, to: string): string =>
        `color-mix(in oklab, ${wp.primary} ${pct}%, ${to})`
      root.setProperty('--folder-back-hi', mix(80, '#ffffff'))
      root.setProperty('--folder-back-lo', mix(70, '#000000'))
      root.setProperty('--folder-front-1', mix(65, '#ffffff'))
      root.setProperty('--folder-front-2', mix(88, '#ffffff'))
      root.setProperty('--folder-front-3', mix(78, '#000000'))
      root.setProperty('--folder-front-4', mix(62, '#000000'))
    } else {
      for (const k of FOLDER_VARS) root.removeProperty(k)
    }
    applySyntax(root, wp)
  })
}

const FOLDER_VARS = [
  '--folder-back-hi',
  '--folder-back-lo',
  '--folder-front-1',
  '--folder-front-2',
  '--folder-front-3',
  '--folder-front-4'
]

// ── Wallpaper syntax palette ────────────────────────────────────────────────
// Hues orbit the wallpaper's primary; lightness and chroma are pinned per role in
// OKLCH so every token stays readable on the dark editor no matter the image.
// Low-chroma wallpapers borrow the tertiary's hue (or a cool default) and are
// rendered more quietly.

const srgbToLinear = (c: number): number => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** hex → [L, C, h°] in OKLCH */
const hexToOklch = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(A, B)
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return [L, C, h]
}

/**
 * [role, lightness, chroma, hue offset from the anchor]
 *
 * Analogous, not complementary: every hue stays within ~45° of the wallpaper so
 * a red wallpaper never grows green strings. Roles are told apart mostly by
 * lightness and chroma — saturated keywords, softer types/functions, pale
 * strings, near-neutral identifiers — which reads calmer than a hue rainbow.
 */
const SYNTAX_ROLES: ReadonlyArray<readonly [string, number, number, number]> = [
  ['keyword', 0.76, 0.13, 0], //        the wallpaper itself, most saturated
  ['tag', 0.76, 0.13, 0],
  ['type', 0.84, 0.085, 22], //         neighbour, lighter and softer
  ['function', 0.86, 0.07, -26], //     the other neighbour
  ['string', 0.87, 0.05, 40], //        pale and soft, pulled toward type
  ['number', 0.8, 0.1, -45], //         the far side, a little punchier
  ['property', 0.89, 0.025, 0], //      near-neutral, tinted
  ['variable', 0.93, 0.01, 0],
  ['operator', 0.72, 0.04, 0],
  ['punctuation', 0.62, 0.025, 0],
  ['comment', 0.56, 0.03, 0] //         quiet, italic does the rest
]

const SYNTAX_VARS = SYNTAX_ROLES.map(([role]) => `--syn-${role}`)

const applySyntax = (root: CSSStyleDeclaration, wp: WallpaperPalette | null): void => {
  if (!wp) {
    for (const k of SYNTAX_VARS) root.removeProperty(k)
    return
  }
  const [, pc, ph] = hexToOklch(wp.primary)
  const [, tc, th] = hexToOklch(wp.tertiary)
  // Greyish wallpapers have no meaningful hue: borrow tertiary's, else a cool default.
  const anchor = pc >= 0.03 ? ph : tc >= 0.03 ? th : 255
  // Scale saturation with how colourful the wallpaper is: muted image → calm code.
  const vivid = Math.min(1, Math.max(0.45, Math.max(pc, tc) / 0.11))
  for (const [role, L, C, dh] of SYNTAX_ROLES) {
    const h = (anchor + dh + 360) % 360
    root.setProperty(`--syn-${role}`, `oklch(${L} ${(C * vivid).toFixed(3)} ${h.toFixed(1)})`)
  }
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Load the current wallpaper palette and follow live changes from main. */
export const useWallpaperTheme = (): void => {
  const api = window.api
  if (!api?.getWallpaperTheme) return

  let first = true
  const apply = (theme: WallpaperPalette | null): void => {
    const commit = (): void => {
      setWallpaperTheme(theme)
    }
    // First load is silent; live changes crossfade on the compositor (one snapshot,
    // no per-frame restyles). Hidden windows just swap.
    if (!first && !reducedMotion() && document.visibilityState === 'visible') {
      document.startViewTransition?.(commit) ?? commit()
    } else {
      commit()
    }
    first = false
  }

  void api.getWallpaperTheme().then((t) => {
    if (first) apply(t)
  })
  const off = api.onWallpaperTheme((t) => {
    first = false
    apply(t)
  })
  onCleanup(off)
}
