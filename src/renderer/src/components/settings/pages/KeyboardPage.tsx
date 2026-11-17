import { For, Show, type Component } from 'solid-js'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_GROUPS,
  hasAnyShortcutModified,
  resetAllShortcuts
} from '../../../shortcuts'
import { ShortcutRecorder } from '../ShortcutRecorder'

/** Every shortcut from the registry, grouped; click the keys to rebind. */
export const KeyboardPage: Component = () => (
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between px-1">
      <span class="text-[12.5px] text-white/40">
        Click a shortcut, then press the new keys. Esc cancels.
      </span>
      <Show when={hasAnyShortcutModified()}>
        <button type="button" class="kbd-reset-all" onClick={resetAllShortcuts}>
          Reset all
        </button>
      </Show>
    </div>
    <For each={SHORTCUT_GROUPS}>
      {(group) => (
        <div>
          <div class="settings-section-title">{group}</div>
          <div class="kbd-list">
            <For each={DEFAULT_SHORTCUTS.filter((s) => s.group === group)}>
              {(s) => (
                <div class="kbd-row">
                  <div class="min-w-0 flex-1">
                    <div class="text-[13.5px] text-white/90">{s.title}</div>
                    <Show when={s.description}>
                      <div class="mt-0.5 text-[12px] text-white/38 truncate">{s.description}</div>
                    </Show>
                  </div>
                  <ShortcutRecorder id={s.id} locked={s.locked} />
                </div>
              )}
            </For>
          </div>
        </div>
      )}
    </For>
  </div>
)

export default KeyboardPage
