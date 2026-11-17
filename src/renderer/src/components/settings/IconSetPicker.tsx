import { For, type Component } from 'solid-js'
import { UiIcon, type IconName } from '../ui/AppIcons'
import { prefs, setPref } from './prefs'

const SAMPLE: IconName[] = [
  'home',
  'folder',
  'search',
  'settings',
  'terminal',
  'upload',
  'music',
  'trash'
]

const SETS = [
  { id: 'solar', name: 'Solar', note: 'Smooth outlines' },
  { id: 'dinkie', name: 'Dinkie', note: 'Pixel, 12px grid' }
] as const

/** Interface icon set: one card per set, previewing real icons in that set. */
export const IconSetPicker: Component = () => (
  <div class="settings-tile col-span-2 flex flex-col gap-3">
    <div>
      <div class="text-[13.5px] text-white/90">Interface icons</div>
      <div class="mt-0.5 text-[12px] text-white/38">
        One set across the sidebar, status bar and settings. Sets never mix.
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Interface icons">
      <For each={SETS}>
        {(set) => (
          <button
            type="button"
            role="radio"
            aria-checked={prefs.uiIcons === set.id}
            onClick={() => setPref('uiIcons', set.id)}
            class="iconset-card"
            classList={{ 'is-active': prefs.uiIcons === set.id }}
          >
            <div class="flex items-center gap-3 text-white/80">
              <For each={SAMPLE}>
                {(n) => <UiIcon name={n} size={set.id === 'dinkie' ? 12 : 16} set={set.id} />}
              </For>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-[13px] text-white/90">{set.name}</span>
              <span class="text-[11.5px] text-white/35">{set.note}</span>
              <span class="iconset-check ml-auto" />
            </div>
          </button>
        )}
      </For>
    </div>
  </div>
)

export default IconSetPicker
