import { Component, createSignal, For } from 'solid-js'
import { SettingGroup, SettingRow, ToggleSwitch } from '../MonodriveControls'
import {
  agentsChangeFiles,
  setAgentsChangeFiles,
  selectedHarness,
  setSelectedHarness
} from '../../../store'

export const AgentsPage: Component = () => {
  const [copied, setCopied] = createSignal(false)

  const harnesses = [
    { id: 'Antigravity', name: 'Antigravity' },
    { id: 'Claude', name: 'Claude Code' },
    { id: 'Cursor', name: 'Cursor' },
    { id: 'Codex', name: 'Codex' }
  ]

  const handleCopyCommand = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText('polaris mcp')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Clipboard write failed:', err)
    }
  }

  return (
    <div class="flex flex-col gap-6">
      <SettingGroup title="Harness & Permissions">
        <SettingRow
          label="Agents may change files"
          description="Allow local agent and MCP tools to inspect and modify workspace files."
        >
          <ToggleSwitch
            checked={agentsChangeFiles()}
            onChange={setAgentsChangeFiles}
            label="Agents may change files"
          />
        </SettingRow>

        <SettingRow
          label="Sidecar Engine"
          description="Native Zig 0.17 high-throughput core engine status."
          isLast
        >
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11.5px] font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected (VmRSS ~2 MB)
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title="Local MCP Server"
        description="Works with any agent that runs MCP servers over stdio. Each agent session starts its own."
      >
        <div class="p-3.5 flex flex-col gap-3">
          <div class="text-[12px] text-white/70">
            Run the Polaris MCP protocol server directly in any harness:
          </div>
          <div class="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-[12px] text-white/90 select-all">
            <span>polaris mcp</span>
            <button
              type="button"
              onClick={handleCopyCommand}
              class="h-6 px-2.5 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-[11px] font-sans font-medium text-white transition-colors cursor-pointer"
            >
              {copied() ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </SettingGroup>

      <SettingGroup title="Supported Harnesses">
        <div class="p-3.5 flex flex-wrap gap-2">
          <For each={harnesses}>
            {(item) => {
              const isSelected = () => selectedHarness() === item.id
              return (
                <button
                  type="button"
                  onClick={() => setSelectedHarness(item.id)}
                  class={`h-[30px] px-3.5 rounded-full text-[12px] flex items-center gap-2 border transition-all cursor-pointer ${
                    isSelected()
                      ? 'bg-white/[0.14] border-white/20 text-white font-medium shadow-sm'
                      : 'border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span class="w-2 h-2 rounded-full bg-[var(--accent,#4da3f5)]" />
                  {item.name}
                </button>
              )
            }}
          </For>
        </div>
      </SettingGroup>
    </div>
  )
}
