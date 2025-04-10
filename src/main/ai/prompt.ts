import { Poetry } from '../poetry/types'

export function generateAnalysisPrompt(request: Poetry): string {
  return `
  请为以下古诗提供注释和赏析，要求：
  1. 注释包含高中生水平的词汇解释，并且简繁体和内容里的保持一致
  2. 赏析部分包含内容分析、艺术特色和情感表达
  3. 返回格式必须是严格的JSON格式，不要有任何额外的文字

  诗歌信息：
  标题：《${request.title}》
  作者：${request.author}
  内容：
  ${request.paragraphs.join('\n')}

  请按照以下JSON结构返回：
  {
    "title": "诗歌标题",
    "author": "作者",
    "dynasty": "朝代",
    "vocabularyNotes": [
      {"word": "难词1", "explanation": "解释"},
      {"word": "难词2", "explanation": "解释"}
    ],
    "contentAnalysis": "内容分析（50-100字）",
    "artisticFeatures": ["特色1", "特色2"],
    "emotionalExpression": "情感表达（30-50字）"
  }
  `
}
