import { Component, Show, createSignal, createEffect } from 'solid-js'

/* ── Global Monodrive SVG Gradient Definitions (rendered once to avoid DOM duplicate defs) ── */
export const MonodriveIconDefs: Component = () => (
  <svg class="sr-only" aria-hidden="true" width="0" height="0">
    <defs>
      {/* Back Tab & Body Gradient */}
      <linearGradient id="monoBack" x1="38" y1="4" x2="38" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" style={{ 'stop-color': 'var(--folder-back-hi, #4AB3F8)' }} />
        <stop offset="100%" style={{ 'stop-color': 'var(--folder-back-lo, #1976D2)' }} />
      </linearGradient>

      {/* Front Flap Main Gradient (Apple Sky-Blue) */}
      <linearGradient id="monoFront" x1="38" y1="18" x2="38" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" style={{ 'stop-color': 'var(--folder-front-1, #64CEFF)' }} />
        <stop offset="25%" style={{ 'stop-color': 'var(--folder-front-2, #45AFF8)' }} />
        <stop offset="85%" style={{ 'stop-color': 'var(--folder-front-3, #1C7EE0)' }} />
        <stop offset="100%" style={{ 'stop-color': 'var(--folder-front-4, #1466BE)' }} />
      </linearGradient>

      {/* Top Rim Highlight */}
      <linearGradient id="monoRim" x1="4" y1="18" x2="72" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
        <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.1" />
      </linearGradient>

      {/* Paper sheet subtle gradient */}
      <linearGradient id="docPaper" x1="32" y1="2" x2="32" y2="74" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#EDF1F5" />
      </linearGradient>

      {/* Dog-ear fold gradient */}
      <linearGradient id="docFold" x1="44" y1="2" x2="60" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#D5DBE1" />
        <stop offset="100%" stop-color="#A8B4C0" />
      </linearGradient>
    </defs>
  </svg>
)

/* ── Authentic Monodrive macOS 3D Sky-Blue Folder Icon ── */
export const MonodriveFolderIcon: Component<{ class?: string }> = (props) => {
  return (
    <svg
      viewBox="0 0 76 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={props.class ?? 'w-16 h-14'}
    >
      {/* Back tab and body */}
      <path
        d="M6 11C6 8.23858 8.23858 6 11 6H28.5C31 6 33.2 7.3 34.3 9.4L36.6 13.5H65C67.7614 13.5 70 15.7386 70 18.5V48C70 50.7614 67.7614 53 65 53H11C8.23858 53 6 50.7614 6 48V11Z"
        fill="url(#monoBack)"
      />

      {/* Inner paper top edge */}
      <rect
        x="12"
        y="12"
        width="52"
        height="12"
        rx="2"
        fill="#FFFFFF"
        fill-opacity="0.75"
      />

      {/* Front flap with realistic macOS curve */}
      <path
        d="M4 20C4 18.3431 5.34315 17 7 17H69C70.6569 17 72 18.3431 72 20V51C72 55.4183 68.4183 59 64 59H12C7.58172 59 4 55.4183 4 51V20Z"
        fill="url(#monoFront)"
      />

      {/* Top highlight rim */}
      <path
        d="M5 19H71"
        stroke="url(#monoRim)"
        stroke-width="1.2"
        stroke-linecap="round"
      />

      {/* Subtle bottom shadow curve */}
      <path
        d="M8 56C16 57.5 60 57.5 68 56"
        stroke="#0E4A86"
        stroke-width="1.2"
        stroke-opacity="0.35"
        stroke-linecap="round"
      />
    </svg>
  )
}

