import { createMemo, createSignal, For, Show, type Accessor, type Component } from 'solid-js'
import { gitCommits, refreshGitData, selectedCommitHash, setSelectedCommitHash } from '../../store'
import type { GitCommit } from '../../types'
import { DitherButton } from '../dithercn/dither-button'
import { timeAgo } from './formatActivityTime'
import { CheckCheckIcon, KbdHint } from './SidebarControls'

const PrBranchIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" class={props.class ?? 'w-3.5 h-3.5 text-[#a855f7]'}>
    <circle cx="4" cy="3.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <circle cx="4" cy="12.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <circle cx="12" cy="12.5" r="1.75" stroke="currentColor" stroke-width="1.4" />
    <path
      d="M4 5.25v5.5M12 10.75V7.5a2.5 2.5 0 0 0-2.5-2.5H7"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
    />
  </svg>
)

const CheckIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const GitCommitRow = (props: {
  commit: GitCommit
  index: number
  active: boolean
  isChild?: boolean
  copied?: boolean
  onSelect: () => void
  onCopyHash: () => void
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          props.onSelect()
        }
      }}
      class={`group relative flex min-h-7 w-full cursor-pointer items-center rounded-md pl-0 pr-1.5 select-none transition-[color,background-color,opacity] duration-150 outline-none ${
        props.active ? 'bg-white/[0.11] text-white' : 'text-white/80 hover:bg-white/[0.06]'
      }`}
    >
      {/* Left Active / Status Rail Slot (8px) */}
      <span class="flex w-2 shrink-0 items-center justify-center self-stretch">
        <Show when={props.index === 0 && !props.active}>
          <span class="h-1.5 w-0.5 rounded-[1px] bg-emerald-400" title="HEAD commit" />
        </Show>
        <Show when={props.active}>
          <span class="h-2 w-0.5 rounded-[1px] bg-[#a855f7]" title="Selected commit" />
        </Show>
      </span>

      {/* Nested L-Connector Rail for commit chain (matching 8bf93386.png row 2) */}
      <Show when={props.isChild}>
        <span
          aria-hidden
          class="pointer-events-none absolute top-0 h-1/2 w-px bg-white/[0.12]"
          style={{ left: '12px' }}
        />
        <span
          aria-hidden
          class="pointer-events-none absolute top-1/2 h-px bg-white/[0.12]"
          style={{ left: '13px', width: '7px' }}
        />
        <span aria-hidden class="shrink-0 w-[14px]" />
      </Show>

      {/* PR / Git Branch Mark */}
      <span class="mr-1.5 flex shrink-0 items-center">
        <PrBranchIcon class="w-3.5 h-3.5 text-[#a855f7]" />
      </span>

      {/* Short Hash Badge */}
      <span class="font-mono text-[10.5px] text-white/40 group-hover:text-white/60 mr-1.5 shrink-0 tabular-nums">
        {props.commit.shortHash}
      </span>

      {/* Commit Message with hover gradient mask */}
      <span
        title={props.commit.message}
        class="min-w-0 flex-1 truncate text-[13px] font-normal tracking-[-0.01em] group-hover:[mask-image:linear-gradient(to_left,transparent_36px,black_56px)]"
      >
        {props.commit.message}
      </span>

      {/* Right Timestamp + Copy Action */}
      <div class="flex shrink-0 items-center self-stretch pl-2 text-[12px]">
        <span class="pointer-events-none flex items-center whitespace-nowrap text-white/40 tabular-nums transition-opacity duration-150 group-hover:opacity-0">
          {timeAgo(Math.floor(props.commit.timestamp / 1000))}
        </span>

        <div class="pointer-events-none absolute inset-y-0 right-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            title={props.copied ? 'Copied SHA!' : 'Copy commit hash'}
            onClick={(e) => {
              e.stopPropagation()
              props.onCopyHash()
            }}
            class="w-5 h-5 rounded flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Show when={props.copied} fallback={<CheckIcon class="w-3.5 h-3.5" />}>
              <CheckCheckIcon class="w-3.5 h-3.5 text-emerald-400" />
            </Show>
          </button>
        </div>
      </div>
    </div>
  )
}

export function createGitActivity(searchQuery: Accessor<string>) {
  const [copiedHash, setCopiedHash] = createSignal<string | null>(null)

  const copyCommitHash = (hash: string): void => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const filteredCommits = createMemo((): GitCommit[] => {
    const q = searchQuery().trim().toLowerCase()
    const list = gitCommits()
    if (!q) return list
    return list.filter((c) => {
      return (
        c.message.toLowerCase().includes(q) ||
        c.shortHash.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q)
      )
    })
  })

  const GitActivity: Component = () => (
    <div class="flex flex-col gap-px">
      <Show
        when={filteredCommits().length > 0}
        fallback={
          <div class="px-2 py-8 text-center text-[13px] text-white/40 select-none">
            <p>
              {searchQuery().trim()
                ? `No commits matching "${searchQuery().trim()}".`
                : 'No Git commits found.'}
            </p>
            <div class="mt-2 flex justify-center">
              <DitherButton variant="outline" color="ink" size="sm" onClick={refreshGitData}>
                Check again
              </DitherButton>
            </div>
          </div>
        }
      >
        <For each={filteredCommits()}>
          {(commit, index) => (
            <>
              <Show when={index() === 2}>
                <div aria-hidden class="h-2.5 shrink-0" />
              </Show>
              <GitCommitRow
                commit={commit}
                index={index()}
                active={selectedCommitHash() === commit.hash}
                isChild={index() === 1}
                copied={copiedHash() === commit.hash}
                onSelect={() => setSelectedCommitHash(commit.hash)}
                onCopyHash={() => copyCommitHash(commit.hash)}
              />
            </>
          )}
        </For>
        <Show when={filteredCommits().length > 1}>
          <div class="mt-2 flex min-h-7 items-center justify-between pr-0.5 pl-2 text-[12.5px] text-white/35">
            <span>Switch tasks</span>
            <KbdHint combo="Mod+Shift+↑ ↓" muted />
          </div>
        </Show>
      </Show>
    </div>
  )

  return { GitActivity, filteredCommits }
}
