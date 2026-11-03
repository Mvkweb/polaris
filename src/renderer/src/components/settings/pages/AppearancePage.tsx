import { Component } from 'solid-js'
import {
  SettingGroup,
  SettingRow,
  ToggleSwitch,
  SegmentedControl,
  SettingSlider,
  ColorSwatchPicker
} from '../MonodriveControls'
import {
  appearanceTheme,
  setAppearanceTheme,
  selectedAccentColor,
  setSelectedAccentColor,
  MONODRIVE_ACCENTS,
  windowHue,
  setWindowHue,
  windowSaturation,
  setWindowSaturation,
  darkLightness,
  setDarkLightness,
  windowOpacity,
  setWindowOpacity,
  mainPaneGlass,
  setMainPaneGlass,
  workspaceStyle,
  setWorkspaceStyle
} from '../../../store'

export const AppearancePage: Component = () => {
  const themeOptions = [
    { value: 'System' as const, label: 'System' },
    { value: 'Dark' as const, label: 'Dark' },
    { value: 'Light' as const, label: 'Light' }
  ]

  const styleOptions = [
    { value: 'Card' as const, label: 'Card' },
    { value: 'Boxy' as const, label: 'Boxy' }
  ]

  return (
    <div class="flex flex-col gap-6">
      {/* Theme Group */}
      <SettingGroup title="Theme">
        <SettingRow
          label="Appearance"
          description="System follows your desktop environment."
        >
          <SegmentedControl
            options={themeOptions}
            value={appearanceTheme()}
            onChange={setAppearanceTheme}
          />
        </SettingRow>

        <SettingRow
          label="Accent color"
          description="Selection, switches and sliders."
          isLast
        >
          <ColorSwatchPicker
            colors={MONODRIVE_ACCENTS}
            selectedColor={selectedAccentColor()}
            onChange={setSelectedAccentColor}
          />
        </SettingRow>
      </SettingGroup>

      {/* Color Group */}
      <SettingGroup title="Color">
        <SettingRow
          label="Hue"
          description="Tints the window."
        >
          <SettingSlider
            min={0}
            max={360}
            value={windowHue()}
            unit="°"
            onChange={setWindowHue}
          />
        </SettingRow>

        <SettingRow
          label="Saturation"
          description="How strongly the hue shows. Zero keeps it neutral."
        >
          <SettingSlider
            min={0}
            max={100}
            value={windowSaturation()}
            unit="%"
            onChange={setWindowSaturation}
          />
        </SettingRow>

        <SettingRow
          label="Dark-mode lightness"
          description="Lower is darker; zero is pure black."
          isLast
        >
          <SettingSlider
            min={0}
            max={30}
            value={darkLightness()}
            unit="%"
            onChange={setDarkLightness}
          />
        </SettingRow>
      </SettingGroup>

      {/* Translucency Group */}
      <SettingGroup
        title="Translucency"
        description="How much of the desktop shows through Polaris."
      >
        <SettingRow
          label="Window opacity"
          description="The sidebar and title bar."
        >
          <SettingSlider
            min={50}
            max={100}
            value={windowOpacity()}
            unit="%"
            onChange={setWindowOpacity}
          />
        </SettingRow>

        <SettingRow
          label="Main pane glass"
          description="Lets the file list show the desktop too."
          isLast
        >
          <ToggleSwitch
            checked={mainPaneGlass()}
            onChange={setMainPaneGlass}
            label="Main pane glass"
          />
        </SettingRow>
      </SettingGroup>

      {/* Layout Group */}
      <SettingGroup title="Layout">
        <SettingRow
          label="Workspace style"
          description="A rounded card or a full-height boxy workspace."
          isLast
        >
          <SegmentedControl
            options={styleOptions}
            value={workspaceStyle()}
            onChange={setWorkspaceStyle}
          />
        </SettingRow>
      </SettingGroup>
    </div>
  )
}
