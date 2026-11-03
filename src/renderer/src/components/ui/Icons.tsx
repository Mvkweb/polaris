import type { Component, JSX } from 'solid-js'

export const PanelLeftIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4'}>
    <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.75" />
    <path d="M9 4v16" stroke="currentColor" stroke-width="1.75" />
    <rect x="4.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" />
  </svg>
)

export const Cog6ToothIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4'}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.75" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export const PlusIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const SearchIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.75" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  </svg>
)

export const CircleDotIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
  </svg>
)

export const CheckIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const RotateCwIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const ChevronRightIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const ChevronDownIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

export const HardDriveIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <line x1="22" y1="12" x2="2" y2="12" stroke="currentColor" stroke-width="1.75" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="6" y1="16" x2="6.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <line x1="10" y1="16" x2="10.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
)

export const FolderIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4 text-sky-400'}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
  </svg>
)

export const FolderOpenIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-4 h-4 text-sky-400'}>
    <path d="m2 8 2.5-4h5l2 2H20a2 2 0 0 1 2 2v2H2V8Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    <path d="M2 10h20l-2 10H4L2 10Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
  </svg>
)

export const TerminalIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <polyline points="4 17 10 11 4 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
    <line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  </svg>
)

export const PolarisStarIcon: Component<{ class?: string }> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-10 h-10'}>
    <path
      d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
      fill="currentColor"
      fill-opacity="0.8"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linejoin="round"
    />
  </svg>
)

export const FileBadgeIcon: Component<{ ext: string; name: string }> = (props) => {
  const e = props.ext.toLowerCase()
  const n = props.name.toLowerCase()

  if (n === 'agents.md' || n.endsWith('.md')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" class="w-3.5 h-3.5 text-zinc-300">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.6" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.6" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1.6" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1.6" />
      </svg>
    )
  }

  if (e === '.zig' || n.endsWith('.zig.zon')) {
    return (
      <span class="w-3.5 h-3.5 flex items-center justify-center font-mono text-[9px] font-bold text-amber-400 bg-amber-400/10 rounded">
        Z
      </span>
    )
  }

  if (e === '.ts' || e === '.tsx') {
    return (
      <span class="w-3.5 h-3.5 flex items-center justify-center font-mono text-[9px] font-bold text-sky-400 bg-sky-400/10 rounded">
        TS
      </span>
    )
  }

  if (e === '.json') {
    return (
      <span class="w-3.5 h-3.5 flex items-center justify-center font-mono text-[9px] font-bold text-yellow-400 bg-yellow-400/10 rounded">
        {}
      </span>
    )
  }

  if (e === '.yml' || e === '.yaml') {
    return (
      <span class="w-3.5 h-3.5 flex items-center justify-center font-mono text-[9px] font-bold text-purple-400 bg-purple-400/10 rounded">
        Y
      </span>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" class="w-3.5 h-3.5 text-zinc-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.6" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.6" />
    </svg>
  )
}

export const TerminalTileIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class || 'w-4 h-4'}
  >
    <rect
      x="0.5"
      y="0.5"
      width="15"
      height="15"
      rx="3.5"
      fill="#18181b"
      stroke="rgba(255, 255, 255, 0.16)"
    />
    <path
      d="M4.5 5L7.75 8L4.5 11"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M9 11H11.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
)

export const VsCodeTileIcon: Component<{ class?: string }> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={props.class || 'w-4 h-4'}
  >
    <path
      d="M14.5 1.7L11.2 0.1C10.8 -0.1 10.4 0 10.1 0.3L0.2 9.5C-0.1 9.8 -0.1 10.2 0.2 10.5L1.1 11.3C1.3 11.5 1.7 11.5 1.9 11.3L14 2.1C14.4 1.8 15 2.1 15 2.6V2.6C15 2.2 14.8 1.9 14.5 1.7Z"
      fill="#007ACC"
    />
    <path
      d="M14.5 14.3L11.2 15.9C10.8 16.1 10.4 16 10.1 15.7L0.2 6.5C-0.1 6.2 -0.1 5.8 0.2 5.5L1.1 4.7C1.3 4.5 1.7 4.5 1.9 4.7L14 13.9C14.4 14.2 15 13.9 15 13.4V13.4C15 13.8 14.8 14.1 14.5 14.3Z"
      fill="#0098FF"
    />
    <path
      d="M11.2 15.9C10.8 16.1 10.4 16 10.1 15.7C10.5 16.1 11.1 15.8 11.1 15.3V0.7C11.1 0.2 10.5 -0.1 10.1 0.3C10.4 0 10.8 -0.1 11.2 0.1L14.5 1.7C14.8 1.9 15 2.2 15 2.6V13.4C15 13.8 14.8 14.1 14.5 14.3L11.2 15.9Z"
      fill="#1F9CF0"
    />
  </svg>
)

export function DinkieIconsCode(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 12 12" {...props}>
      <path
        fill="currentColor"
        d="M6 5H5v3h1Zm0 0h1V2H6ZM0 7h1V6H0Zm1 1h1V7H1Zm1 1h1V8H2Zm2 2h1V8H4ZM1 6h1V5H1Zm1-1h1V4H2Zm6 4h1V8H8Zm1-1h1V7H9Zm0-2h1V5H9Zm1 1h1V6h-1ZM8 5h1V4H8Zm0 0"
      />
    </svg>
  )
}
