import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { StartupFolder } from '../shared/startup'

const api = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  openDefaultFile: (path: string, opts?: unknown) =>
    ipcRenderer.invoke('apps:openDefault', path, opts),
  inspectOpenWith: (path: string) => ipcRenderer.invoke('apps:inspectFile', path),
  getAppIcon: (appId: string) => ipcRenderer.invoke('apps:icon', appId),
  openWithApp: (path: string, appId: string, makeDefaultFor?: string) =>
    ipcRenderer.invoke('apps:openChosen', path, appId, makeDefaultFor),
  getSystemDrives: () => ipcRenderer.invoke('system:getDrives'),
  mountDrive: (devicePath: string) => ipcRenderer.invoke('system:mountDrive', devicePath),
  getUserPlaces: () => ipcRenderer.invoke('system:getUserPlaces'),
  getStorageBreakdown: (targetPath?: string) =>
    ipcRenderer.invoke('system:getStorageBreakdown', targetPath),
  getWorkspaceRoot: () => ipcRenderer.invoke('fs:getWorkspaceRoot'),
  getCoreStatus: () => ipcRenderer.invoke('core:status'),
  readDirectory: (dirPath?: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  renamePath: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('fs:rename', oldPath, newPath),
  trashPath: (itemPath: string) => ipcRenderer.invoke('fs:trash', itemPath),
  copyPath: (srcPath: string, destPath: string, opts?: { dereference?: boolean }) =>
    ipcRenderer.invoke('fs:copy', srcPath, destPath, opts),
  createSymlink: (target: string, dir: string, opts?: { name?: string; absolute?: boolean }) =>
    ipcRenderer.invoke('fs:createSymlink', target, dir, opts),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  openPath: (fullPath: string) => ipcRenderer.invoke('shell:openPath', fullPath),
  isGhosttyInstalled: () => ipcRenderer.invoke('terminal:isGhosttyInstalled'),
  openGhostty: (dirPath?: string) => ipcRenderer.invoke('terminal:openGhostty', dirPath),
  isCodeInstalled: () => ipcRenderer.invoke('editor:isCodeInstalled'),
  openCode: (targetPath: string) => ipcRenderer.invoke('editor:openCode', targetPath),
  listEditors: () => ipcRenderer.invoke('editor:list'),
  openInEditor: (editorId: string, targetPath: string) =>
    ipcRenderer.invoke('editor:open', editorId, targetPath),
  getFileProperties: (fullPath: string) => ipcRenderer.invoke('fs:getFileProperties', fullPath),
  readImage: (filePath: string) => ipcRenderer.invoke('fs:readImage', filePath),
  indexWorkspace: (rootPath?: string) => ipcRenderer.invoke('fs:indexWorkspace', rootPath),
  searchFiles: (query: string) => ipcRenderer.invoke('fs:searchFiles', query),
  searchText: (query: string, options?: any) => ipcRenderer.invoke('fs:searchText', query, options),
  gitGetLog: (repoPath?: string, maxCount?: number) =>
    ipcRenderer.invoke('git:getLog', repoPath, maxCount),
  gitGetStatus: (repoPath?: string) => ipcRenderer.invoke('git:getStatus', repoPath),
  gitGetCommitDiff: (hash: string, repoPath?: string) =>
    ipcRenderer.invoke('git:getCommitDiff', hash, repoPath),
  terminalCreate: (cwd?: string, cols?: number, rows?: number) =>
    ipcRenderer.invoke('terminal:create', cwd, cols, rows),
  terminalWrite: (id: number, data: string) => ipcRenderer.invoke('terminal:write', id, data),
  terminalResize: (id: number, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', id, cols, rows),
  terminalKill: (id: number) => ipcRenderer.invoke('terminal:kill', id),
  getWallpaperTheme: () => ipcRenderer.invoke('theme:get'),
  getWallpaperThemePath: () => ipcRenderer.invoke('theme:path'),
  exportImage: (sourcePath: string, stem: string, ext: string, bytes: Uint8Array) =>
    ipcRenderer.invoke('media:exportImage', sourcePath, stem, ext, bytes),
  projectIcons: (dirs: string[]) => ipcRenderer.invoke('fs:projectIcons', dirs),
  uploadServices: () => ipcRenderer.invoke('upload:services'),
  startUpload: (paths: string[], serviceId: string) =>
    ipcRenderer.invoke('upload:start', paths, serviceId),
  getUpdateInfo: () => ipcRenderer.invoke('updates:get'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  onUpdateInfo: (callback: (info: unknown) => void) => {
    const listener = (_: unknown, info: unknown): void => callback(info)
    ipcRenderer.on('updates:changed', listener)
    return () => ipcRenderer.removeListener('updates:changed', listener)
  },
  restartToUpdate: () => ipcRenderer.invoke('updates:restart'),
  getStartupLocation: (preference: StartupFolder, lastFolder: string | null) =>
    ipcRenderer.invoke('app:startup', preference, lastFolder),
  /** Another `polaris-fm <path>` launch: open that folder in a new tab. */
  onOpenRequest: (callback: (req: unknown) => void) => {
    const listener = (_: unknown, req: unknown): void => callback(req)
    ipcRenderer.on('app:open', listener)
    return () => ipcRenderer.removeListener('app:open', listener)
  },
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  cancelTask: (id: string) => ipcRenderer.invoke('tasks:cancel', id),
  removeTask: (id: string) => ipcRenderer.invoke('tasks:remove', id),
  clearTasks: () => ipcRenderer.invoke('tasks:clear'),
  onTasksChanged: (callback: (tasks: unknown[]) => void) => {
    const listener = (_: unknown, tasks: unknown[]): void => callback(tasks)
    ipcRenderer.on('tasks:changed', listener)
    return () => ipcRenderer.removeListener('tasks:changed', listener)
  },
  onWallpaperTheme: (callback: (theme: unknown) => void) => {
    const listener = (_: unknown, theme: unknown): void => callback(theme)
    ipcRenderer.on('theme:changed', listener)
    return () => ipcRenderer.removeListener('theme:changed', listener)
  },
  onTerminalData: (callback: (id: number, data: string) => void) => {
    const listener = (_: unknown, id: number, data: string): void => callback(id, data)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },
  onTerminalExit: (callback: (id: number, exitCode: number) => void) => {
    const listener = (_: unknown, id: number, exitCode: number): void => callback(id, exitCode)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  },
  onDrivesChanged: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('system:drivesChanged', listener)
    return () => ipcRenderer.removeListener('system:drivesChanged', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (fallback without isolation)
  window.electron = electronAPI
  // @ts-ignore (fallback without isolation)
  window.api = api
}
