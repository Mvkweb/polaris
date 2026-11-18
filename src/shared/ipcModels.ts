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

/** Palette read from the external wallpaper theme generator. */
export interface WallpaperPalette {
  primary: string
  onPrimary: string
  primaryContainer: string
  tertiary: string
}

/** An external code editor detected on the host. Serialized over IPC. */
export interface ExternalEditor {
  id: string
  name: string
  /** Icon data URL, or null if no icon was found. */
  icon: string | null
}

/** File host shown in the Upload to menu. */
export interface UploadService {
  id: string
  name: string
  /** short retention label shown in menus */
  retention: string
  maxBytes: number
  group: 'permanent' | 'temporary'
}

export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'canceled'

export interface TaskRecord {
  id: string
  kind: 'upload'
  /** producer-specific id, e.g. the upload service (used for Retry) */
  serviceId: string
  fileName: string
  filePath: string
  /** destination label, e.g. "Litterbox · 1 hour" */
  target: string
  status: TaskStatus
  sent: number
  total: number
  url?: string
  error?: string
  /** epoch ms when the uploaded file stops existing, if the host says so */
  expiresAt?: number
  createdAt: number
  startedAt?: number
  finishedAt?: number
}

export interface UpdateCommit {
  hash: string
  subject: string
  author: string
  /** epoch ms */
  date: number
}

export interface UpdateInfo {
  version: string
  /** git: running from a checkout · package: installed polaris-fm-git */
  source: 'git' | 'package' | 'none'
  branch: string | null
  current: UpdateCommit | null
  available: boolean
  /** commits behind; -1 when unknown (packages only know "different") */
  behind: number
  /** newest first, at most 8 */
  commits: UpdateCommit[]
  /** github.com/<owner>/<repo>/compare/<a>...<b> when known */
  compareUrl: string | null
  checking: boolean
  checkedAt: number | null
  error: string | null
  /** shell command the Update button runs in Polaris's terminal */
  updateCommand: string | null
  /** a newer package is installed on disk: restart to use it */
  restartReady: boolean
}

/** What Settings shows about wallpaper sync (read-only checks, nothing is changed). */
export interface ThemeSetupStatus {
  /** a valid palette was found (matugen or dithergen) */
  found: boolean
  /** the palette file Polaris reads (matugen writes it) */
  outputPath: string
  /** the matugen template Polaris ships */
  templatePath: string
  /** `matugen` is on PATH */
  matugenInstalled: boolean
  /** matugen's config mentions Polaris's output file */
  matugenConfigured: boolean
}
