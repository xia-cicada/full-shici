import { contextBridge, ipcRenderer } from 'electron'
import { ExposedApi } from './types'

// Custom APIs for renderer
const electronAPI: ExposedApi = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  onMaximized: (fn: Function) => {
    ipcRenderer.on('window-maximized', () => {
      fn()
    })
  },
  onUnmaximized: (fn: Function) => {
    ipcRenderer.on('window-unmaximized', () => {
      fn()
    })
  },

  // 数据库方法
  db: {
    getAllCategories: () => ipcRenderer.invoke('db-get-all-categories'),
    getCategoryById: (id) => ipcRenderer.invoke('db-get-category', id),

    // 诗词相关
    getPoetryCount: (options) => ipcRenderer.invoke('db-get-poetry-count', options),
    getPoetryList: (options) => ipcRenderer.invoke('db-get-poetry-list', options),
    getPoetryById: (id) => ipcRenderer.invoke('db-get-poetry-by-id', id),
    getRandomPoetry: (count) => ipcRenderer.invoke('db-get-random-poetry', count),

    // 搜索相关
    searchPoetry: (keyword, limit) => ipcRenderer.invoke('db-search', keyword, limit),

    // 元数据相关
    getAllAuthors: () => ipcRenderer.invoke('db-get-all-authors'),
    getAllRhythmics: () => ipcRenderer.invoke('db-get-all-rhythmics'),

    // 添加新诗词
    addPoetry: (poetry) => ipcRenderer.invoke('db-add-poetry', poetry)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
