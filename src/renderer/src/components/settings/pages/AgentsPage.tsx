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
          <div class="flex items-center gap-2 text-[12px] text-[#a0a0a0]">
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span>Connected (VmRSS ~2 MB)</span>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title="Local MCP Server"
        description="Works with any agent that runs MCP servers over stdio. Each agent session starts its own."
      >
        <div class="p-4 flex flex-col gap-2.5">
          <div class="text-[12px] text-[#808080]">
            Run the Polaris MCP protocol server directly in any harness:
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#101010] font-mono text-[12px] text-[#e0e0e0] select-all">
            <span>polaris mcp</span>
            <button
              type="button"
              onClick={handleCopyCommand}
              class="h-[24px] px-3 rounded-full bg-[#242424] hover:bg-[#2c2c2c] text-[11px] font-sans font-medium text-[#d4d4d4] hover:text-white transition-colors cursor-pointer shadow-sm"
            >
              {copied() ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </SettingGroup>

      <SettingGroup title="Supported Harnesses">
        <div class="p-4 flex flex-wrap gap-2">
          <For each={harnesses}>
            {(item) => {
              const isSelected = () => selectedHarness() === item.id
              return (
                <button
                  type="button"
                  onClick={() => setSelectedHarness(item.id)}
                  class={`h-[28px] px-3.5 rounded-full text-[12px] flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected()
                      ? 'bg-[#282828] text-white font-medium shadow-sm'
                      : 'bg-[#121212] text-[#707070] hover:text-[#d4d4d4] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span
                    class={`w-2 h-2 rounded-full transition-colors ${
                      isSelected() ? 'bg-[var(--accent,#3b82f6)]' : 'bg-[#404040]'
                    }`}
                  />
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
