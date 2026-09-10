export interface ModelConfig {
  id: number
  name: string
  provider: string // 'deepseek' | 'openai' | 'anthropic' | 'custom'
  model: string
  apiKey: string
  /** safeStorage 加密后的 API Key（base64），仅存在于主进程内部的数据库行中，不会传给渲染层 */
  apiKeyEnc?: string | null
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
