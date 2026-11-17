import { Component, JSX, For, Show } from 'solid-js'

export interface SettingGroupProps {
  title: string
  description?: string
  children: JSX.Element
}

export const SettingGroup: Component<SettingGroupProps> = (props) => {
  return (
    <div class="flex flex-col gap-2">
      <div class="px-1 flex flex-col gap-0.5">
        <div class="text-[13px] font-semibold text-[#ececec] tracking-tight">{props.title}</div>
        <Show when={props.description}>
          <div class="text-[12px] text-[#767676]">{props.description}</div>
        </Show>
      </div>
      <div class="rounded-2xl bg-[#181818] flex flex-col overflow-hidden">{props.children}</div>
    </div>
  )
}

export interface SettingRowProps {
  label: string
  description?: string
  children: JSX.Element
  isLast?: boolean
  disabled?: boolean
}

export const SettingRow: Component<SettingRowProps> = (props) => {
  return (
    <div
      class={`min-h-[46px] py-3 px-4 flex items-center justify-between gap-6 ${
        props.isLast ? '' : 'border-b border-[#212121]'
      } ${props.disabled ? 'opacity-35 pointer-events-none' : ''}`}
    >
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <div class="text-[13px] text-[#ededed] font-normal leading-snug">{props.label}</div>
        <Show when={props.description}>
          <div class="text-[12px] text-[#737373] leading-relaxed">{props.description}</div>
        </Show>
      </div>
      <div class="shrink-0 flex items-center">{props.children}</div>
    </div>
  )
}

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export const ToggleSwitch: Component<ToggleSwitchProps> = (props) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label || 'Toggle switch'}
      disabled={props.disabled}
      onClick={() => !props.disabled && props.onChange(!props.checked)}
      class={`relative shrink-0 w-[34px] h-[20px] rounded-full transition-colors duration-150 cursor-pointer focus:outline-none ${
        props.checked ? 'bg-[var(--accent,#3b82f6)]' : 'bg-[#2a2a2a] hover:bg-[#323232]'
      } ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        class={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform duration-150 ${
          props.checked ? 'translate-x-[14px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export interface SegmentedOption<T> {
  value: T
  label: string
}

export interface SegmentedControlProps<T> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export function SegmentedControl<T extends string | number | boolean>(
  props: SegmentedControlProps<T>
): JSX.Element {
  return (
    <div class="flex p-[3px] gap-0.5 rounded-full bg-[#101010] select-none">
      <For each={props.options}>
        {(option) => {
          const isSelected = () => option.value === props.value
          return (
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => !props.disabled && props.onChange(option.value)}
              class={`h-[22px] px-3 rounded-full flex items-center text-[12px] leading-none transition-all duration-150 cursor-pointer focus:outline-none ${
                isSelected()
                  ? 'bg-[#292929] text-[#ffffff] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                  : 'text-[#808080] hover:text-[#d1d1d1] font-normal'
              } ${props.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          )
        }}
      </For>
    </div>
  )
}

export interface SettingSliderProps {
  min: number
  max: number
  step?: number
  value: number
  unit?: string
  onChange: (value: number) => void
  disabled?: boolean
}

export const SettingSlider: Component<SettingSliderProps> = (props) => {
  return (
    <div class={`flex items-center gap-3 w-[210px] ${props.disabled ? 'opacity-35' : ''}`}>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step || 1}
        value={props.value}
        disabled={props.disabled}
        onInput={(e) => props.onChange(Number(e.currentTarget.value))}
        class="flex-1 h-1 bg-[#262626] rounded-full appearance-none cursor-pointer focus:outline-none accent-[var(--accent,#3b82f6)]"
      />
      <span class="text-[12px] text-[#787878] min-w-8 text-right font-mono">
        {props.value}
        {props.unit || ''}
      </span>
    </div>
  )
}

export interface ColorSwatchPickerProps {
  colors: readonly { hex: string; label: string }[]
  selectedColor: string
  onChange: (hex: string) => void
}

export const ColorSwatchPicker: Component<ColorSwatchPickerProps> = (props) => {
  return (
    <div class="flex items-center gap-2.5">
      <For each={props.colors}>
        {(color) => {
          const isSelected = () => color.hex.toLowerCase() === props.selectedColor.toLowerCase()
          return (
            <button
              type="button"
              aria-label={color.label}
              title={color.label}
              onClick={() => props.onChange(color.hex)}
              class="relative w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer focus:outline-none flex items-center justify-center shadow-sm"
              style={{ 'background-color': color.hex }}
            >
              <Show when={isSelected()}>
                <span class="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              </Show>
            </button>
          )
        }}
      </For>
    </div>
  )
}
