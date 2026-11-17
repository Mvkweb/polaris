import { For, createResource, type Component } from 'solid-js'

/** About: version facts and outbound links, laid out like the other tiles. */
export const AboutPanel: Component = () => {
  const [version] = createResource(() => window.api?.getAppVersion?.() ?? Promise.resolve('dev'))
  const facts = () => [
    ['Version', version() ?? '…'],
    ['Engine', 'Zig 0.17 core · Electron'],
    ['Interface', 'SolidJS · dithercn'],
    ['Icons', 'Pierre (Apache-2.0)']
  ]
  const links: [string, string][] = [
    ['Source on GitHub', 'https://github.com/Mvkweb/polaris'],
    ['Report an issue', 'https://github.com/Mvkweb/polaris/issues'],
    ['dithercn', 'https://dither-sdk.vercel.app']
  ]
  return (
    <div class="grid grid-cols-2 gap-2">
      <For each={facts()}>
        {([k, v]) => (
          <div class="settings-tile flex flex-col gap-1">
            <span class="text-[12px] text-white/40">{k}</span>
            <span class="text-[14px] text-white/90 tabular-nums">{v}</span>
          </div>
        )}
      </For>
      <For each={links}>
        {([label, href]) => (
          <button
            type="button"
            class="settings-tile settings-tile-link col-span-2 flex items-center justify-between text-left"
            onClick={() => window.open(href, '_blank')}
          >
            <span class="text-[13.5px] text-white/85">{label}</span>
            <svg
              viewBox="0 0 16 16"
              class="w-3.5 h-3.5 text-white/35"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 3.5h6.5V10M12.5 3.5 4 12" />
            </svg>
          </button>
        )}
      </For>
    </div>
  )
}

export default AboutPanel
