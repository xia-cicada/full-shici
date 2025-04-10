import { ipcMain } from 'electron'
import { aiAssist } from './ai'
import { Poetry } from '../poetry/types'

export function setupAIIPC() {
  ipcMain.handle('ai-analyze-poetry', (_event, poetry: Poetry) => {
    return aiAssist.analyzePoetry(poetry)
  })
}
