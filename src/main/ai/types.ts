export interface ModelConfig {
  id: number
  name: string
  provider: string // 'deepseek' | 'openai' | 'anthropic' | 'custom'
  model: string
  apiKey: string
  baseURL: string
  temperature: number
  systemPrompt?: string
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  isDefault: number // 1-是, 0-否
  createdAt: number // 使用时间戳
  updatedAt: number
}
