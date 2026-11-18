export type {
  ExternalEditor,
  GitCommit,
  GitStatus,
  ImageFileData,
  SearchResult,
  SystemDrive,
  TaskRecord,
  TaskStatus,
  TextMatch,
  TextSearchResult,
  UpdateCommit,
  UpdateInfo,
  UploadService,
  WallpaperPalette
} from '../../shared/ipcModels'

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

export interface WallpaperTheme {
  primary: string
  primary_container: string
  thumbnail_path: string
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
