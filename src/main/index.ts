import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupPoetryDatabaseIPC } from './db/ipc'
import { poetryDB } from './db/db'

enum WINDOW_TYPE {
  'desktop',
  'mobile'
}

let desktopWindow: BrowserWindow
function createWindow(type: WINDOW_TYPE): BrowserWindow {
  // Create the browser window.
  const isDesktop = type === WINDOW_TYPE.desktop
  const mainWindow = new BrowserWindow({
    width: isDesktop ? 900 : 900, // 之后适配移动端样式
    height: isDesktop ? 670 : 670,
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

  if (isDesktop) {
    mainWindow.setPosition(20, 20)
  } else {
    mainWindow.setPosition(700, 20)
  }

  mainWindow.on('ready-to-show', () => {
    console.log('ready to show', type)
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 通知渲染进程窗口状态变化
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized')
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**同时创建桌面端窗口和移动端窗口，方便调试 */
function createWindows() {
  desktopWindow = createWindow(WINDOW_TYPE.desktop)

  const getActiveWindow = () => {
    return BrowserWindow.getFocusedWindow()!
  }

  // 窗口操作
  ipcMain.handle('window-minimize', () => {
    const activeWindow = getActiveWindow()
    activeWindow.minimize()
  })

  ipcMain.handle('window-toggle-maximize', () => {
    const activeWindow = getActiveWindow()
    if (activeWindow.isMaximized()) {
      activeWindow.unmaximize()
    } else {
      activeWindow.maximize()
    }
  })

  ipcMain.handle('window-close', () => {
    const activeWindow = getActiveWindow()
    activeWindow.close()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  setupPoetryDatabaseIPC()
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindows()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindows()
  })

  app.on('before-quit', () => {
    poetryDB.close()
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
