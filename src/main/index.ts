import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupPoetryDatabaseIPC } from './poetry/ipc'
import { poetryDB } from './poetry/db'
import { setupAIIPC } from './ai/ipc'
import { setupInteractionDatabaseIPC } from './interaction/ipc'
import { userData } from './userData/db'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 通知渲染进程窗口状态变化
  win.on('maximize', () => {
    win.webContents.send('window-maximized')
  })

  win.on('unmaximize', () => {
    win.webContents.send('window-unmaximized')
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function registerWindowControls() {
  // 窗口操作作用于当前聚焦窗口；无聚焦窗口时回退到主窗口
  const getTargetWindow = () => BrowserWindow.getFocusedWindow() ?? mainWindow

  ipcMain.handle('window-minimize', () => {
    getTargetWindow()?.minimize()
  })

  ipcMain.handle('window-toggle-maximize', () => {
    const win = getTargetWindow()
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    getTargetWindow()?.close()
  })

  // 重新启动应用（如放置好诗词数据库后使其生效）
  ipcMain.handle('app-relaunch', () => {
    app.relaunch()
    app.quit()
  })
}

// 单实例锁：避免两个实例并发写用户数据库
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  // 第二个实例启动时，聚焦已有窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    setupPoetryDatabaseIPC()
    setupInteractionDatabaseIPC()
    setupAIIPC()

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.lotus.fullshici')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    mainWindow = createWindow()
    registerWindowControls()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
      }
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    poetryDB.close()
    userData.close()
  })
}
