import { ElectronAPI } from '@electron-toolkit/preload'
import type { StartupFolder, StartupLocation } from '../shared/startup'
import type {
  ChosenOpenResult,
  DefaultOpenOptions,
  DefaultOpenResult,
  OpenWithInfo
} from '../shared/openWith'
import type {
  ExternalEditor,
  GitCommit,
  GitStatus,
  ImageFileData,
  SearchResult,
  SystemDrive,
  TaskRecord,
  TextSearchOptions,
  TextSearchResult,
  UpdateInfo,
  UploadService,
  WallpaperPalette
} from '../shared/ipcModels'

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
  TextSearchOptions,
  TextSearchResult,
  UpdateCommit,
  UpdateInfo,
  UploadService,
  WallpaperPalette
} from '../shared/ipcModels'

export interface FsEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  extension?: string
  size?: number
}

export interface MountDriveResult {
  ok: boolean
  mountPoint?: string
  error?: string
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
  /** 'editor' when a text/code file should open in Polaris (setting or per-type choice) */
  openDefaultFile: (path: string, opts?: DefaultOpenOptions) => Promise<DefaultOpenResult>
  inspectOpenWith: (path: string) => Promise<OpenWithInfo>
  /** data: URL of an app's icon from its desktop entry, or null */
  getAppIcon: (appId: string) => Promise<string | null>
  openWithApp: (path: string, appId: string, makeDefaultFor?: string) => Promise<ChosenOpenResult>
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
  /** read-only status for Settings: is matugen set up for Polaris? */
  getThemeSetup: () => Promise<import('../shared/ipcModels').ThemeSetupStatus>
  /** Explicit "Set it up for me": safely add Polaris's template to matugen's config */
  addMatugenTemplate: () => Promise<import('../shared/ipcModels').MatugenSetupResult>
  /** Pick an image and write Polaris's palette from it (Polaris-only matugen run) */
  generateThemeFromImage: () => Promise<boolean>
  /** Write an image studio export as a new file beside the source; resolves to its path. */
  exportImage: (sourcePath: string, stem: string, ext: string, bytes: Uint8Array) => Promise<string>
  /** Project icon (favicon/logo) per folder, null when none */
  projectIcons: (dirs: string[]) => Promise<Record<string, string | null>>
  uploadServices: () => Promise<UploadService[]>
  /** Queue uploads; resolves to the new task ids */
  startUpload: (paths: string[], serviceId: string) => Promise<string[]>
  getUpdateInfo: () => Promise<UpdateInfo>
  checkForUpdates: () => Promise<UpdateInfo>
  onUpdateInfo: (callback: (info: UpdateInfo) => void) => () => void
  restartToUpdate: () => Promise<void>
  getStartupLocation: (
    preference: StartupFolder,
    lastFolder: string | null
  ) => Promise<StartupLocation>
  onOpenRequest: (callback: (req: { dir: string; reveal: string | null }) => void) => () => void
  listTasks: () => Promise<TaskRecord[]>
  cancelTask: (id: string) => Promise<boolean>
  removeTask: (id: string) => Promise<boolean>
  clearTasks: () => Promise<boolean>
  onTasksChanged: (callback: (tasks: TaskRecord[]) => void) => () => void
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
