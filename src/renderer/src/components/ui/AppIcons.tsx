import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import * as Solar from './SolarIcons'
import { prefs } from '../settings/prefs'

/**
 * App-wide UI icons with a switchable set (Settings → Appearance → Interface
 * icons). Every chrome icon goes through here so the two sets never mix.
 *
 * - Solar: 480 Design, CC BY 4.0 (smooth 24px linear).
 * - Dinkie Icons: atelierAnchor, MIT (12px pixel grid). Rendered only at whole
 *   multiples of 12px with crisp edges, so the pixels stay pixels.
 */

export type IconName =
  | 'home'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'
  | 'recent'
  | 'trash'
  | 'drive'
  | 'search'
  | 'note'
  | 'folder'
  | 'settings'
  | 'tuning'
  | 'terminal'
  | 'code'
  | 'info'
  | 'chat'
  | 'ghost'
  | 'restore'
  | 'palette'
  | 'keyboard'
  | 'media'
  | 'upload'
  | 'tasks'
  | 'panel'
  | 'newNote'
  | 'usb'

const DINKIE: Record<IconName, string> = {
  home: '<path fill="currentColor" d="M1 12h9V8h1V6h-1v1H1V6H0v2h1Zm0-6h1V5H1Zm1 5V8h7v3H7V9H4v2Zm3 0v-1h1v1ZM2 5h1V4H2Zm7 1h1V1H7v2H3v1h5V2h1v2H8v1h1Zm0 0"/>',
  documents:
    '<path fill="currentColor" d="M0 12h11V4h-1v1H7V2h1V1H0Zm1-1V2h5v4h4v5Zm1-1h4V9H2Zm0-4h3V5H2Zm0 2h7V7H2Zm0-4h3V3H2Zm6-1h1V2H8Zm1 1h1V3H9Zm0 0"/>',
  downloads:
    '<path fill="currentColor" d="M0 12h11V8H6V7h1V6H6V1H5v5H4v1h1v1H0Zm1-1V9h6v1h1V9h2v2Zm2-5h1V5H3ZM2 5h1V4H2Zm5 1h1V5H7Zm1-1h1V4H8Zm0 0"/>',
  music:
    '<path fill="currentColor" d="M0 12h3v-1h1V5h2V4h3v4H7v1h1v1H7V9H6v2h3v-1h1V1H7v1H3v7H1v1h1v1H1v-1H0Zm0 0"/>',
  pictures:
    '<path fill="currentColor" d="M0 12h11V3h-1V2H7v1H4V2H2v1H0Zm1-1V7h3v2h1V6H1V4h7V3h1v1h1v2H8v3h1V7h1v4Zm4-1h3V9H5Zm0-4h3V5H5Zm0 0"/>',
  videos:
    '<path fill="currentColor" d="M0 12h11V1H0Zm1-1v-1h1v1Zm2 0v-1h1v1Zm2 0v-1h1v1Zm2 0v-1h1v1ZM1 3V2h1v1Zm0 6V4h4v5Zm8 2v-1h1v1ZM3 3V2h1v1Zm3 6V4h4v5ZM5 3V2h1v1Zm2 0V2h1v1Zm2 0V2h1v1Zm0 0"/>',
  recent:
    '<path fill="currentColor" d="M5 10h1V6H3v1h2Zm-3 1h1v-1H2Zm-1-1h1V9H1ZM0 9h1V4H0Zm3 3h5v-1H3ZM1 4h1V3H1Zm7 7h1v-1H8Zm1-1h1V9H9ZM2 3h1V2H2Zm4 3h1V5H6Zm1-1h1V4H7Zm3 4h1V4h-1ZM3 2h5V1H3Zm5 1h1V2H8Zm1 1h1V3H9Zm0 0"/>',
  trash:
    '<path fill="currentColor" d="M1 11h9v-1H7V9h3v1h1V4h-1V2H9v2H8V2H7v2H4V2H3v2H2V2H1v2H0v6h1V9h1v1H1Zm0-3V7h1v1Zm2 2V9h1v1ZM1 6V5h1v1Zm2 2V7h1v1Zm2 2V9h1v1ZM3 6V5h1v1Zm2 2V7h1v1Zm0-2V5h1v1Zm2 2V7h3v1ZM2 2h1V1H2Zm5 4V5h3v1Zm1-4h1V1H8Zm0 0"/>',
  drive:
    '<path fill="currentColor" d="M0 12h11V3h-1v8H9V7H2v4H1V2h1v4h6V2h1V1H0Zm3-1V8h5v3Zm0-6V2h1v3Zm2 0V2h2v3Zm4-2h1V2H9Zm0 0"/>',
  search:
    '<path fill="currentColor" d="M8 8H7v1h1Zm0 0h1V3H8ZM1 9h1V8H1ZM0 8h1V3H0Zm2 2h5V9H2Zm0-3h1V4H2Zm1 1h3V7H3Zm4 3h1v-1H7Zm1 1h2v-1H8ZM1 3h1V2H1Zm9 8h1V9h-1ZM3 4h3V3H3Zm3 3h1V4H6Zm3 2h1V8H9ZM2 2h5V1H2Zm5 1h1V2H7Zm0 0"/>',
  note: '<path fill="currentColor" d="M0 12h9v-1H1V2h7v1h1V1H0Zm2-2h2V9H2Zm0-2h2V7H2Zm3 2h3V9H7V8H6V7H5ZM2 6h3V5H2Zm6 3h1V8H8ZM6 7h1V6H6ZM2 4h5V3H2Zm7 4h1V7H9ZM7 6h1V5H7Zm3 1h1V5h-1ZM8 5h2V4H8Zm0 0"/>',
  folder:
    '<path fill="currentColor" d="M0 12h9v-2h1V9H9V6h1V5H8v6H1V2h9V1H0Zm2-4h4V7H2Zm0-2h4V5H2Zm0-2h4V3H2Zm8 5h1V6h-1Zm0-4h1V2h-1Zm0 0"/>',
  settings:
    '<path fill="currentColor" d="M2 12h3v-1h1v1h3v-2h2V7h-1V6h1V3H9V1H6v1H5V1H2v2H0v3h1v1H0v3h2Zm1-1V9H1V8h1V5H1V4h2V2h1v1h3V2h1v2h2v1H9v3h1v1H8v2H7v-1H4v1Zm0-3h1V5H3Zm1 1h3V8H4Zm3-1h1V5H7ZM4 5h3V4H4Zm0 0"/>',
  tuning: '<path fill="currentColor" d="M0 3h11V2H0Zm0 8h11v-1H0Zm0-4h11V6H0Zm0 0"/>',
  terminal:
    '<path fill="currentColor" d="M6 5H5v3h1Zm0 0h1V2H6ZM0 7h1V6H0Zm1 1h1V7H1Zm1 1h1V8H2Zm2 2h1V8H4ZM1 6h1V5H1Zm1-1h1V4H2Zm6 4h1V8H8Zm1-1h1V7H9Zm0-2h1V5H9Zm1 1h1V6h-1ZM8 5h1V4H8Zm0 0"/>',
  code: '<path fill="currentColor" d="M6 5H5v3h1Zm0 0h1V2H6ZM0 7h1V6H0Zm1 1h1V7H1Zm1 1h1V8H2Zm2 2h1V8H4ZM1 6h1V5H1Zm1-1h1V4H2Zm6 4h1V8H8Zm1-1h1V7H9Zm0-2h1V5H9Zm1 1h1V6h-1ZM8 5h1V4H8Zm0 0"/>',
  info: '<path fill="currentColor" d="M4 9h3V8H6V5H4v1h1v2H4Zm-3 1h1V9H1Zm1 1h1v-1H2ZM0 9h1V4H0Zm3 3h5v-1H3Zm5-1h1v-1H8ZM1 4h1V3H1Zm8 6h1V9H9ZM2 3h1V2H2Zm3 1h1V3H5Zm5 5h1V4h-1ZM3 2h5V1H3Zm6 2h1V3H9ZM8 3h1V2H8Zm0 0"/>',
  chat: '<path fill="currentColor" d="M1 12h3v-1H3V9H2v2H1Zm0-3h1V8H1Zm3 2h1v-1H4ZM0 8h1V3H0Zm5 2h4V9H5ZM3 6h1V5H3ZM1 3h1V2H1Zm4 3h1V5H5Zm4 3h1V8H9ZM7 6h1V5H7ZM2 2h7V1H2Zm8 6h1V3h-1ZM9 3h1V2H9Zm0 0"/>',
  ghost:
    '<path fill="currentColor" d="M3 9H0v1h1v1h1v-1h1Zm0 0h1V2H3Zm-1 3h6v-1H2Zm6-1h1v-1H8ZM6 9h1V8h1V7H6Zm3 1h1V9H9ZM6 6h1V4H6Zm2 0h1V4H8Zm2 3h1V3h-1ZM4 2h5V1H4Zm5 1h1V2H9Zm0 0"/>',
  restore:
    '<path fill="currentColor" d="M6 6h1V5h1V4H7V3H6v1H3v1h3Zm-6 5h1V2H0Zm1 1h9v-1H1Zm1-5h1V5H2Zm2 3h1V9h3V8H5V7H4v1H3v1h1Zm4-2h1V6H8Zm2 3h1V2h-1ZM1 2h9V1H1Zm0 0"/>',
  palette:
    '<path fill="currentColor" d="M6 11H4v1h2Zm0 0h1v-1h3V9H6Zm-3 0h1v-1H3Zm-1-1h1V9H2ZM1 9h1V7H1ZM0 7h1V3H0Zm1-4h1V2H1Zm5 5h2V6H7v1H6ZM5 7h1V6h1V5H5ZM2 2h4V1H2Zm8 7h1V6h-1ZM9 6h1V4H9ZM6 3h2V2H6Zm2 1h1V3H8Zm0 0"/>',
  keyboard:
    '<path fill="currentColor" d="M1 3H0v7h1Zm0 0h9V2H1Zm1 6h1V8H2Zm-1 2h9v-1H1Zm2-4h1V6H3Zm1 2h3V8H4ZM2 5h1V4H2Zm3 2h1V6H5ZM4 5h1V4H4Zm4 4h1V8H8ZM7 7h1V6H7ZM6 5h1V4H6Zm4 5h1V3h-1ZM8 5h1V4H8Zm0 0"/>',
  media:
    '<path fill="currentColor" d="M0 12h11V3h-1V2H7v1H4V2H2v1H0Zm1-1V7h3v2h1V6H1V4h7V3h1v1h1v2H8v3h1V7h1v4Zm4-1h3V9H5Zm0-4h3V5H5Zm0 0"/>',
  upload:
    '<path fill="currentColor" d="M2 10h8V9H2ZM1 9h1V8H1ZM0 8h1V5H0Zm1-3h1V4H1Zm1-1h1V3H2Zm1-1h2V2H3Zm2 1h1V3H5Zm5 5h1V6h-1ZM6 5h3V4H6Zm3 1h1V5H9Zm0 0"/>',
  tasks:
    '<path fill="currentColor" d="M4 12h5v-1H8V9h2v1h1V5H9V2H7V1H2v1H0v9h4Zm-3-2V3h1v1h5V3h1v2H4v1H2v1h2v1H2v1h2v1Zm4 1V6h5v2H7v3Zm4 0h1v-1H9ZM3 3V2h3v1Zm0 0"/>',
  panel:
    '<path fill="currentColor" d="M4 3h7V2H4Zm-4 9h2v-2H0Zm0-3h2V7H0Zm0-3h2V4H0Zm4 6h7v-1H4Zm0-3h7V8H4ZM0 3h2V1H0Zm4 3h7V5H4Zm0 0"/>',
  newNote:
    '<path fill="currentColor" d="M0 12h5v-1h1v-1H5V9H4v2H2v-1H1V8h2V7H2V6H1v1H0Zm3-3h1V8H3Zm3 1h1V9H6ZM2 6h1V5H2Zm3 3h1V8H5ZM3 7h1V6H3Zm4 2h1V8H7ZM3 5h1V4H3Zm3 3h1V7H6ZM4 6h1V5H4Zm4 2h1V7H8ZM4 4h1V3H4Zm3 3h1V6H7ZM5 5h1V4H5Zm4 2h1V6H9ZM5 3h1V2H5Zm3 3h1V5H8ZM6 4h1V3H6Zm4 2h1V3h-1v1H9v1h1ZM7 3h1V2h1V1H6v1h1Zm2 0h1V2H9Zm0 0"/>',
  usb: '<path fill="currentColor" d="M3 12h5v-1H6V8h1v2h1v1h1v-1h1V9H9V8H8V7H7V5h1V4h2V3H9V2H8V1H3v1h2v3H4V3H3V2H2v1H1v1h1v1h1v1h1v2H3v1H1v1h1v1h1ZM0 9h1V4H0Zm5-2V6h1v1Zm5 2h1V4h-1Zm0 0"/>'
}

