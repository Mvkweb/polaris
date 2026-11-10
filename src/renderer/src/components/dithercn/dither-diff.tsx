import {
  createMemo,
  createSignal,
  For,
  type JSX,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";

import {
  type DitherMatrix,
  fillStyle,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface DiffLine {
  type: "context" | "added" | "removed";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  id: string;
  header: string;
  collapsed?: boolean;
  unmodifiedCount?: number;
  unmodifiedLines?: DiffLine[];
  lines: DiffLine[];
}

export interface DiffFile {
  path?: string;
  status?: "modified" | "added" | "deleted";
  additions?: number;
  deletions?: number;
  hunks: DiffHunk[];
}

export interface DitherDiffProps extends JSX.HTMLAttributes<HTMLDivElement> {
  hunks?: DiffHunk[];
  file?: DiffFile;
  files?: DiffFile[];
  cell?: number;
  matrix?: DitherMatrix;
  expandAll?: boolean;
  maxHeight?: string | number;
}

/** Sample diff hunks from Pierre / AgentUi */
export const DEFAULT_DIFF_HUNKS: DiffHunk[] = [
  {
    id: "hunk-1",
    header: "16 unmodified lines",
    unmodifiedCount: 16,
    collapsed: true,
    unmodifiedLines: [
      { type: "context", oldLineNumber: 1, newLineNumber: 1, content: "import { createMemo, createSignal, For } from 'solid-js';" },
      { type: "context", oldLineNumber: 2, newLineNumber: 2, content: "import { cssColor, fillStyle } from '@/lib/dither';" },
      { type: "context", oldLineNumber: 3, newLineNumber: 3, content: "import { cn } from '@/lib/utils';" },
      { type: "context", oldLineNumber: 4, newLineNumber: 4, content: "" },
      { type: "context", oldLineNumber: 5, newLineNumber: 5, content: "export interface AgentUiProps {" },
      { type: "context", oldLineNumber: 6, newLineNumber: 6, content: "  session: AuiSession;" },
      { type: "context", oldLineNumber: 7, newLineNumber: 7, content: "  themeType?: 'dark' | 'dither';" },
      { type: "context", oldLineNumber: 8, newLineNumber: 8, content: "}" },
      { type: "context", oldLineNumber: 9, newLineNumber: 9, content: "" },
      { type: "context", oldLineNumber: 10, newLineNumber: 10, content: "export function AgentUi(props: AgentUiProps) {" },
      { type: "context", oldLineNumber: 11, newLineNumber: 11, content: "  const [active, setActive] = createSignal(false);" },
      { type: "context", oldLineNumber: 12, newLineNumber: 12, content: "  const session = () => props.session;" },
      { type: "context", oldLineNumber: 13, newLineNumber: 13, content: "" },
      { type: "context", oldLineNumber: 14, newLineNumber: 14, content: "  // Initial session hydration hook" },
      { type: "context", oldLineNumber: 15, newLineNumber: 15, content: "  const status = () => (" },
      { type: "context", oldLineNumber: 16, newLineNumber: 16, content: "    session().status" },
    ],
    lines: [
      { type: "context", oldLineNumber: 17, newLineNumber: 17, content: "  getSessionGitStatus," },
      { type: "context", oldLineNumber: 18, newLineNumber: 18, content: "  getSessionPaths," },
      { type: "context", oldLineNumber: 19, newLineNumber: 19, content: "} from './mockData';" },
      { type: "context", oldLineNumber: 20, newLineNumber: 20, content: "" },
      { type: "removed", oldLineNumber: 21, content: "export type ThemeType = 'light' | 'dark';" },
      { type: "added", newLineNumber: 21, content: "export type ThemeType = 'dark' | 'dither'; // Locked to OLED dither theme" },
      { type: "context", oldLineNumber: 22, newLineNumber: 22, content: "" },
      { type: "context", oldLineNumber: 23, newLineNumber: 23, content: "// The editor's stylesheet flattens every line number to one neutral colour" },
      { type: "context", oldLineNumber: 24, newLineNumber: 24, content: "// (`--diffs-editor-line-number-fg`) and is injected as an unlayered <style>," },
    ],
  },
  {
    id: "hunk-2",
    header: "25 unmodified lines",
    unmodifiedCount: 25,
    collapsed: true,
    unmodifiedLines: [
      { type: "context", oldLineNumber: 25, newLineNumber: 25, content: "// Line number color overrides for Pierre diffing engine" },
      { type: "context", oldLineNumber: 26, newLineNumber: 26, content: "const HIGHLIGHT_STYLES = {" },
      { type: "context", oldLineNumber: 27, newLineNumber: 27, content: "  added: 'color-mix(in oklab, var(--emerald) 10%, transparent)'," },
      { type: "context", oldLineNumber: 28, newLineNumber: 28, content: "  removed: 'color-mix(in oklab, var(--red) 10%, transparent)'," },
      { type: "context", oldLineNumber: 29, newLineNumber: 29, content: "};" },
      { type: "context", oldLineNumber: 30, newLineNumber: 30, content: "" },
      { type: "context", oldLineNumber: 31, newLineNumber: 31, content: "export interface FileTree {" },
      { type: "context", oldLineNumber: 32, newLineNumber: 32, content: "  root: string;" },
      { type: "context", oldLineNumber: 33, newLineNumber: 33, content: "  entries: Map<string, GitStatusEntry>;" },
      { type: "context", oldLineNumber: 34, newLineNumber: 34, content: "}" },
    ],
    lines: [
      { type: "context", oldLineNumber: 50, newLineNumber: 50, content: "// component, so it's created in an effect and torn down on session change." },
      { type: "context", oldLineNumber: 51, newLineNumber: 51, content: "function ChangesTree({" },
      { type: "context", oldLineNumber: 52, newLineNumber: 52, content: "  session," },
      { type: "context", oldLineNumber: 53, newLineNumber: 53, content: "  activePath," },
      { type: "removed", oldLineNumber: 56, content: "  themeType," },
      { type: "context", oldLineNumber: 54, newLineNumber: 54, content: "  onSelect," },
      { type: "context", oldLineNumber: 55, newLineNumber: 55, content: "}: {" },
      { type: "context", oldLineNumber: 56, newLineNumber: 56, content: "  session: AuiSession;" },
      { type: "context", oldLineNumber: 57, newLineNumber: 57, content: "  activePath: string | null;" },
      { type: "removed", oldLineNumber: 61, content: "  themeType: ThemeType;" },
      { type: "added", newLineNumber: 58, content: "  // Theme is locked to dark mode for zero-flicker dither rendering" },
      { type: "added", newLineNumber: 59, content: "  mode?: 'dither' | 'solid';" },
      { type: "context", oldLineNumber: 58, newLineNumber: 60, content: "  onSelect: (path: string) => void;" },
      { type: "context", oldLineNumber: 59, newLineNumber: 61, content: "}) {" },
      { type: "context", oldLineNumber: 60, newLineNumber: 62, content: "  const containerRef = useRef<HTMLDivElement | null>(null);" },
      { type: "context", oldLineNumber: 61, newLineNumber: 63, content: "  const treeRef = useRef<FileTree | null>(null);" },
    ],
  },
];

export const DEFAULT_DIFF_FILES: DiffFile[] = [
  {
    path: "apps/docs/app/(diffs)/_home/AgentUi.tsx",
    status: "modified",
    additions: 10,
    deletions: 22,
    hunks: DEFAULT_DIFF_HUNKS,
  },
];

/**
 * Lightweight token syntax renderer for TypeScript/JavaScript code lines
 */
function highlightCode(line: string) {
  if (line.trim().startsWith("//") || line.trim().startsWith("/*")) {
    return <span class="text-zinc-500 italic">{line}</span>;
  }

  const parts = line.split(
    /\b(export|type|function|const|let|var|return|import|from|interface|null|true|false)\b/g,
  );

  return (
    <>
      <For each={parts}>
        {(part) => {
          if (
            ["export", "type", "function", "const", "let", "var", "return", "import", "from", "interface"].includes(
              part,
            )
          ) {
            return <span class="text-[#ff7b72] font-medium">{part}</span>;
          }
          if (["null", "true", "false"].includes(part)) {
            return <span class="text-[#79c0ff]">{part}</span>;
          }
          if (part.includes("'") || part.includes('"') || part.includes("`")) {
            return <span class="text-[#a5d6ff]">{part}</span>;
          }
          return <span>{part}</span>;
        }}
      </For>
    </>
  );
}

export function DitherDiff(rawProps: DitherDiffProps) {
  const props = mergeProps(
    {
      cell: 2,
      matrix: "bayer4" as DitherMatrix,
      expandAll: false,
      maxHeight: "560px",
    },
    rawProps,
  );

  const [local, divProps] = splitProps(props, [
    "hunks",
    "file",
    "files",
    "cell",
    "matrix",
    "expandAll",
    "maxHeight",
    "class",
  ]);

  const [collapsedHunks, setCollapsedHunks] = createSignal<Record<string, boolean>>({});

  const hunks = createMemo<DiffHunk[]>(() => {
    if (local.hunks && local.hunks.length > 0) return local.hunks;
    if (local.file?.hunks && local.file.hunks.length > 0) return local.file.hunks;
    if (local.files && local.files[0]?.hunks) return local.files[0].hunks;
    return DEFAULT_DIFF_HUNKS;
  });

  const toggleHunk = (hunkId: string) => {
    setCollapsedHunks((prev) => ({
      ...prev,
      [hunkId]: prev[hunkId] !== undefined ? !prev[hunkId] : false,
    }));
  };

  const isHunkCollapsed = (hunk: DiffHunk): boolean => {
    if (local.expandAll) return false;
    if (collapsedHunks()[hunk.id] !== undefined) {
      return collapsedHunks()[hunk.id];
    }
    return Boolean(hunk.collapsed);
  };

  const step = () => Math.max(1, Math.round(local.cell));

  // Gutter sidebar: authentic diagonal hatched lines texture for removed lines
  const gutterRemovedHatchedStyle = createMemo(() =>
    fillStyle("hatched", {
      cell: step(),
      color: "red",
    }),
  );

  // Gutter sidebar: authentic Bayer matrix dither gradient for added lines.
  // Smoothly tapers from dense matrix on the left to sparser, thinner dots near the plus sign.
  const gutterAddedDitherStyle = createMemo(() =>
    fillStyle("gradient", {
      cell: step(),
      color: "green",
      edge: "left",
      from: 0.60,
      length: 34,
      matrix: local.matrix,
      to: 0.18,
    }),
  );

  const renderLine = (line: DiffLine) => {
    const isRemoved = () => line.type === "removed";
    const isAdded = () => line.type === "added";

    return (
      <div
        class={cn(
          "group/line relative flex items-center min-w-full font-mono text-[12px] leading-[22px]",
          isRemoved() && "bg-red-500/[0.07] text-red-200",
          isAdded() && "bg-emerald-500/[0.07] text-emerald-200",
          line.type === "context" && "text-zinc-300 hover:bg-white/[0.03]",
        )}
      >
        {/* 2px Solid Left Edge Marker */}
        <Show when={isRemoved()}>
          <div class="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-red-500" />
        </Show>
        <Show when={isAdded()}>
          <div class="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-emerald-500" />
        </Show>

        {/* =========================================================
            GUTTER SIDEBAR: The dedicated dithered edge column
            - For removed: authentic red hatched scanlines
            - For added: authentic Bayer 4x4 dither gradient
            - 80%+ end mask: fades texture dark behind the + and - signs
           ========================================================= */}
        <div class="relative z-10 flex shrink-0 select-none border-r border-white/[0.08] bg-black/70 text-zinc-500 overflow-hidden">
          {/* Removed: Gutter Hatched Texture with end fade mask */}
          <Show when={isRemoved()}>
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 opacity-35"
              style={{
                ...gutterRemovedHatchedStyle(),
                "mask-image": "linear-gradient(to right, black 0%, black 65%, transparent 92%)",
                "-webkit-mask-image": "linear-gradient(to right, black 0%, black 65%, transparent 92%)",
              }}
            />
          </Show>

          {/* Added: Gutter Bayer Dither Texture with end fade mask */}
          <Show when={isAdded()}>
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 opacity-45"
              style={{
                ...gutterAddedDitherStyle(),
                "mask-image": "linear-gradient(to right, black 0%, black 50%, transparent 88%)",
                "-webkit-mask-image": "linear-gradient(to right, black 0%, black 50%, transparent 88%)",
              }}
            />
          </Show>

          {/* Dark End Mask: ensures the sign column is smoothly shaded dark */}
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-r from-transparent via-black/60 to-black/95 z-[15]"
          />

          {/* Old Line # */}
          <span
            class={cn(
              "relative z-10 w-11 text-right pr-2.5 font-mono text-[11px]",
              isRemoved() ? "text-red-400 font-semibold" : "text-zinc-600",
            )}
          >
            {line.oldLineNumber ?? ""}
          </span>

          {/* New Line # */}
          <span
            class={cn(
              "relative z-10 w-11 text-right pr-2.5 font-mono text-[11px]",
              isAdded() ? "text-emerald-400 font-semibold" : "text-zinc-600",
            )}
          >
            {line.newLineNumber ?? ""}
          </span>

          {/* Sign (+ / -): Elevated on z-20 on top of the dark end mask for maximum visibility */}
          <span
            class={cn(
              "relative z-20 w-6 flex items-center justify-center text-center font-mono text-[13px] font-extrabold select-none",
              isRemoved() && "text-red-300 drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]",
              isAdded() && "text-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]",
              line.type === "context" && "text-transparent",
            )}
          >
            {isRemoved() ? "-" : isAdded() ? "+" : " "}
          </span>
        </div>

        {/* Code Content: 100% Crisp, OLED Black Readability */}
        <div class="relative z-10 flex-1 px-3.5 whitespace-pre select-text overflow-x-hidden">
          {highlightCode(line.content)}
        </div>
      </div>
    );
  };

  return (
    <div
      {...divProps}
      data-dither-diff="true"
      class={cn(
        "relative flex w-full flex-col overflow-hidden rounded-xl bg-black text-zinc-100",
        "border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.7)] font-mono text-xs select-none",
        local.class,
      )}
      style={{
        "max-height": typeof local.maxHeight === "number" ? `${local.maxHeight}px` : local.maxHeight,
      }}
    >
      {/* =========================================================================
          PURE CODE DIFF BLOCK: Gutter Sidebar + OLED Code Lines
         ========================================================================= */}
      <div class="flex-1 overflow-y-auto overflow-x-auto bg-black leading-5">
        <For each={hunks()}>
          {(hunk) => (
            <div class="flex flex-col">
              {/* Collapsible Unmodified Context Banner */}
              <Show when={hunk.unmodifiedCount !== undefined}>
                <button
                  type="button"
                  onClick={() => toggleHunk(hunk.id)}
                  class={cn(
                    "group flex w-full items-center gap-2 border-y border-white/[0.06] bg-[#09090c] px-4 py-1.5 text-xs text-zinc-400",
                    "transition-colors hover:bg-[#121216] hover:text-zinc-200 cursor-pointer select-none",
                  )}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    class={cn(
                      "size-3 text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300",
                      isHunkCollapsed(hunk) ? "rotate-0" : "rotate-180",
                    )}
                  >
                    <path d="M4 6l4-4 4 4M4 10l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span class="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200">
                    {isHunkCollapsed(hunk)
                      ? hunk.header
                      : `Hide ${hunk.unmodifiedCount} unmodified lines`}
                  </span>
                </button>

                {/* Expanded Unmodified Gap Lines when toggled */}
                <Show when={!isHunkCollapsed(hunk) && hunk.unmodifiedLines}>
                  <For each={hunk.unmodifiedLines}>
                    {(line) => renderLine(line)}
                  </For>
                </Show>
              </Show>

              {/* Diff Lines Table */}
              <div class="flex flex-col">
                <For each={hunk.lines}>
                  {(line) => renderLine(line)}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default DitherDiff;
