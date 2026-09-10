import type { ModelConfig } from './types'

/**默认使用DeepSeek */
export const defaultModelConfig: ModelConfig = {
  id: 0,
  name: 'DeepSeek 默认配置',
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  apiKeyEnc: null,
  baseURL: 'https://api.deepseek.com',
  temperature: 0.7,
  isDefault: 1,
  createdAt: 0,
  updatedAt: 0
}
