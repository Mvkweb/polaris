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

export interface FileProperties {
  path: string
  name: string
  isDirectory: boolean
  isFile: boolean
  isSymbolicLink: boolean
  size: number
  createdTime: number
  modifiedTime: number
  accessedTime: number
  permissions: string
  owner?: string
  group?: string
  itemCount?: number
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
