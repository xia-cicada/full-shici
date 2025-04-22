import { VocabularyNote } from '@main/poetry/types'
import { cloneDeep } from 'es-toolkit'
import { pinyin } from 'pinyin-pro'

/**获取原生对象，避免与electron通信时错误 */
export const toDeepRaw: <T>(v: T) => T = (v) => cloneDeep(v)

/**获取拼音，空格分隔，同时保留非中文的形式 */
export const getPy = (text: string = '') => {
  return pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
}

/**
 * 有些诗词内部自己存在注释，但这个注释词语和注解放在了一起，需要解析成标准的VocabularyNote
 */
export const parsePoetryNote = (note: string): VocabularyNote => {
  const index = note.indexOf('--') // 南唐诗词的写法
  if (index > -1) {
    const word = note.substring(0, index).replace(/^[\d\.]*/, '')
    return { word, explanation: note.substring(index + 2) }
  }
  return { word: '', explanation: note }
}
