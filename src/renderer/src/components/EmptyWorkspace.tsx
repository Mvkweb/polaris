import type { Component } from 'solid-js'
import { PolarisStarIcon } from './ui/Icons'
import { DitherCard } from './dithercn/dither-card'
import { DitherButton } from './dithercn/dither-button'
import { toggleQuickOpen, setCurrentView, toggleTerminal } from '../store'

const EmptyWorkspace: Component = () => {
  return (
    <div class="flex-1 flex flex-col items-center justify-center h-full p-6 select-none bg-transparent">
      <DitherCard
        glow="top"
        reach={260}
        strength={0.45}
        color="ink"
        rim
        interactive
        class="flex flex-col items-center max-w-[390px] w-full p-8 text-center bg-[#110e14]/90 backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-2xl"
      >
        {/* Glow & Star Icon */}
        <div class="relative mb-5 flex items-center justify-center">
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/80 shadow-inner">
            <PolarisStarIcon class="w-8 h-8 text-[var(--dither-ink)]" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h2 class="text-[17px] font-medium text-white/95 mb-1.5">No File Open</h2>
        <p class="text-[12.5px] text-white/45 leading-relaxed mb-6 max-w-[280px]">
          Select a file from the sidebar to inspect or edit code, or jump to a command below.
        </p>

        {/* Quick action buttons with authentic dithered interaction */}
        <div class="flex flex-col gap-2.5 w-full items-center">
          <DitherButton
            variant="outline"
            color="ink"
            size="md"
            onClick={toggleQuickOpen}
            class="w-[280px] justify-between text-[12.5px] text-white/80"
          >
            <span>Quick Open</span>
            <kbd class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white/[0.08] text-white/50">
              Ctrl+P
            </kbd>
          </DitherButton>

          <DitherButton
            variant="outline"
            color="ink"
            size="md"
            onClick={() => setCurrentView('search')}
            class="w-[280px] justify-between text-[12.5px] text-white/80"
          >
            <span>Find in Files</span>
            <kbd class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white/[0.08] text-white/50">
              Ctrl+Shift+F
            </kbd>
          </DitherButton>

          <DitherButton
            variant="outline"
            color="ink"
            size="md"
            onClick={toggleTerminal}
            class="w-[280px] justify-between text-[12.5px] text-white/80"
          >
            <span>Toggle Terminal</span>
            <kbd class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white/[0.08] text-white/50">
              Ctrl+`
            </kbd>
          </DitherButton>
        </div>
      </DitherCard>
    </div>
  )
}

export default EmptyWorkspace
