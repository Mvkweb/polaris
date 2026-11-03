import {
  Component,
  JSX,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  on,
  onCleanup,
  onMount
} from 'solid-js'
import { SolarCheckLinear, SolarAltArrowDownLinear } from '../ui/SolarIcons'
import MockupBadge from '../ui/MockupBadge'

// ── Motion Tokens & Easings (transitions.dev) ─────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_IO = 'ease-in-out'

// ── SwapText: Cross-blur vertical text swap on selection change ───────────────
// Old text departs upward with 2px blur; new text rises in from 4px below.

const SwapText: Component<{ text: string; class?: string }> = (props) => {
  const [shown, setShown] = createSignal(props.text)
  let el: HTMLSpanElement | undefined = undefined
  let token = 0

  createEffect(
    on(
      () => props.text,
      async (next) => {
        const id = ++token
        const target = el as HTMLSpanElement | undefined
        if (!target) {
          setShown(next)
          return
        }
        const out = target.animate(
          [
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
            { opacity: 0, transform: 'translateY(-3px)', filter: 'blur(2px)' }
          ],
          { duration: 120, easing: EASE_IO, fill: 'forwards' }
        )
        try {
          await out.finished
        } catch {
          return
        }
        if (id !== token) {
          out.cancel()
          return
        }
        setShown(next)
        out.cancel()
        target.animate(
          [
            { opacity: 0, transform: 'translateY(3px)', filter: 'blur(2px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' }
          ],
          { duration: 120, easing: EASE_IO }
        )
      },
      { defer: true }
    )
  )

  return (
    <span ref={(elem) => (el = elem)} class={`inline-block whitespace-nowrap ${props.class ?? ''}`}>
      {shown()}
    </span>
  )
}

// ── Row Shell ────────────────────────────────────────────────────────────────

interface SettingRowProps {
  title: string
  description: string
  children: JSX.Element
  badge?: JSX.Element
  clickable?: boolean
  onClick?: () => void
  rowRef?: (el: HTMLDivElement) => void
}

const SettingRow: Component<SettingRowProps> = (props) => (
  <div
    ref={(el) => props.rowRef?.(el)}
    class={`group relative px-3 py-3 rounded-xl flex items-center justify-between gap-4 transition-colors duration-150 hover:bg-white/[0.03] select-none ${
      props.clickable ? 'cursor-pointer' : ''
    }`}
    onClick={() => props.onClick?.()}
  >
    <div class="flex flex-col min-w-0 pr-4">
      <div class="flex items-center gap-2">
        <span class="text-[13.5px] font-medium text-white/90 group-hover:text-white transition-colors">
          {props.title}
        </span>
        <Show when={props.badge}>{props.badge}</Show>
      </div>
      <span class="text-[12px] text-white/40 group-hover:text-white/55 transition-colors mt-0.5">
        {props.description}
      </span>
    </div>
    <div class="shrink-0">{props.children}</div>
  </div>
)

const Section: Component<{ title: string; children: JSX.Element }> = (props) => (
  <section class="flex flex-col gap-0.5">
    <h2 class="text-[12px] font-medium text-white/40 tracking-tight px-3 pb-1 select-none">
      {props.title}
    </h2>
    <div class="flex flex-col">{props.children}</div>
  </section>
)

// ── Compact Fast Toggle Switch ───────────────────────────────────────────────
// Responsive 130ms magnetic slide with tactile squish on press

interface ToggleRowProps {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  badge?: JSX.Element
}

const ToggleRow: Component<ToggleRowProps> = (props) => {
  const [pressed, setPressed] = createSignal(false)

  const release = () => {
    setPressed(false)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }
  onCleanup(release)

  return (
    <SettingRow
      title={props.title}
      description={props.description}
      badge={props.badge}
      clickable
      onClick={() => props.onChange(!props.checked)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.title}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          setPressed(true)
          window.addEventListener('pointerup', release)
          window.addEventListener('pointercancel', release)
        }}
        class={`relative inline-flex items-center h-[19px] w-[33px] rounded-full p-[2px] outline-none cursor-pointer select-none transition-colors duration-130 ${
          props.checked ? 'bg-white/30 hover:bg-white/35' : 'bg-white/[0.08] hover:bg-white/[0.12]'
        }`}
        style={{
          transition: `background-color 130ms ${EASE_OUT}`
        }}
      >
        <span
          class={`block rounded-full transition-all ${
            props.checked
              ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
              : 'bg-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
          }`}
          style={{
            height: '15px',
            width: pressed() ? '18px' : '15px',
            transform: props.checked ? `translateX(${pressed() ? 11 : 14}px)` : 'translateX(0px)',
            transition: `transform 130ms ${EASE_OUT}, width 90ms ${EASE_OUT}, background-color 130ms ${EASE_OUT}`
          }}
        />
      </button>
    </SettingRow>
  )
}

// ── Precision Inline Segmented Control with Morphing Indicator ───────────────
// Measured dynamically from buttons so the sliding indicator fits snugly
// inside a compact h-7 container with rounded-md geometry.

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedRowProps {
  title: string
  description: string
  value: string
  options: SegmentedOption[]
  onChange: (value: string) => void
  badge?: JSX.Element
}

const SegmentedRow: Component<SegmentedRowProps> = (props) => {
  const [indicator, setIndicator] = createSignal<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false
  })

  let containerRef: HTMLDivElement | undefined = undefined
  const buttons: Map<string, HTMLButtonElement> = new Map()

  const updateIndicator = () => {
    const activeBtn = buttons.get(props.value)
    if (!activeBtn || !containerRef) return
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
      ready: true
    })
  }

  onMount(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
  })

  onCleanup(() => {
    window.removeEventListener('resize', updateIndicator)
  })

  createEffect(
    on(
      () => props.value,
      () => {
        requestAnimationFrame(updateIndicator)
      }
    )
  )

  return (
    <SettingRow title={props.title} description={props.description} badge={props.badge}>
      <div
        ref={(el) => (containerRef = el)}
        class="relative inline-flex items-center h-7 p-0.5 rounded-md bg-white/[0.04] select-none"
      >
        {/* Dynamic sliding indicator pill */}
        <div
          class="absolute top-0.5 bottom-0.5 rounded-[5px] bg-white/[0.1] shadow-xs pointer-events-none"
          style={{
            left: `${indicator().left}px`,
            width: `${indicator().width}px`,
            opacity: indicator().ready ? 1 : 0,
            transition: indicator().ready
              ? `left 160ms ${EASE_OUT}, width 160ms ${EASE_OUT}, opacity 100ms ease`
              : 'none'
          }}
        />

        <For each={props.options}>
          {(opt) => (
            <button
              ref={(el) => {
                if (el) buttons.set(opt.value, el)
              }}
              type="button"
              onClick={() => {
                props.onChange(opt.value)
                requestAnimationFrame(updateIndicator)
              }}
              class={`relative z-10 h-6 px-2.5 rounded-[5px] text-[12px] font-medium transition-colors duration-140 cursor-pointer outline-none whitespace-nowrap ${
                opt.value === props.value ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {opt.label}
            </button>
          )}
        </For>
      </div>
    </SettingRow>
  )
}

// ── Origin-Aware Morphing Dropdown (transitions.dev 05-menu-dropdown) ─────────
// Blooms origin-aware directly from the trigger anchor with deep dark #131315
// glass, compact rounded-lg geometry, continuous gliding highlight, and zero outlines.

interface SelectOption {
  value: string
  label: string
  hint?: string
  fontFamily?: string
}

interface SelectRowProps {
  title: string
  description: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  badge?: JSX.Element
}

type MenuPhase = 'closed' | 'enter' | 'open' | 'closing'

const ITEM_H = 28

const SelectRow: Component<SelectRowProps> = (props) => {
  const listId = createUniqueId()
  const [phase, setPhase] = createSignal<MenuPhase>('closed')
  const [placement, setPlacement] = createSignal<'bottom' | 'top'>('bottom')
  const [active, setActive] = createSignal(0)

  let rowRef: HTMLDivElement | undefined = undefined
  let triggerRef: HTMLButtonElement | undefined = undefined
  let menuRef: HTMLDivElement | undefined = undefined
  let closeTimer: number | undefined = undefined

  const isOpen = createMemo(() => phase() === 'enter' || phase() === 'open')
  const selectedIndex = () =>
    Math.max(
      0,
      props.options.findIndex((o) => o.value === props.value)
    )
  const selected = () => props.options[selectedIndex()]

  const open = () => {
    if (closeTimer) window.clearTimeout(closeTimer)
    setActive(selectedIndex())
    const el = triggerRef as HTMLButtonElement | undefined
    if (el) {
      const rect = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const needed = props.options.length * ITEM_H + 16
      setPlacement(spaceBelow < needed && rect.top > spaceBelow ? 'top' : 'bottom')
    }
    setPhase('enter')
    requestAnimationFrame(() => {
      const m = menuRef as HTMLDivElement | undefined
      if (m) void m.offsetWidth
      setPhase((p) => (p === 'enter' ? 'open' : p))
    })
  }

  const close = () => {
    if (!isOpen()) return
    setPhase('closing')
    closeTimer = window.setTimeout(() => setPhase('closed'), 140)
  }

  const choose = (index: number) => {
    props.onChange(props.options[index].value)
    close()
  }

  const handlePointerDown = (e: PointerEvent) => {
    const el = rowRef as HTMLDivElement | undefined
    if (el && !el.contains(e.target as Node)) {
      close()
    }
  }

  onCleanup(() => {
    if (closeTimer) window.clearTimeout(closeTimer)
  })

  // Keyboard navigation & outside click management
  createEffect(() => {
    if (!isOpen()) return
    const count = props.options.length

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
        const el = triggerRef as HTMLButtonElement | undefined
        el?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (i + 1) % count)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i - 1 + count) % count)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        choose(active())
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('pointerdown', handlePointerDown, true)
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('pointerdown', handlePointerDown, true)
    })
  })

  return (
    <SettingRow
      title={props.title}
      description={props.description}
      badge={props.badge}
      clickable
      rowRef={(el) => (rowRef = el)}
      onClick={() => (isOpen() ? close() : open())}
    >
      <div class="relative">
        {/* Trigger Button */}
        <button
          ref={(el) => (triggerRef = el)}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen()}
          aria-controls={listId}
          class={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium cursor-pointer outline-none select-none transition-colors duration-140 ${
            isOpen()
              ? 'bg-white/[0.1] text-white'
              : 'bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.1] text-white/80'
          }`}
        >
          <SwapText text={selected()?.label ?? ''} />
          <SolarAltArrowDownLinear
            class="w-3 h-3 text-white/40 transition-transform duration-180"
            style={{
              transform: isOpen() ? 'rotate(180deg)' : 'none'
            }}
          />
        </button>

        {/* Origin-Aware Morphing Dropdown Container */}
        <Show when={phase() !== 'closed'}>
          <div
            ref={(el) => (menuRef = el)}
            id={listId}
            role="listbox"
            onClick={(e) => e.stopPropagation()}
            class="absolute z-50 right-0 min-w-[170px] rounded-lg p-1 select-none bg-[#070709] border border-white/[0.08] shadow-[0_8px_20px_-4px_rgba(0,0,0,0.7)] backdrop-blur-2xl outline-none"
            style={{
              top: placement() === 'bottom' ? 'calc(100% + 4px)' : 'auto',
              bottom: placement() === 'top' ? 'calc(100% + 4px)' : 'auto',
              'transform-origin': placement() === 'bottom' ? 'top right' : 'bottom right',
              opacity: phase() === 'open' ? 1 : 0,
              transform:
                phase() === 'open'
                  ? 'scale(1) translateY(0)'
                  : phase() === 'closing'
                    ? 'scale(0.96) translateY(-2px)'
                    : 'scale(0.94) translateY(-3px)',
              transition:
                phase() === 'enter'
                  ? 'none'
                  : `opacity 130ms ${EASE_OUT}, transform 130ms ${EASE_OUT}`,
              'pointer-events': phase() === 'closing' ? 'none' : 'auto'
            }}
          >
            {/* Options List with Gliding Highlight Pill */}
            <div class="relative">
              {/* Continuous gliding highlight */}
              <div
                class="absolute inset-x-0 top-0 rounded-md bg-white/[0.08] pointer-events-none"
                style={{
                  height: `${ITEM_H}px`,
                  transform: `translateY(${active() * ITEM_H}px)`,
                  transition: phase() === 'open' ? `transform 150ms ${EASE_OUT}` : 'none'
                }}
              />

              <For each={props.options}>
                {(opt, i) => {
                  const isSelected = () => opt.value === props.value

                  return (
                    <div
                      role="option"
                      aria-selected={isSelected()}
                      class={`relative z-10 flex items-center justify-between gap-3 px-2 rounded-md text-[12px] cursor-pointer select-none transition-colors duration-100 ${
                        active() === i() ? 'text-white' : 'text-white/70'
                      }`}
                      style={{ height: `${ITEM_H}px` }}
                      onPointerEnter={() => setActive(i())}
                      onClick={() => choose(i())}
                    >
                      <span class="truncate" style={{ 'font-family': opt.fontFamily }}>
                        {opt.label}
                      </span>

                      <div class="flex items-center gap-2 shrink-0">
                        <Show when={opt.hint}>
                          <span class="text-[10.5px] font-mono text-white/35">{opt.hint}</span>
                        </Show>
                        <span class="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                          <SolarCheckLinear
                            class="w-[13px] h-[13px] text-white shrink-0"
                            style={{
                              opacity: isSelected() ? 1 : 0,
                              transform: isSelected() ? 'scale(1)' : 'scale(0.5)',
                              transition: `opacity 130ms ease, transform 130ms ${EASE_OUT}`
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </SettingRow>
  )
}

// ── Editor Settings Page ─────────────────────────────────────────────────────

export const EditorSettings: Component = () => {
  const [fontFamily, setFontFamily] = createSignal('JetBrains Mono')
  const [fontSize, setFontSize] = createSignal('13')
  const [tabSize, setTabSize] = createSignal('2')
  const [lineNumbers, setLineNumbers] = createSignal(true)
  const [wordWrap, setWordWrap] = createSignal(true)
  const [bracketMatching, setBracketMatching] = createSignal(true)
  const [highlightLine, setHighlightLine] = createSignal(true)

  return (
    <div class="flex flex-col gap-7 w-full pb-12 select-none">
      <div class="flex flex-col gap-1 px-3">
        <h1 class="text-[20px] font-semibold text-white/95 tracking-tight">Editor settings</h1>
        <p class="text-[13.5px] text-white/40 leading-relaxed">
          Customize CodeMirror typography, indentation, and buffer display behavior.
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <Section title="Typography & Spacing">
          {/* [MOCKUP] Font family not yet wired to CodeMirror */}
          <SelectRow
            title="Font Family"
            description="Monospace font family used for code buffer rendering"
            badge={<MockupBadge />}
            value={fontFamily()}
            onChange={setFontFamily}
            options={[
              {
                value: 'JetBrains Mono',
                label: 'JetBrains Mono',
                fontFamily: '"JetBrains Mono", monospace'
              },
              { value: 'Fira Code', label: 'Fira Code', fontFamily: '"Fira Code", monospace' },
              {
                value: 'SF Mono',
                label: 'SF Mono',
                fontFamily: '"SF Mono", ui-monospace, monospace'
              },
              { value: 'System Mono', label: 'System Mono', fontFamily: 'ui-monospace, monospace' }
            ]}
          />
          {/* [MOCKUP] Font size not yet wired to CodeMirror */}
          <SelectRow
            title="Font Size"
            description="Controls the editor font size in pixels"
            badge={<MockupBadge />}
            value={fontSize()}
            onChange={setFontSize}
            options={[
              { value: '12', label: '12px' },
              { value: '13', label: '13px', hint: 'Default' },
              { value: '14', label: '14px' },
              { value: '15', label: '15px' },
              { value: '16', label: '16px' }
            ]}
          />
          {/* [MOCKUP] Tab size not yet wired to CodeMirror indent configuration */}
          <SegmentedRow
            title="Tab Size"
            description="Number of spaces to insert per indentation level"
            badge={<MockupBadge />}
            value={tabSize()}
            onChange={setTabSize}
            options={[
              { value: '2', label: '2 spaces (Default)' },
              { value: '4', label: '4 spaces' }
            ]}
          />
        </Section>

        <Section title="Display & Formatting">
          {/* [MOCKUP] Line numbers toggle not yet wired to CodeMirror */}
          <ToggleRow
            title="Line Numbers"
            description="Display line number gutter on the left side of the editor"
            badge={<MockupBadge />}
            checked={lineNumbers()}
            onChange={setLineNumbers}
          />
          {/* [MOCKUP] Word wrap toggle not yet wired to CodeMirror */}
          <ToggleRow
            title="Word Wrap"
            description="Wrap long lines to fit the viewport width instead of horizontal scrolling"
            badge={<MockupBadge />}
            checked={wordWrap()}
            onChange={setWordWrap}
          />
          {/* [MOCKUP] Bracket matching toggle not yet wired to CodeMirror */}
          <ToggleRow
            title="Bracket Matching"
            description="Highlight corresponding opening and closing brackets"
            badge={<MockupBadge />}
            checked={bracketMatching()}
            onChange={setBracketMatching}
          />
          {/* [MOCKUP] Active line highlight not yet wired to CodeMirror */}
          <ToggleRow
            title="Highlight Active Line"
            description="Subtly illuminate the line currently containing the cursor"
            badge={<MockupBadge />}
            checked={highlightLine()}
            onChange={setHighlightLine}
          />
        </Section>
      </div>
    </div>
  )
}

export default EditorSettings
