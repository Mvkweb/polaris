import { Component } from 'solid-js'
import {
  SettingGroup,
  SettingRow,
  ToggleSwitch,
  SegmentedControl,
  SettingSlider
} from '../MonodriveControls'
import {
  windowDefaultSize,
  setWindowDefaultSize,
  viewMode,
  setViewMode,
  showPathBar,
  setShowPathBar,
  openFoldersWhileDragging,
  setOpenFoldersWhileDragging,
  gridIconSize,
  setGridIconSize,
  gridLabelSize,
  setGridLabelSize,
  showThumbnails,
  setShowThumbnails,
  suggestSentenceCaseNames,
  setSuggestSentenceCaseNames,
  listRowSize,
  setListRowSize,
  type WindowDefaultSize
} from '../../../store'

export const WindowPage: Component = () => {
  const windowSizeOptions = [
    { value: 'Reasonable' as WindowDefaultSize, label: 'Reasonable' },
    { value: 'Almost Full' as WindowDefaultSize, label: 'Almost Full' },
    { value: 'Last Used' as WindowDefaultSize, label: 'Last Used' }
  ]

  const viewOptions = [
    { value: 'List' as const, label: 'List' },
    { value: 'Grid' as const, label: 'Grid' }
  ]

  const sizeOptions = [
    { value: 'Small' as const, label: 'Small' },
    { value: 'Medium' as const, label: 'Medium' },
    { value: 'Large' as const, label: 'Large' }
  ]

  return (
    <div class="flex flex-col gap-6">
      {/* Window Group */}
      <SettingGroup title="Window">
        <SettingRow
          label="Default size"
          description="Reasonable is 60% of the screen, up to 1025 × 900, and Almost Full 90%, centered."
          isLast
        >
          <SegmentedControl
            options={windowSizeOptions}
            value={windowDefaultSize()}
            onChange={setWindowDefaultSize}
          />
        </SettingRow>
      </SettingGroup>

      {/* View Group */}
      <SettingGroup title="View">
        <SettingRow
          label="View as"
          description="⌥⌘1 and ⌥⌘2 switch it too."
        >
          <SegmentedControl
            options={viewOptions}
            value={viewMode()}
            onChange={setViewMode}
          />
        </SettingRow>

        <SettingRow
          label="Show path bar"
          description="The path, selection and free space under the files. ⌥⌘P switches it too."
        >
          <ToggleSwitch
            checked={showPathBar()}
            onChange={setShowPathBar}
            label="Show path bar"
          />
        </SettingRow>

        <SettingRow
          label="Open folders while dragging"
          description="Resting on a folder for a moment opens it. Space opens it at once."
          isLast
        >
          <ToggleSwitch
            checked={openFoldersWhileDragging()}
            onChange={setOpenFoldersWhileDragging}
            label="Open folders while dragging"
          />
        </SettingRow>
      </SettingGroup>

      {/* Grid Group */}
      <SettingGroup title="Grid">
        <SettingRow label="Icon size">
          <SettingSlider
            min={48}
            max={144}
            step={4}
            value={gridIconSize()}
            unit="px"
            onChange={setGridIconSize}
          />
        </SettingRow>

        <SettingRow label="Label size">
          <SegmentedControl
            options={sizeOptions}
            value={gridLabelSize()}
            onChange={setGridLabelSize}
          />
        </SettingRow>

        <SettingRow
          label="Show thumbnails"
          description="Images and videos show a picture instead of an icon."
        >
          <ToggleSwitch
            checked={showThumbnails()}
            onChange={setShowThumbnails}
            label="Show thumbnails"
          />
        </SettingRow>

        <SettingRow
          label="Suggest names in sentence case"
          description="Invoice 4471.pdf instead of invoice-4471.pdf."
          isLast
        >
          <ToggleSwitch
            checked={suggestSentenceCaseNames()}
            onChange={setSuggestSentenceCaseNames}
            label="Suggest names in sentence case"
          />
        </SettingRow>
      </SettingGroup>

      {/* List Group */}
      <SettingGroup title="List">
        <SettingRow
          label="Row size"
          description="Icons and text grow with the rows."
          isLast
        >
          <SegmentedControl
            options={sizeOptions}
            value={listRowSize()}
            onChange={setListRowSize}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
