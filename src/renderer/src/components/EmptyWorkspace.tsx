import type { Component } from 'solid-js'
import { PolarisStarIcon } from './ui/Icons'

const ShortcutPill: Component<{ label: string; shortcut: string }> = (props) => (
  <div class="flex items-center justify-between w-[280px] h-[34px] px-3 rounded-[6px] bg-white/[0.03] border border-white/[0.04] text-[12px] text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer">
    <span>{props.label}</span>
    <kbd class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white/[0.06] text-white/40">
      {props.shortcut}
    </kbd>
  </div>
)

const EmptyWorkspace: Component = () => {
  return (
    <div class="flex-1 flex flex-col items-center justify-center h-full p-6 select-none bg-[#0c0a0d]">
      <div class="flex flex-col items-center max-w-[360px] text-center">
        {/* Glow & Compass Icon */}
        <div class="relative mb-5 flex items-center justify-center">
          <div class="absolute w-20 h-20 rounded-full bg-purple-600/15 blur-xl -z-10 animate-pulse" />
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/70 shadow-2xl">
            <PolarisStarIcon class="w-8 h-8 text-purple-400" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h2 class="text-[16px] font-medium text-white/90 mb-1.5">No File Open</h2>
        <p class="text-[12.5px] text-white/40 leading-relaxed mb-6">
          Select a file from the sidebar to inspect or edit code.
        </p>

        {/* Quick action shortcut hints matching reference */}
        <div class="flex flex-col gap-2">
          <ShortcutPill label="Quick Open" shortcut="Ctrl+P" />
          <ShortcutPill label="Find in Files" shortcut="Ctrl+Shift+F" />
          <ShortcutPill label="Toggle Terminal" shortcut="Ctrl+`" />
        </div>
      </div>
    </div>
  )
}

export default EmptyWorkspace
