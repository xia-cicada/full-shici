import OpenAI from 'openai'
import { Poetry, PoetryAnalysis } from '../poetry/types'
import { generateAnalysisPrompt } from './prompt'
import log from 'electron-log'
import { aiDB } from './db'

class AiAssist {
  private static openai: OpenAI | null = null
  private static lastConfigHash: string = ''
  private static DEFAULT_SYS_PROMPT = '你是一个聪明高效的助手'
  db = aiDB

  constructor() {}

  async analyzePoetry(poetry: Poetry): Promise<PoetryAnalysis> {
    const openai = await this.getOpenAI()
    const config = aiDB.getDefaultModelConfig()
    try {
      const completion = await openai.chat.completions.create({
        model: config.model || 'deepseek-chat',
        temperature: config.temperature ?? 0.7,
        messages: [
          {
            role: 'system',
            content: config.systemPrompt ? config.systemPrompt : AiAssist.DEFAULT_SYS_PROMPT
          },
          { role: 'user', content: generateAnalysisPrompt(poetry) }
        ]
      })

      return this.parseAndValidateResponse(completion)
    } catch (error) {
      log.error('赏析失败:', error)
      throw new Error('诗歌赏析服务暂时不可用')
    }
  }

  private parseAndValidateResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion
  ): PoetryAnalysis {
    const responseText = completion.choices[0]?.message?.content?.trim() || '{}'

    let jsonString = responseText
    const jsonMarkdownMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMarkdownMatch && jsonMarkdownMatch[1]) {
      jsonString = jsonMarkdownMatch[1].trim()
    }
    let rawData: any
    try {
      rawData = JSON.parse(jsonString)
    } catch {
      rawData = {} // 如果解析失败，使用空对象
    }

    return {
      title: rawData.title || '未知标题',
      author: rawData.author || '未知作者',
      dynasty: rawData.dynasty || '未知朝代',
      vocabularyNotes: Array.isArray(rawData.vocabularyNotes) ? rawData.vocabularyNotes : [],
      contentAnalysis: rawData.contentAnalysis || '暂无内容分析',
      artisticFeatures: Array.isArray(rawData.artisticFeatures)
        ? rawData.artisticFeatures
        : ['暂无艺术特色分析'],
      emotionalExpression: rawData.emotionalExpression || '暂无情感分析'
    }
  }

  private async getOpenAI() {
    const currentConfig = aiDB.getDefaultModelConfig()
    const currentHash = JSON.stringify(currentConfig)

    if (AiAssist.openai && currentHash === AiAssist.lastConfigHash) {
      return AiAssist.openai
    }

    AiAssist.openai = new OpenAI({
      apiKey: currentConfig.apiKey,
      baseURL: currentConfig.baseURL || 'https://api.deepseek.com/v1',
      timeout: 10_000, // 10秒超时
      maxRetries: 1
    })

    AiAssist.lastConfigHash = currentHash
    return AiAssist.openai
  }
}

export const aiAssist = new AiAssist()