/* ── Authentic Monodrive macOS Document File Icon (Delicate Text Preview Lines) ── */
export const MonodriveFileIcon: Component<{
  name: string
  extension?: string
  class?: string
}> = (props) => {
  const ext = () => (props.extension || props.name.split('.').pop() || '').toLowerCase()

  // Detect file categories
  const isCode = () => {
    const e = ext()
    return ['rs', 'go', 'ts', 'tsx', 'js', 'jsx', 'py', 'zig', 'c', 'cpp', 'h'].includes(e)
  }

  const isData = () => {
    const e = ext()
    return ['csv', 'xlsx', 'xls'].includes(e)
  }

  const isConfig = () => {
    const e = ext()
    return ['json', 'toml', 'yaml', 'yml'].includes(e)
  }

  return (
    <svg
      viewBox="0 0 64 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={props.class ?? 'w-14 h-16'}
    >
      {/* Main Document Body */}
      <path
        d="M8 8C8 5.23858 10.2386 3 13 3H43L60 20V69C60 71.7614 57.7614 74 55 74H13C10.2386 74 8 71.7614 8 69V8Z"
        fill="url(#docPaper)"
      />

      {/* Dog-Ear Triangle Fold */}
      <path
        d="M43 3V17C43 18.6569 44.3431 20 46 20H60L43 3Z"
        fill="url(#docFold)"
      />
      <path
        d="M43 3L60 20"
        stroke="#FFFFFF"
        stroke-width="0.8"
        stroke-opacity="0.5"
      />

      {/* Realistic macOS Printed Text Lines / Content */}
      <Show
        when={!isData()}
        fallback={
          /* Spreadsheet Grid Preview for CSV / Excel */
          <g opacity="0.75">
            <rect x="14" y="26" width="36" height="3" rx="1" fill="#10B981" />
            <rect x="14" y="33" width="16" height="4" rx="1" fill="#10B981" fill-opacity="0.7" />
            <rect x="34" y="33" width="16" height="4" rx="1" fill="#10B981" fill-opacity="0.7" />
            <rect x="14" y="40" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
            <rect x="34" y="40" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
            <rect x="14" y="47" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
            <rect x="34" y="47" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
            <rect x="14" y="54" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
            <rect x="34" y="54" width="16" height="4" rx="1" fill="#94A3B8" fill-opacity="0.6" />
          </g>
        }
      >
        {/* Authentic Multi-Line Document Representation (Matching Monodrive / Finder) */}
        <g opacity="0.65">
          {/* Header Bar */}
          <rect
            x="14"
            y="24"
            width="22"
            height="3.5"
            rx="1.5"
            fill={isCode() ? '#0284C7' : isConfig() ? '#D97706' : '#64748B'}
          />

          {/* Body Lines with Realistic Length Variations */}
          <rect x="14" y="32" width="36" height="2" rx="1" fill="#94A3B8" />
          <rect x="14" y="38" width="32" height="2" rx="1" fill="#94A3B8" />
          <rect x="14" y="44" width="36" height="2" rx="1" fill="#94A3B8" />
          <rect x="14" y="50" width="28" height="2" rx="1" fill="#94A3B8" />
          <rect x="14" y="56" width="34" height="2" rx="1" fill="#94A3B8" />
          <rect x="14" y="62" width="20" height="2" rx="1" fill="#94A3B8" />
        </g>
      </Show>
    </svg>
  )
}

/* ── Image Thumbnail with Native Protocol and Fallback ── */
export const ImageThumbnail: Component<{
  path: string
  name: string
  class?: string
}> = (props) => {
  const [loadError, setLoadError] = createSignal(false)

  // Reset error state whenever path changes
  createEffect((prevPath) => {
    if (prevPath !== props.path) {
      setLoadError(false)
    }
    return props.path
  })

  const imgSrc = () => `polaris-media://${encodeURI(props.path)}`

  return (
    <Show
      when={!loadError()}
      fallback={<MonodriveFileIcon name={props.name} extension="png" class={props.class} />}
    >
      <div class="relative w-14 h-14 flex items-center justify-center">
        <img
          src={imgSrc()}
          alt={props.name}
          loading="lazy"
          decoding="async"
          onError={() => setLoadError(true)}
          class="w-14 h-14 object-cover rounded-xl border border-white/10"
        />
      </div>
    </Show>
  )
}
