export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  extension?: string
  size?: number
  modifiedTime?: number
}

export interface FileTreeNode extends FsEntry {
  children?: FileTreeNode[]
  isExpanded?: boolean
  isLoading?: boolean
}

export interface EditorTab {
  path: string
  name: string
  isDirty?: boolean
}

export interface ImageFileData {
  dataUrl: string
  size: number
  format: string
  isSvg?: boolean
  svgContent?: string
}

export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  timestamp: number
}

export interface GitStatus {
  branch: string
  clean: boolean
  modifiedCount: number
  files: string[]
}

export interface FileNode {
  name: string
  is_dir: boolean
  last_modified: number
}

export interface WallpaperPalette {
  primary: string
  onPrimary: string
  primaryContainer: string
  tertiary: string
}

export interface ExternalEditor {
  id: string
  name: string
  icon: string | null
}

export interface FileProperties {
  path: string
  name: string
  isDirectory: boolean
  isFile: boolean
  isSymbolicLink: boolean
  realPath?: string
  size: number
  createdTime: number
  modifiedTime: number
  accessedTime: number
  permissions: string
  owner?: string
  group?: string
  itemCount?: number
  extension?: string
  mime?: string
  volume?: string
  imageDimensions?: { width: number; height: number }
}

export interface SearchResult {
  name: string
  path: string
  relativePath: string
  score?: number
}

export interface TextMatch {
  file: string
  path: string
  line: number
  column: number
  line_text: string
}

export interface TextSearchResult {
  matches: TextMatch[]
  total_matches: number
  files_searched: number
  elapsed_ms: number
}

export interface WallpaperTheme {
  primary: string
  primary_container: string
  thumbnail_path: string
}

export interface SystemDrive {
  id: string
  name: string
  model: string
  mountPoint: string
  device: string
  fstype: string
  size: string
  diskSize?: string
  usedPercent: number
  bytesFree: number
  bytesTotal: number
  freeSpace: string
  isRemovable?: boolean
  isMounted: boolean
  isReadOnly: boolean
}

export interface ChatSessionSummary {
  id: string
  title: string
  modelId: string
  modelName: string
  modelIcon: string
  provider: string
  updatedAt: number
  createdAt: number
  messageCount?: number
  subpath?: string
  preview?: string
  fileRefs?: string[]
  agent?: string
}

/** Anonymous file host offered under "Upload to" (mirrors src/main/uploads.ts). */
export interface UploadService {
  id: string
  name: string
  retention: string
  maxBytes: number
  group: 'permanent' | 'temporary'
}

export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

/** Background task as broadcast by src/main/tasks.ts. */
export interface TaskRecord {
  id: string
  kind: 'upload'
  /** producer-specific id, e.g. the upload service (used for Retry) */
  serviceId: string
  fileName: string
  filePath: string
  target: string
  status: TaskStatus
  sent: number
  total: number
  url?: string
  error?: string
  expiresAt?: number
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

/** Git-based update status (mirrors src/main/updates.ts). */
export interface UpdateCommit {
  hash: string
  subject: string
  author: string
  date: number
}

export interface UpdateInfo {
  version: string
  source: 'git' | 'package' | 'none'
  branch: string | null
  current: UpdateCommit | null
  available: boolean
  behind: number
  commits: UpdateCommit[]
  compareUrl: string | null
  checking: boolean
  checkedAt: number | null
  error: string | null
  updateCommand: string | null
  restartReady: boolean
}
