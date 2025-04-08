import { cloneDeep } from 'es-toolkit'
import { pinyin } from 'pinyin-pro'

/**获取原生对象，避免与electron通信时错误 */
export const toDeepRaw: <T>(v: T) => T = (v) => cloneDeep(v)

/**获取拼音，空格分隔 */
export const getPy = (text: string = '') => {
  return pinyin(text, { toneType: 'none', type: 'string' })
}