const SOLAR_EXTRA: Record<string, string> = {
  'cloud-upload-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M6.28571 19C3.91878 19 2 17.1038 2 14.7647C2 12.4256 3.91878 10.5294 6.28571 10.5294C6.56983 10.5294 6.8475 10.5567 7.11616 10.6089M17.5 18.8722C20.0726 18.3221 22 16.0599 22 13.3529C22 10.8811 20.393 8.78024 18.1551 8.01498C17.5693 7.81468 16.9404 7.70588 16.2857 7.70588C15.6178 7.70588 14.9767 7.81911 14.381 8.02721M7.11616 10.6089C6.88706 9.9978 6.7619 9.33687 6.7619 8.64706C6.7619 5.52827 9.32028 3 12.4762 3C15.4159 3 17.8371 5.19371 18.1551 8.01498M7.11616 10.6089C7.68058 10.7184 8.20528 10.9374 8.66667 11.2426"/><path stroke-linejoin="round" d="M12 16V22M10 18L12 16L14 18"/></g>',
  'checklist-minimalistic-linear':
    '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22Z"/><path stroke-linejoin="round" d="M6 15.8L7.14286 17L10 14"/><path stroke-linejoin="round" d="M6 8.8L7.14286 10L10 7"/><path d="M13 9L18 9"/><path d="M13 16L18 16"/></g>'
}

