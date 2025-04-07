import { cloneDeep } from 'es-toolkit'

/**获取原生对象，避免与electron通信时错误 */
export const toDeepRaw: <T>(v: T) => T = (v) => cloneDeep(v)
