import { ipcMain } from 'electron'
import { poetryMaster } from './ai'
import { Poetry } from '../db/types'

export function setupAIIPC() {
  ipcMain.handle('ai-analyze-poetry', (_event, poetry: Poetry) => {
    return poetryMaster.analyzePoetry(poetry)
  })
}
