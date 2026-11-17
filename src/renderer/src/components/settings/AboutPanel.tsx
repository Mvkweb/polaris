import { For, createResource, createSignal, type Component } from 'solid-js'
import { Aurora } from '../dithercn/aurora'
import { UiIcon, type IconName } from '../ui/AppIcons'

const REPO = 'https://github.com/Mvkweb/polaris'

const LINKS: { icon: IconName; title: string; detail: string; href: string }[] = [
  { icon: 'source', title: 'Source code', detail: 'github.com/Mvkweb/polaris', href: REPO },
  {
    icon: 'bug',
    title: 'Report an issue',
    detail: 'Bugs, ideas, rough edges',
    href: `${REPO}/issues/new`
  },
  {
    icon: 'rocket',
    title: "What's new",
    detail: 'Releases and changelog',
    href: `${REPO}/releases`
  },
  {
    icon: 'sparkles',
    title: 'dithercn',
    detail: 'The dither engine behind the visuals',
    href: 'https://dither-sdk.vercel.app'
  }
]

/** People behind ideas and support (shown above the licenses). */
const THANKS: { name: string; why: string; href: string }[] = [
  {
    name: 'DiM',
    why: '“Upload to” comes from his file manager, Atlas',
    href: 'https://github.com/dim-ghub'
  },
  { name: 'Benji', why: 'Sponsoring Polaris, indirectly', href: 'https://benji.link/' }
]

const CREDITS: [string, string, string][] = [
  ['Pierre file icons', 'The Pierre Computer Company', 'Apache-2.0'],
  ['Solar icons', '480 Design', 'CC BY 4.0'],
  ['Dinkie icons', 'atelierAnchor', 'MIT'],
  ['dithercn', 'dither-sdk', 'MIT'],
  ['CodeMirror', 'Marijn Haverbeke', 'MIT']
]

/**
 * About: a still aurora "release banner" that comes alive on hover, the build
 * facts, link rows and an expandable credits list.
 */
export const AboutPanel: Component = () => {
  const [version] = createResource(() => window.api?.getAppVersion?.() ?? Promise.resolve('dev'))
  const [hover, setHover] = createSignal(false)
  const [credits, setCredits] = createSignal(false)
  const proc = (
    window as unknown as {
      electron?: { process?: { platform?: string; versions?: Record<string, string> } }
    }
  ).electron?.process
  const versions = proc?.versions ?? {}
  const platform = proc?.platform === 'linux' ? 'Linux' : (proc?.platform ?? '—')

  const facts = (): [string, string][] => [
    ['Engine', 'Zig 0.17 core'],
    ['Shell', `Electron ${versions.electron?.split('.')[0] ?? '—'}`],
    ['Chromium', versions.chrome?.split('.')[0] ?? '—'],
    ['Platform', `${platform} · ${navigator.userAgent.includes('x86_64') ? 'x64' : 'arm64'}`]
  ]

  return (
    <div class="flex flex-col gap-2">
      {/* Release banner */}
      <div
        class="about-banner relative overflow-hidden rounded-[18px]"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <div class="about-aurora absolute inset-x-0 top-0 h-[112px]" aria-hidden="true">
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
            rays={10}
            sway={1}
            drift={0.25}
            shimmer={0.3}
            matrix="bayer8"
            cell={2}
            animate={hover()}
            stillTime={7}
          />
        </div>
        <div class="relative pt-[92px] px-5 pb-5 flex items-end gap-4">
          <div class="min-w-0">
            <div class="text-[17px] font-medium text-white">Polaris {version() ?? ''}</div>
            <div class="mt-0.5 text-[12.5px] text-white/45">
              Dithered file manager &amp; editor · {platform}
            </div>
          </div>
          <span class="about-version ml-auto font-mono text-[12px] text-white/55 tabular-nums">
            v{version() ?? '…'}
          </span>
        </div>
      </div>

      {/* Facts */}
      <div class="grid grid-cols-4 gap-2">
        <For each={facts()}>
          {([k, v]) => (
            <div class="about-fact">
              <div class="text-[11.5px] text-white/35">{k}</div>
              <div class="mt-1 text-[13px] text-white/85 tabular-nums truncate">{v}</div>
            </div>
          )}
        </For>
      </div>

      {/* Links: compact cards, two per row */}
      <div class="grid grid-cols-2 gap-2">
        <For each={LINKS}>
          {(l) => (
            <button type="button" class="about-card" onClick={() => window.open(l.href, '_blank')}>
              <span class="about-card-icon">
                <UiIcon name={l.icon} size={22} />
              </span>
              <span class="min-w-0 flex-1 text-left">
                <span class="block text-[13.5px] text-white/90">{l.title}</span>
                <span class="block text-[12px] text-white/38 truncate">{l.detail}</span>
              </span>
              <svg
                viewBox="0 0 16 16"
                class="about-card-arrow w-3.5 h-3.5"
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

        {/* Credits (also the attribution CC BY needs) */}
        <div class="about-credits-card col-span-2">
          <button
            type="button"
            class="about-card w-full"
            aria-expanded={credits()}
            onClick={() => setCredits((v) => !v)}
          >
            <span class="about-card-icon">
              <UiIcon name="heart" size={22} />
            </span>
            <span class="min-w-0 flex-1 text-left">
              <span class="block text-[13.5px] text-white/90">Credits &amp; licenses</span>
              <span class="block text-[12px] text-white/38">
                The people and open source behind Polaris
              </span>
            </span>
            <svg
              viewBox="0 0 16 16"
              class="about-row-chevron w-3.5 h-3.5"
              classList={{ 'is-open': credits() }}
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          <div class="about-credits" classList={{ 'is-open': credits() }}>
            <div class="about-credits-inner">
              <div class="about-credits-list">
                <div class="about-credits-group">Thanks</div>
                <For each={THANKS}>
                  {(p) => (
                    <button
                      type="button"
                      class="about-thanks"
                      onClick={() => window.open(p.href, '_blank')}
                      title={p.href}
                    >
                      <span class="text-white/85">{p.name}</span>
                      <span class="text-white/40 truncate">{p.why}</span>
                      <svg
                        viewBox="0 0 16 16"
                        class="about-thanks-arrow ml-auto w-3 h-3 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 3.5h6.5V10M12.5 3.5 4 12" />
                      </svg>
                    </button>
                  )}
                </For>
                <div class="about-credits-group">Open source</div>
                <For each={CREDITS}>
                  {([name, by, license]) => (
                    <div class="flex items-baseline gap-3 py-1.5 text-[12.5px]">
                      <span class="text-white/80">{name}</span>
                      <span class="text-white/35 truncate">{by}</span>
                      <span class="ml-auto font-mono text-[11px] text-white/45">{license}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPanel
