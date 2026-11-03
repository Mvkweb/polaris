import { Component, For } from 'solid-js'
import { SettingGroup, SettingRow } from '../MonodriveControls'

interface ShortcutRowData {
  label: string
  description?: string
  keys: string[]
}

export const KeyboardPage: Component = () => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
  const modKey = isMac ? '⌘' : 'Ctrl'

  const navigationShortcuts: ShortcutRowData[] = [
    {
      label: 'Quick Open',
      description: 'Search and jump to files or folders anywhere in the workspace.',
      keys: [modKey, 'P']
    },
    {
      label: 'Find in Files',
      description: 'Search text and symbols across workspace entries.',
      keys: [modKey, 'Shift', 'F']
    },
    {
      label: 'Toggle Hidden Files',
      description: 'Show or hide files and folders whose names start with a period.',
      keys: [modKey, 'Shift', '.']
    },
    {
      label: 'Go Back',
      description: 'Navigate up to the parent directory in the browser canvas.',
      keys: ['Backspace']
    }
  ]

  const windowShortcuts: ShortcutRowData[] = [
    {
      label: 'Toggle Settings',
      description: 'Open or close this preferences sheet.',
      keys: [modKey, ',']
    },
    {
      label: 'Toggle Terminal',
      description: 'Slide the embedded terminal drawer open or closed.',
      keys: [modKey, '`']
    },
    {
      label: 'Switch to Grid View',
      description: 'Display entries as icons in a grid layout.',
      keys: [isMac ? '⌥⌘' : 'Alt+Ctrl', '2']
    },
    {
      label: 'Switch to List View',
      description: 'Display entries as rows in a column table.',
      keys: [isMac ? '⌥⌘' : 'Alt+Ctrl', '1']
    }
  ]

  return (
    <div class="flex flex-col gap-6">
      <SettingGroup title="Navigation">
        <For each={navigationShortcuts}>
          {(shortcut, idx) => (
            <SettingRow
              label={shortcut.label}
              description={shortcut.description}
              isLast={idx() === navigationShortcuts.length - 1}
            >
              <div class="flex items-center gap-1">
                <For each={shortcut.keys}>
                  {(k) => (
                    <kbd class="px-2 py-0.5 min-w-6 text-center rounded-md bg-[#242424] text-[11px] font-mono text-[#dcdcdc] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      {k}
                    </kbd>
                  )}
                </For>
              </div>
            </SettingRow>
          )}
        </For>
      </SettingGroup>

      <SettingGroup title="Window & Tools">
        <For each={windowShortcuts}>
          {(shortcut, idx) => (
            <SettingRow
              label={shortcut.label}
              description={shortcut.description}
              isLast={idx() === windowShortcuts.length - 1}
            >
              <div class="flex items-center gap-1">
                <For each={shortcut.keys}>
                  {(k) => (
                    <kbd class="px-2 py-0.5 min-w-6 text-center rounded-md bg-[#242424] text-[11px] font-mono text-[#dcdcdc] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      {k}
                    </kbd>
                  )}
                </For>
              </div>
            </SettingRow>
          )}
        </For>
      </SettingGroup>
    </div>
  )
}
