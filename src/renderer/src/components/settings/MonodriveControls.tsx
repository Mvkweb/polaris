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
        <div class="text-[13px] font-semibold text-white/90 tracking-tight">{props.title}</div>
        <Show when={props.description}>
          <div class="text-[11.5px] text-white/50">{props.description}</div>
        </Show>
      </div>
      <div class="rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col overflow-hidden">
        {props.children}
      </div>
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
      class={`min-h-[44px] py-2.5 px-3.5 flex items-center justify-between gap-6 ${
        props.isLast ? '' : 'border-b border-white/[0.06]'
      } ${props.disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        <div class="text-[13px] text-white/90 font-normal leading-snug">{props.label}</div>
        <Show when={props.description}>
          <div class="text-[11.5px] text-white/50 leading-relaxed">{props.description}</div>
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
      class={`relative shrink-0 w-[34px] h-[20px] rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
        props.checked ? 'bg-[var(--accent,#4da3f5)]' : 'bg-white/20'
      } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        class={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
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
    <div class="flex p-0.5 gap-0.5 rounded-full bg-white/[0.08] select-none">
      <For each={props.options}>
        {(option) => {
          const isSelected = () => option.value === props.value
          return (
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => !props.disabled && props.onChange(option.value)}
              class={`h-[22px] px-2.5 rounded-full flex items-center text-[12px] leading-none transition-all duration-150 cursor-pointer focus:outline-none ${
                isSelected()
                  ? 'bg-[#262626] text-white font-medium shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                  : 'text-white/60 hover:text-white font-normal'
              } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    <div class={`flex items-center gap-3 w-[210px] ${props.disabled ? 'opacity-40' : ''}`}>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step || 1}
        value={props.value}
        disabled={props.disabled}
        onInput={(e) => props.onChange(Number(e.currentTarget.value))}
        class="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none accent-[var(--accent,#4da3f5)]"
      />
      <span class="text-[12px] text-white/60 min-w-8 text-right font-mono">
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
    <div class="flex items-center gap-2">
      <For each={props.colors}>
        {(color) => {
          const isSelected = () =>
            color.hex.toLowerCase() === props.selectedColor.toLowerCase()
          return (
            <button
              type="button"
              aria-label={color.label}
              title={color.label}
              onClick={() => props.onChange(color.hex)}
              class="relative w-5 h-5 rounded-full transition-transform hover:scale-110 cursor-pointer focus:outline-none flex items-center justify-center"
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
