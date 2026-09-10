import { pinyin } from 'pinyin-pro'

/** 与数据库构建脚本一致：转拼音、无声调、非中文原样保留 */
export const getPy = (text: string = ''): string => {
  return pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' }).trim()
}

/** 是否包含中日韩表意文字（含扩展A区） */
export const hasCJK = (text: string): boolean => {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(text)
}

/** FTS5 中把词用双引号包裹（含空格则为短语查询），内部双引号翻倍，防止用户输入被当作 MATCH 语法 */
const quoteFtsTerm = (term: string): string => `"${term.replace(/"/g, '""')}"`

/** 把一段文本转成拼音短语（音节间以空格分隔，FTS5 中按连续短语匹配） */
const toPinyinPhrase = (segment: string): string | null => {
  const terms = getPy(segment).split(/\s+/).filter(Boolean)
  return terms.length ? terms.join(' ') : null
}

/** 汉语拼音音节表（无声调），用于把连续输入的拼音串（如 libai）切分成音节 */
const SYLLABLES = new Set(
  (
    'a ai an ang ao ' +
    'ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu ' +
    'ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo ' +
    'da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo ' +
    'e ei en eng er ' +
    'fa fan fang fei fen feng fo fou fu ' +
    'ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ' +
    'ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo ' +
    'ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ' +
    'ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo ' +
    'la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lue ' +
    'ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu ' +
    'na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nue ' +
    'o ou ' +
    'pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu ' +
    'qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ' +
    'ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo ' +
    'sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ' +
    'ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo ' +
    'wa wai wan wang wei wen weng wo wu ' +
    'xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ' +
    'ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun ' +
    'za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo'
  ).split(/\s+/)
)

/** 单个音节的最大长度（如 zhuang 为 6） */
const MAX_SYLLABLE_LEN = 6

/**
 * 把连续拼音串切分成音节组合，返回最多 maxResults 种切分方式。
 * 例如 "libai" -> [["li","bai"]]，"wanan" -> [["wan","an"],["wa","nan"],...]
 */
export function segmentPinyin(input: string, maxResults = 5): string[][] {
  const results: string[][] = []
  let visited = 0
  const MAX_VISITS = 2000 // 防止无效输入导致回溯爆炸

  const dfs = (pos: number, acc: string[]) => {
    if (results.length >= maxResults || visited > MAX_VISITS) return
    visited++
    if (pos === input.length) {
      results.push([...acc])
      return
    }
    for (let len = 1; len <= MAX_SYLLABLE_LEN && pos + len <= input.length; len++) {
      const seg = input.slice(pos, pos + len)
      if (SYLLABLES.has(seg)) {
        acc.push(seg)
        dfs(pos + len, acc)
        acc.pop()
        if (results.length >= maxResults || visited > MAX_VISITS) return
      }
    }
  }

  dfs(0, [])
  return results
}

/**
 * 把用户关键词转换成安全的 FTS5 MATCH 表达式。
 * - 按空白切成多段，段内转拼音后作为「连续短语」匹配（如 李白 => "li bai"），
 *   比逐词 AND 精确得多，避免长句命中一堆音节碰巧齐全的长标题
 * - 连续输入的拼音串（如 libai）额外尝试音节切分（li bai）并 OR 组合
 * - 所有词都做双引号转义，杜绝 FTS5 语法注入
 * 返回 null 表示没有可搜索的词。
 */
export function buildFtsMatchQuery(rawKeyword: string): string | null {
  const cleaned = rawKeyword.trim()
  if (!cleaned) return null

  const groups: string[] = []
  for (const segment of cleaned.split(/\s+/).filter(Boolean)) {
    const phrase = toPinyinPhrase(segment)
    if (!phrase) continue

    if (!phrase.includes(' ') && /^[a-z]{2,24}$/.test(phrase)) {
      // 单个连续拼音串：整词与音节切分形式 OR 组合
      const variants = new Set<string>([phrase])
      for (const seg of segmentPinyin(phrase)) {
        variants.add(seg.join(' '))
      }
      const list = [...variants]
      groups.push(list.length === 1 ? quoteFtsTerm(list[0]) : `(${list.map(quoteFtsTerm).join(' OR ')})`)
    } else {
      groups.push(quoteFtsTerm(phrase))
    }
  }

  if (groups.length === 0) return null
  return groups.join(' AND ')
}

/** 转义 LIKE 模式中的通配符，配合 ESCAPE '\' 使用 */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => '\\' + c)
