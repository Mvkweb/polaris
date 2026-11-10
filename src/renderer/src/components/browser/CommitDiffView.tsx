import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { DitherDiff, type DiffFile, type DiffHunk } from '../dithercn/dither-diff'
import { DitherButton } from '../dithercn/dither-button'
import { gitCommits, workspaceRoot } from '../../store'

interface CommitDiffViewProps {
  hash: string
  onBack: () => void
}

function parseGitDiffToFiles(rawDiff: string): DiffFile[] {
  if (!rawDiff || !rawDiff.includes('diff --git')) {
    return []
  }

  const files: DiffFile[] = []
  const rawFiles = rawDiff.split(/^diff --git /m).filter(Boolean)

  for (const rawFile of rawFiles) {
    const lines = rawFile.split('\n')
    const headerLine = lines[0] || ''
    const match = headerLine.match(/a\/(.+?)\s+b\/(.+)/)
    const filePath = match ? match[2] : headerLine.split(' ')[0]

    let status: 'modified' | 'added' | 'deleted' = 'modified'
    if (rawFile.includes('new file mode')) status = 'added'
    else if (rawFile.includes('deleted file mode')) status = 'deleted'

    const hunks: DiffHunk[] = []
    let currentHunk: DiffHunk | null = null
    let additions = 0
    let deletions = 0
    let oldLineNum = 1
    let newLineNum = 1

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('@@')) {
        const hunkMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/)
        if (hunkMatch) {
          oldLineNum = parseInt(hunkMatch[1], 10)
          newLineNum = parseInt(hunkMatch[2], 10)
        }
        currentHunk = {
          id: `hunk-${hunks.length + 1}`,
          header: line,
          lines: []
        }
        hunks.push(currentHunk)
        continue
      }

      if (!currentHunk) continue

      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
        currentHunk.lines.push({
          type: 'added',
          newLineNumber: newLineNum++,
          content: line.slice(1)
        })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
        currentHunk.lines.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          content: line.slice(1)
        })
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          content: line.startsWith(' ') ? line.slice(1) : line
        })
      }
    }

    if (hunks.length > 0) {
      files.push({
        path: filePath,
        status,
        additions,
        deletions,
        hunks
      })
    }
  }

  return files
}

export const CommitDiffView: Component<CommitDiffViewProps> = (props) => {
  const [loading, setLoading] = createSignal(true)
  const [diffFiles, setDiffFiles] = createSignal<DiffFile[]>([])

  const commit = createMemo(() => {
    return gitCommits().find((c) => c.hash === props.hash || c.shortHash === props.hash)
  })

  createEffect(async () => {
    const hash = props.hash
    if (!hash) return

    setLoading(true)
    try {
      if (window.api?.gitGetCommitDiff) {
        const root = workspaceRoot() || '/mnt/storage/polaris'
        const raw = await window.api.gitGetCommitDiff(hash, root)
        if (raw) {
          const parsed = parseGitDiffToFiles(raw)
          setDiffFiles(parsed)
        } else {
          setDiffFiles([])
        }
      }
    } catch (err) {
      console.warn('Failed to load commit diff:', err)
      setDiffFiles([])
    } finally {
      setLoading(false)
    }
  })

  return (
    <div class="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#0c0a0d] text-white">
      {/* Top Diff Header */}
      <div class="shrink-0 h-12 px-5 border-b border-white/[0.08] flex items-center justify-between bg-black/30 backdrop-blur-md">
        <div class="flex items-center gap-3 min-w-0">
          <DitherButton
            variant="outline"
            color="ink"
            size="sm"
            onClick={props.onBack}
            class="text-[12px] h-7 px-2.5 gap-1.5"
          >
            <span>← Back</span>
          </DitherButton>

          <span class="font-mono text-[12px] px-2 py-0.5 rounded bg-white/[0.08] text-[var(--dither-ink)] font-semibold">
            {commit()?.shortHash || props.hash.slice(0, 7)}
          </span>

          <span class="text-[13px] font-medium text-white/90 truncate max-w-[420px]" title={commit()?.message}>
            {commit()?.message || 'Commit Diff'}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Show when={commit()?.author}>
            <span class="text-[11.5px] text-white/40 font-mono">
              {commit()?.author}
            </span>
          </Show>
        </div>
      </div>

      {/* Main Diff Content Container */}
      <div class="flex-1 overflow-y-auto p-5">
        <Show
          when={!loading()}
          fallback={
            <div class="flex items-center justify-center h-48 text-[13px] text-white/40">
              Loading commit diff...
            </div>
          }
        >
          <DitherDiff
            files={diffFiles().length > 0 ? diffFiles() : undefined}
            expandAll
            maxHeight="100%"
            class="w-full"
          />
        </Show>
      </div>
    </div>
  )
}

export default CommitDiffView
