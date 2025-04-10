import OpenAI from 'openai'
import { modelConfig } from './model'
import { Poetry, PoetryAnalysis } from '../poetry/types'
import { generateAnalysisPrompt } from './prompt'
import log from 'electron-log'

class AiAssist {
  openai: OpenAI
  constructor() {
    this.openai = new OpenAI(modelConfig)
  }

  async analyzePoetry(poetry: Poetry): Promise<PoetryAnalysis> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: '你是一个精通中国文学的学者' },
          { role: 'user', content: generateAnalysisPrompt(poetry) }
        ],
        model: 'deepseek-chat'
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

    let rawData: any
    try {
      rawData = JSON.parse(responseText)
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
}

export const aiAssist = new AiAssist()