type SvgProps = JSX.IntrinsicElements['svg']
const SOLAR: Record<IconName, (p: SvgProps) => JSX.Element> = {
  home: Solar.SolarHome2Linear,
  documents: Solar.SolarFileTextLinear,
  downloads: Solar.SolarDownloadCircleLinear,
  music: Solar.SolarMusicNoteLinear,
  pictures: Solar.SolarGalleryLinear,
  videos: Solar.SolarClapperboardLinear,
  recent: Solar.SolarClockCircleLinear,
  trash: Solar.SolarTrashBinTrashLinear,
  drive: Solar.SolarHardDriveLinear,
  search: Solar.SolarMagniferLinear,
  note: Solar.SolarFileTextLinear,
  folder: Solar.SolarFolderLinear,
  settings: Solar.SolarSettingsMinimalisticLinear,
  tuning: Solar.SolarTuningLinear,
  terminal: Solar.SolarProgrammingLinear,
  code: Solar.SolarProgrammingLinear,
  info: Solar.SolarInfoCircleLinear,
  chat: Solar.SolarChatRoundLineLinear,
  ghost: Solar.SolarGhostBold,
  restore: Solar.SolarRestartLinear,
  palette: Solar.SolarPaletteLinear,
  keyboard: Solar.SolarKeyboardLinear,
  media: Solar.SolarGalleryLinear,
  upload: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['cloud-upload-linear']}
      {...p}
    />
  ),
  tasks: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      innerHTML={SOLAR_EXTRA['checklist-minimalistic-linear']}
      {...p}
    />
  ),
  panel: Solar.SolarSidebarMinimalisticLinear,
  newNote: Solar.SolarAddSquareLinear,
  usb: Solar.SolarHardDriveLinear
}

