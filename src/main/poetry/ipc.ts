import { ipcMain } from 'electron'
import { poetryDB } from './db'
import { Poetry, SearchOptions } from './types'

export function setupPoetryDatabaseIPC() {
  // 分类相关
  ipcMain.handle('db-get-all-categories', () => {
    return poetryDB.getAllCategories()
  })

  ipcMain.handle('db-get-category', (_event, id: number) => {
    return poetryDB.getCategoryById(id)
  })

  // 诗词相关
  ipcMain.handle('db-get-poetry-count', (_event, options?: SearchOptions) => {
    return poetryDB.getPoetryCount(options)
  })

  ipcMain.handle('db-get-poetry-list', (_event, options?: SearchOptions) => {
    return poetryDB.getPoetryList(options)
  })

  ipcMain.handle('db-get-poetry-by-id', (_event, id: number) => {
    return poetryDB.getPoetryById(id)
  })

  ipcMain.handle('db-get-random-poetry', (_event, count: number = 1) => {
    return poetryDB.getRandomPoetry(count)
  })

  // 搜索相关
  ipcMain.handle('db-search', (_event, keyword: string, options: SearchOptions) => {
    return poetryDB.searchPoetry(keyword, options)
  })

  // 元数据相关
  ipcMain.handle('db-get-all-authors', () => {
    return poetryDB.getAllAuthors()
  })

  ipcMain.handle('db-get-all-rhythmics', () => {
    return poetryDB.getAllRhythmics()
  })

  // 添加新诗词 (示例)
  ipcMain.handle(
    'db-add-poetry',
    (_event, poetry: Omit<Poetry, 'id' | 'created_at' | 'updated_at'>) => {
      return poetryDB.addPoetry(poetry)
    }
  )
}
