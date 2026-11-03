import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getSystemDrives: () => ipcRenderer.invoke('system:getDrives'),
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
  copyPath: (srcPath: string, destPath: string) => ipcRenderer.invoke('fs:copy', srcPath, destPath),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  openPath: (fullPath: string) => ipcRenderer.invoke('shell:openPath', fullPath),
  isGhosttyInstalled: () => ipcRenderer.invoke('terminal:isGhosttyInstalled'),
  openGhostty: (dirPath?: string) => ipcRenderer.invoke('terminal:openGhostty', dirPath),
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
  onTerminalData: (callback: (id: number, data: string) => void) => {
    const listener = (_: unknown, id: number, data: string): void => callback(id, data)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },
  onTerminalExit: (callback: (id: number, exitCode: number) => void) => {
    const listener = (_: unknown, id: number, exitCode: number): void => callback(id, exitCode)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
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
