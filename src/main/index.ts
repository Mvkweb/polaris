import { app, BrowserWindow, ipcMain, Menu, nativeTheme, protocol, shell } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import type { StartupFolder } from '../shared/startup'
import { emberCore } from './core/EmberCore'
import { registerDrivesIpc, startDriveMonitoring, stopDriveMonitoring } from './drives'
import { registerEditorIpc } from './editors'
import { registerOpenWithIpc } from './openWith'
import { registerFileDetailsIpc } from './fileDetails'
import { registerFilesystemIpc } from './filesystem'
import { registerGitIpc } from './git'
import { INSTALLED, setupInstance, startDir, getStartupLocation, type OpenRequest } from './launch'
import { MEDIA_SCHEME_PRIVILEGES, registerMediaIpc, registerMediaProtocol } from './media'
import { registerProjectIconIpc } from './projectIcons'
import { registerSearchIpc } from './search'
import { loadTasks, registerTaskIpc } from './tasks'
import { registerTerminalHandlers, registerExternalTerminalIpc, killAllTerminals } from './terminal'
import { registerThemeIpc } from './theme'
import { registerMatugenSetupIpc } from './matugenSetup'
import { registerUpdateIpc } from './updates'
import { registerUploadIpc } from './uploads'
import { registerArchiveIpc } from './archive'

Menu.setApplicationMenu(null)

// Match the installed desktop entry so Wayland docks and X11 taskbars can
// resolve the app icon and group its windows. Must run before app is ready.
if (process.platform === 'linux') app.setDesktopName('io.github.mvkweb.Polaris.desktop')

protocol.registerSchemesAsPrivileged([MEDIA_SCHEME_PRIVILEGES])

// Installed builds: one window. A second `polaris-fm <path>` hands its path to
// the running window (new tab) and exits right away.
const openInWindow = (req: OpenRequest | null): void => {
  if (!req) return
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('app:open', req)
  }
}
if (!setupInstance(openInWindow)) app.exit(0)

// From the repo `is.dev` is the electron-vite dev server; an installed package
// runs on the system Electron (unpackaged in Electron's eyes) but is a release.
const isDev = is.dev && !INSTALLED
// Force Chromium and GTK into dark mode globally to prevent light native widget/scrollbar flashes on Linux
app.commandLine.appendSwitch('force-dark-mode')

// Let Electron pick Wayland or X11. Forcing Wayland breaks X11 sessions.
nativeTheme.themeSource = 'dark'

function createWindow(): void {
  startDriveMonitoring()
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 860,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: !isDev
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.ember.ide')
  nativeTheme.themeSource = 'dark'

  registerMediaProtocol()
  registerMediaIpc()
  registerProjectIconIpc()
  registerTaskIpc()
  registerUploadIpc()
  registerUpdateIpc()
  void loadTasks()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:platform', () => process.platform)
  ipcMain.handle('app:startup', (_, preference: StartupFolder, lastFolder: string | null) =>
    getStartupLocation(preference, lastFolder)
  )

  registerTerminalHandlers()
  emberCore.start()
  // Quick-open index for a project folder. Never walk all of $HOME or / on
  // startup (the installed app starts in home); those index on demand.
  if (startDir !== homedir() && startDir !== '/') {
    emberCore.index(startDir).catch((err) => {
      console.warn('[EmberCore] Initial indexing warning:', err)
    })
  }

  app.on('before-quit', () => {
    emberCore.stop()
    killAllTerminals()
    stopDriveMonitoring()
  })

  registerFilesystemIpc()
  registerExternalTerminalIpc()
  registerThemeIpc()
  registerMatugenSetupIpc()
  registerEditorIpc()
  registerOpenWithIpc()
  registerFileDetailsIpc()
  registerSearchIpc()
  registerGitIpc()
  registerDrivesIpc()
  registerArchiveIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
