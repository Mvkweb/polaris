import { ElectronAPI } from '@electron-toolkit/preload'

export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  extension?: string
  size?: number
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

export interface TextSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  maxResults?: number
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

export interface MountDriveResult {
  ok: boolean
  mountPoint?: string
  error?: string
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
  size: number
  createdTime: number
  modifiedTime: number
  accessedTime: number
  permissions: string
  owner?: string
  group?: string
  itemCount?: number
}

export interface CustomAPI {
  getAppVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  getSystemDrives: () => Promise<SystemDrive[]>
  mountDrive: (devicePath: string) => Promise<MountDriveResult>
  getUserPlaces: () => Promise<{
    home: string
    documents?: string
    downloads?: string
    music?: string
    pictures?: string
    videos?: string
    trash?: string
  }>
  getStorageBreakdown: (targetPath?: string) => Promise<any>
  getWorkspaceRoot: () => Promise<string>
  getCoreStatus: () => Promise<{ available: boolean; running: boolean }>
  readDirectory: (dirPath?: string) => Promise<FsEntry[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  createDirectory: (dirPath: string) => Promise<boolean>
  renamePath: (oldPath: string, newPath: string) => Promise<boolean>
  trashPath: (itemPath: string) => Promise<boolean>
  copyPath: (srcPath: string, destPath: string) => Promise<boolean>
  showItemInFolder: (fullPath: string) => Promise<boolean>
  openPath: (fullPath: string) => Promise<boolean>
  isGhosttyInstalled: () => Promise<boolean>
  openGhostty: (dirPath?: string) => Promise<boolean>
  isCodeInstalled: () => Promise<boolean>
  openCode: (targetPath: string) => Promise<boolean>
  listEditors: () => Promise<ExternalEditor[]>
  openInEditor: (editorId: string, targetPath: string) => Promise<boolean>
  getFileProperties: (fullPath: string) => Promise<FileProperties>
  readImage: (filePath: string) => Promise<ImageFileData>
  indexWorkspace: (rootPath?: string) => Promise<{ indexed_count: number; elapsed_ms: number }>
  searchFiles: (query: string) => Promise<SearchResult[]>
  searchText: (query: string, options?: TextSearchOptions) => Promise<TextSearchResult>
  gitGetLog: (repoPath?: string, maxCount?: number) => Promise<GitCommit[]>
  gitGetStatus: (repoPath?: string) => Promise<GitStatus>
  gitGetCommitDiff: (hash: string, repoPath?: string) => Promise<string>
  terminalCreate: (cwd?: string, cols?: number, rows?: number) => Promise<number>
  terminalWrite: (id: number, data: string) => Promise<void>
  terminalResize: (id: number, cols: number, rows: number) => Promise<void>
  terminalKill: (id: number) => Promise<void>
  getWallpaperTheme: () => Promise<WallpaperPalette | null>
  getWallpaperThemePath: () => Promise<string>
  onWallpaperTheme: (callback: (theme: WallpaperPalette | null) => void) => () => void
  onTerminalData: (callback: (id: number, data: string) => void) => () => void
  onTerminalExit: (callback: (id: number, exitCode: number) => void) => () => void
  onDrivesChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
