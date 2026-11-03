import type { Component } from 'solid-js'
import emberLogo from '../../assets/ember-logo.svg'
import { formatShortcut } from '../../shortcuts'

export const EmptyState: Component = () => {
  return (
    <div class="flex-1 flex flex-col items-center justify-center p-6 select-none animate-[fadeIn_200ms_ease-out]">
      <div class="flex flex-col items-center gap-3 max-w-[280px] text-center">
        {/* Subtle Ember logo */}
        <img src={emberLogo} alt="Ember" draggable={false} class="w-20 h-20 opacity-25" />

        {/* Grayed-out Clean Text */}
        <div class="flex flex-col gap-1">
          <span class="text-[13.5px] font-medium text-white/30 tracking-tight">Empty Folder</span>
          <span class="text-[12px] text-white/20 leading-relaxed">
            No files here. Select a place or folder from the sidebar.
          </span>
        </div>

        {/* Minimal Shortcut Hints */}
        <div class="mt-4 flex flex-col gap-1.5 w-full">
          <div class="flex items-center justify-between text-[11px] text-white/20 px-2 py-1 rounded bg-white/[0.015]">
            <span>Quick Open</span>
            <span class="font-mono text-white/30 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded">
              {formatShortcut('Mod+P')}
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-white/20 px-2 py-1 rounded bg-white/[0.015]">
            <span>Find in Files</span>
            <span class="font-mono text-white/30 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded">
              {formatShortcut('Mod+Shift+F')}
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-white/20 px-2 py-1 rounded bg-white/[0.015]">
            <span>Toggle Terminal</span>
            <span class="font-mono text-white/30 text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded">
              {formatShortcut('Mod+`')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmptyState
