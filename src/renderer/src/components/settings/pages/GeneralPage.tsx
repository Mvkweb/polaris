import { Component, createSignal } from 'solid-js'
import {
  SettingGroup,
  SettingRow,
  ToggleSwitch,
  SegmentedControl
} from '../MonodriveControls'
import {
  showHiddenFiles,
  setShowHiddenFiles,
  sortField,
  setSortField,
  sortDescending,
  setSortDescending,
  foldersFirst,
  setFoldersFirst,
  defaultTerminal,
  setDefaultTerminal,
  updateTrack,
  setUpdateTrack,
  type SortByField
} from '../../../store'

export const GeneralPage: Component = () => {
  const [checkingUpdate, setCheckingUpdate] = createSignal(false)
  const [updateStatus, setUpdateStatus] = createSignal<string | null>(null)

  const sortOptions = [
    { value: 'name' as SortByField, label: 'Name' },
    { value: 'modified' as SortByField, label: 'Date' },
    { value: 'size' as SortByField, label: 'Size' },
    { value: 'kind' as SortByField, label: 'Kind' }
  ]

  const orderOptions = [
    { value: false, label: 'Ascending' },
    { value: true, label: 'Descending' }
  ]

  const terminalOptions = [
    { value: 'Terminal' as const, label: 'Terminal' },
    { value: 'Ghostty' as const, label: 'Ghostty' }
  ]

  const trackOptions = [
    { value: 'Stable' as const, label: 'Stable' },
    { value: 'Nightly' as const, label: 'Nightly' }
  ]

  const handleCheckUpdate = (): void => {
    setCheckingUpdate(true)
    setUpdateStatus(null)
    setTimeout(() => {
      setCheckingUpdate(false)
      setUpdateStatus('Polaris is up to date')
      setTimeout(() => setUpdateStatus(null), 3000)
    }, 1200)
  }

  return (
    <div class="flex flex-col gap-6">
      {/* Files Group */}
      <SettingGroup title="Files">
        <SettingRow
          label="Show hidden files"
          description="Files whose names start with a period."
        >
          <ToggleSwitch
            checked={showHiddenFiles()}
            onChange={setShowHiddenFiles}
            label="Show hidden files"
          />
        </SettingRow>

        <SettingRow
          label="Sort by"
          description="Clicking a column title sorts by it too."
        >
          <SegmentedControl
            options={sortOptions}
            value={sortField()}
            onChange={setSortField}
          />
        </SettingRow>

        <SettingRow label="Order">
          <SegmentedControl
            options={orderOptions}
            value={sortDescending()}
            onChange={setSortDescending}
          />
        </SettingRow>

        <SettingRow
          label="Keep folders on top"
          description="Folders come before files in any order."
        >
          <ToggleSwitch
            checked={foldersFirst()}
            onChange={setFoldersFirst}
            label="Keep folders on top"
          />
        </SettingRow>

        <SettingRow
          label="Terminal"
          description="What Open in Terminal uses."
          isLast
        >
          <SegmentedControl
            options={terminalOptions}
            value={defaultTerminal()}
            onChange={setDefaultTerminal}
          />
        </SettingRow>
      </SettingGroup>

      {/* Updates Group */}
      <SettingGroup title="Updates">
        <SettingRow
          label="Version"
          description="0.1.0-nightly.20261031.3"
        >
          <div class="flex items-center gap-3">
            {updateStatus() && (
              <span class="text-[12px] text-white/50">{updateStatus()}</span>
            )}
            <button
              type="button"
              disabled={checkingUpdate()}
              onClick={handleCheckUpdate}
              class="h-[26px] px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {checkingUpdate() ? 'Checking…' : 'Check for Updates'}
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Update track"
          description="Which releases the updater offers. Nightly builds come daily."
          isLast
        >
          <SegmentedControl
            options={trackOptions}
            value={updateTrack()}
            onChange={setUpdateTrack}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
