/**默认使用DeepSeek */
export const defaultModelConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
  temperature: 0.7
}
