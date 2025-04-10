import { ipcMain } from 'electron'
import { aiAssist } from './ai'
import { Poetry } from '../poetry/types'
import { aiDB } from './db'
import { ModelConfig } from './types'

export function setupAIIPC() {
  ipcMain.handle('ai-analyze-poetry', (_event, poetry: Poetry) => {
    return aiAssist.analyzePoetry(poetry)
  })

  // 模型配置
  ipcMain.handle('ai-add-model-config', (_event, config: ModelConfig) => {
    return aiDB.addModelConfig(config)
  })

  ipcMain.handle('ai-update-model-config', (_event, id: number, config: Partial<ModelConfig>) => {
    return aiDB.updateModelConfig(id, config)
  })

  ipcMain.handle('ai-get-all-model-configs', () => {
    return aiDB.getAllModelConfigs()
  })

  ipcMain.handle('ai-get-model-config-by-id', (_event, id: number) => {
    return aiDB.getModelConfigById(id)
  })

  ipcMain.handle('ai-get-model-config-by-name', (_event, name: string) => {
    return aiDB.getModelConfigByName(name)
  })

  ipcMain.handle('ai-get-default-model-config', () => {
    return aiDB.getDefaultModelConfig()
  })

  ipcMain.handle('ai-delete-model-config', (_event, id: number) => {
    return aiDB.deleteModelConfig(id)
  })
}
