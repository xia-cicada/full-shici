import log from 'electron-log'
import * as OpenCC from 'opencc-js'

type Converter = (text: string) => string

let converters: Converter[] | null = null

/**
 * 惰性创建简→繁转换器（字典较大，首次用到时再加载）。
 * 诗词库正文以繁体为主（用字风格 裏/爲/說，与 OpenCC 的 t/tw 配置一致），
 * 用户输入简体时必须转换后才能匹配到正文。
 */
function getConverters(): Converter[] {
  if (!converters) {
    try {
      converters = [
        OpenCC.Converter({ from: 'cn', to: 't' }), // 标准繁体
        OpenCC.Converter({ from: 'cn', to: 'tw' }) // 台湾正体（覆盖 裡 等异体用字）
      ]
    } catch (error) {
      log.warn('[search] 简繁转换初始化失败，将仅按原文搜索:', error)
      converters = []
    }
  }
  return converters
}

/**
 * 生成关键词的搜索变体：原文 + 各种繁体形式（去重）。
 * 用于正文检索时同时匹配简体与繁体内容。
 */
export function getKeywordVariants(keyword: string): string[] {
  const variants = new Set<string>([keyword])
  for (const convert of getConverters()) {
    try {
      const converted = convert(keyword)
      if (converted) variants.add(converted)
    } catch {
      // 单个转换失败不影响其他变体
    }
  }
  return [...variants]
}
