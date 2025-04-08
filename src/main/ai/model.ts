/**默认使用DeepSeek V3 */
export const modelConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v3',
  temperature: 0.7,
  maxTokens: 1000
}