/** Pixel size for a Dinkie icon: the nearest whole multiple of its 12px grid. */
const snap = (px: number): number => 12 * Math.max(1, Math.floor(px / 12 + 0.4))

/** Size in px from Tailwind `w-*` classes (w-3.5 → 14, w-[18px] → 18), default 16. */
const sizeFromClass = (cls = ''): number => {
  const arb = /\bw-\[(\d+(?:\.\d+)?)px\]/.exec(cls)
  if (arb) return Number(arb[1])
  const tw = /\bw-(\d+(?:\.\d+)?)\b/.exec(cls)
  return tw ? Number(tw[1]) * 4 : 16
}

export interface UiIconProps {
  name: IconName
  class?: string
  /** px; defaults to the class's `w-*` width */
  size?: number
  /** force a set (previews); otherwise follows the Appearance setting */
  set?: 'solar' | 'dinkie'
}

export const UiIcon: Component<UiIconProps> = (props) => {
  const px = () => props.size ?? sizeFromClass(props.class)
  return (
    <Show
      when={(props.set ?? prefs.uiIcons) === 'dinkie'}
      fallback={
        <Dynamic
          component={SOLAR[props.name]}
          class={props.class}
          aria-hidden="true"
          style={props.size ? { width: `${props.size}px`, height: `${props.size}px` } : undefined}
        />
      }
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        class={`ui-icon-pixel ${props.class ?? ''}`}
        style={{ width: `${snap(px())}px`, height: `${snap(px())}px` }}
        shape-rendering="crispEdges"
        innerHTML={DINKIE[props.name]}
      />
    </Show>
  )
}

/** Drop-in components (`<I.home class="w-3.5 h-3.5" />`) for icon props. */
export const I = Object.fromEntries(
  (Object.keys(DINKIE) as IconName[]).map((name) => [
    name,
    ((p: { class?: string }) => <UiIcon name={name} class={p.class} />) as Component<{
      class?: string
    }>
  ])
) as Record<IconName, Component<{ class?: string }>>
