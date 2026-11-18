import type { ChatSessionSummary, FileNode } from '../types'

// Sample data used by the sidebar's local chat and notes prototypes.
export const initialChatSessions: ChatSessionSummary[] = [
  {
    id: 'session-1',
    title: 'Grimmoire Sidebar Refactor',
    modelId: 'gemini-2.5-flash',
    modelName: 'Gemini 2.5 Flash',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now() - 1000 * 60 * 3,
    createdAt: Date.now() - 1000 * 60 * 60,
    preview: 'Converted settled rows to compact cards with expandable hover previews.',
    fileRefs: ['Sidebar.tsx', 'globals.css'],
    messageCount: 12
  },
  {
    id: 'session-2',
    title: 'OpenCode Daemon Integration',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 25,
    createdAt: Date.now() - 1000 * 60 * 90,
    preview: 'Implemented persistent WebSocket RPC streaming for background agent executions.',
    fileRefs: ['opencode.ts', 'client.ts'],
    messageCount: 18
  },
  {
    id: 'session-3',
    title: 'Dynamic Wallpaper Theme Extraction',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    modelIcon: 'openai',
    provider: 'OpenAI',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    preview: 'Material Dynamic Colors extraction from desktop wallpaper with smooth fallback.',
    fileRefs: ['theme.ts', 'theme.css'],
    messageCount: 8
  },
  {
    id: 'session-4',
    title: 'Bracket Pair Colorizer & CodeMirror 6',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    preview: 'Bracket & tag pair matching, wallpaper syntax theme, and macos autosave fix.',
    fileRefs: ['Editor.tsx', 'bracketMatching.ts'],
    messageCount: 14
  },
  {
    id: 'session-5',
    title: 'Vite 8 & Tailwind v4 Migration',
    modelId: 'deepseek-r1',
    modelName: 'DeepSeek R1',
    modelIcon: 'deepseek',
    provider: 'DeepSeek',
    updatedAt: Date.now() - 1000 * 60 * 60 * 18,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    preview: 'Configured Vite 8, Tailwind v4 @theme variables, and Oxlint rules.',
    fileRefs: ['electron.vite.config.ts', 'package.json'],
    messageCount: 7
  },
  {
    id: 'session-6',
    title: 'LSP Diagnostics & Language Server Protocol',
    modelId: 'gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now() - 1000 * 60 * 60 * 28,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    preview: 'Connected rust-analyzer and vtsls over stdio IPC with debounced diagnostics.',
    fileRefs: ['lsp.ts', 'diagnostics.ts'],
    messageCount: 29
  },
  {
    id: 'session-7',
    title: 'Native Keybindings & Command Palette',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    modelIcon: 'openai',
    provider: 'OpenAI',
    updatedAt: Date.now() - 1000 * 60 * 60 * 52,
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    preview: 'Centralized keybinding registry with chord support and platform normalizer.',
    fileRefs: ['shortcuts.ts', 'CommandPalette.tsx'],
    messageCount: 11
  },
  {
    id: 'session-8',
    title: 'Multi-Tab Editor & Split Panes',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 60 * 80,
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
    preview: 'Mosaic layout engine with persistent tab groups and dragged tile docking.',
    fileRefs: ['Tabs.tsx', 'SplitPane.tsx'],
    messageCount: 22
  }
]

export const initialFiles: FileNode[] = [
  { name: 'journals', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 4 },
  { name: 'archive', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 24 },
  { name: 'Welcome.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 30 },
  {
    name: 'Architecture Overview.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 2
  },
  { name: 'Design Decisions.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 6 },
  { name: 'Oxlint Guidelines.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 12 },
  {
    name: 'Roadmap & Milestones.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 24
  },
  { name: 'Quick Notes.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 36 },
  { name: 'Ideas & Sketches.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 48 }
]
