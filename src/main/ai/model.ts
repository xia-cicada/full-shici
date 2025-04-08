/**默认使用DeepSeek */
export const modelConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
  temperature: 0.7
}
