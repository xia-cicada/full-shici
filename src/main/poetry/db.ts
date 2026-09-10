import { existsSync } from 'fs'
import Database from 'better-sqlite3'
import { Category, PaginatedSearchResult, Poetry, PoetrySummary, SearchOptions } from './types'
import { buildFtsMatchQuery, escapeLike, hasCJK } from './pinyin-search'
import { getKeywordVariants } from './traditional'
import poetryDBPath from '../../../resources/poetry.sqlite?asset&asarUnpack'

/**列表/搜索共用的摘要列，避免取回并解析 notes/tags/extra_info 等大 JSON 列 */
const SUMMARY_COLUMNS = `
  p.id,
  p.category_id,
  p.title,
  p.rhythmic,
  p.author,
  p.paragraphs,
  c.name as category_name
`

/** 查询片段：计数 SQL + 数据 SQL + 按占位符顺序排列的参数 */
interface QueryParts {
  countSql: string
  dataSql: string
  params: any[]
}

/** 容错匹配参数：整句精确无命中时，按有序字符覆盖率找近似诗句（如通行本与全唐诗异文） */
const FUZZY_MIN_LENGTH = 5
const FUZZY_MIN_COVERAGE = 0.8
const FUZZY_CANDIDATE_LIMIT = 240
const FUZZY_PER_BIGRAM_LIMIT = 60
/** 容错匹配时忽略的空白与常见标点 */
const FUZZY_IGNORED_CHARS = /[\s，。！？；：、,.!?;:（）()「」《》]/

/**
 * 计算 needle 在 haystack 中的最佳有序覆盖率（窗口内 LCS / needle 长度）。
 * 允许缺失个别字（容忍异文用字差异），但要求匹配范围紧凑
 * （窗口不超过查询长度+2），避免字符散布在长诗中造成的误报。
 */
function bestOrderedCoverage(needle: string[], haystack: string): number {
  const n = needle.length
  const maxSpan = n + 2
  const minWindow = Math.ceil(n * FUZZY_MIN_COVERAGE)
  let best = 0

  for (let start = 0; start < haystack.length; start++) {
    const m = Math.min(haystack.length, start + maxSpan) - start
    if (m < minWindow) break // 窗口只会越来越短，无法再达到阈值

    let prev = new Int16Array(m + 1)
    let cur = new Int16Array(m + 1)
    for (let i = 1; i <= n; i++) {
      const needleChar = needle[i - 1]
      for (let j = 1; j <= m; j++) {
        cur[j] =
          needleChar === haystack[start + j - 1]
            ? prev[j - 1] + 1
            : prev[j] > cur[j - 1]
              ? prev[j]
              : cur[j - 1]
      }
      const swap = prev
      prev = cur
      cur = swap
      cur.fill(0)
    }

    const coverage = prev[m] / n
    if (coverage > best) best = coverage
    if (best === 1) break
  }

  return best
}

/**古诗词的数据库基本不会变化，和用户数据库区分开来 */
class PoetryDB {
  private db: Database.Database
  private dbPath: string
  /**诗词库文件是否存在；不存在时用空的内存库兜底，避免主进程启动即崩溃 */
  readonly ready: boolean

  constructor(dbPath: string = poetryDBPath) {
    this.dbPath = dbPath
    this.ready = !!dbPath && dbPath !== ':memory:' && existsSync(dbPath)
    this.db = new Database(this.ready ? dbPath : ':memory:')
    this.db.pragma('journal_mode = WAL')
    if (this.ready) {
      this.db.pragma('foreign_keys = ON')
    } else {
      this.createFallbackSchema()
    }
  }

  /**数据库状态（是否存在有效的诗词库文件），供渲染层展示引导 */
  status(): { ready: boolean; dbPath: string } {
    return { ready: this.ready, dbPath: this.dbPath }
  }

  /**缺库时建一个结构一致但为空的库，保证各查询方法返回空结果而不是抛错 */
  private createFallbackSchema() {
    this.db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        name_pinyin TEXT,
        name_initials TEXT,
        description TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
      CREATE TABLE poetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        title_pinyin TEXT,
        title_initials TEXT,
        rhythmic TEXT,
        rhythmic_pinyin TEXT,
        rhythmic_initials TEXT,
        author TEXT NOT NULL DEFAULT '',
        author_pinyin TEXT,
        author_initials TEXT,
        paragraphs TEXT NOT NULL DEFAULT '[]',
        notes TEXT DEFAULT '[]',
        tags TEXT DEFAULT '[]',
        extra_info TEXT DEFAULT '{}',
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `)
  }

  // 关闭数据库连接
  close(): void {
    this.db.close()
  }

  // 获取所有分类
  getAllCategories(): Category[] {
    const stmt = this.db.prepare('SELECT * FROM categories ORDER BY id')
    return stmt.all() as Category[]
  }

  // 根据ID获取分类
  getCategoryById(id: number): Category | null {
    const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?')
    return (stmt.get(id) as Category) || null
  }

  // 获取诗词总数
  getPoetryCount(options: SearchOptions = {}): number {
    let query = 'SELECT COUNT(*) as count FROM poetry WHERE 1=1'
    const params: any[] = []

    if (options.categoryId) {
      query += ' AND category_id = ?'
      params.push(options.categoryId)
    }

    if (options.author) {
      query += ' AND author = ?'
      params.push(options.author)
    }

    if (options.rhythmic) {
      query += ' AND rhythmic = ?'
      params.push(options.rhythmic)
    }

    const stmt = this.db.prepare(query)
    const result = stmt.get(...params) as { count: number }
    return result.count
  }

  // 获取诗词列表（摘要字段）
  getPoetryList(options: SearchOptions = {}): PoetrySummary[] {
    let query = `
      SELECT ${SUMMARY_COLUMNS}
      FROM poetry p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (options.categoryId) {
      query += ' AND p.category_id = ?'
      params.push(options.categoryId)
    }

    if (options.author) {
      query += ' AND p.author = ?'
      params.push(options.author)
    }

    if (options.rhythmic) {
      query += ' AND p.rhythmic = ?'
      params.push(options.rhythmic)
    }

    query += ' ORDER BY p.id DESC'

    if (options.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    if (options.offset) {
      query += ' OFFSET ?'
      params.push(options.offset)
    }

    const stmt = this.db.prepare(query)
    const results = stmt.all(...params) as any[]

    return this._parseSummaryResults(results)
  }

  // 根据ID获取诗词详情
  getPoetryById(id: number): Poetry | null {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        c.name as category_name
      FROM poetry p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `)
    const result = stmt.get(id) as any

    if (!result) return null

    return {
      ...result,
      paragraphs: JSON.parse(result.paragraphs || '[]'),
      notes: JSON.parse(result.notes || '[]'),
      tags: JSON.parse(result.tags || '[]'),
      extra_info: JSON.parse(result.extra_info || '{}')
    }
  }

  /**
   * 搜索诗词（含分页）。
   * - keyword 为空走普通分页
   * - FTS5 拼音检索按短语匹配标题/作者/词牌（如「李白」=> "li bai"）
   * - 关键词含中文时，额外并入正文子串匹配（自动转繁体变体，排除 FTS 已命中的行），
   *   两类结果合并分页：先标题/作者命中（按相关度），再正文命中
   * - options.ids 提供时只在指定 id 集合内搜索（收藏/标签视图用，经临时表过滤）
   * - limit <= 0 或不传时不限制条数
   */
  searchPoetry(
    keyword: string,
    options: {
      ids?: number[]
      categoryId?: number
      page?: number
      limit?: number
    } = {}
  ): PaginatedSearchResult {
    const currentPage = Math.max(1, options.page || 1)
    const limit = options.limit && options.limit > 0 ? options.limit : 0
    const trimmed = keyword?.trim() ?? ''
    const hasIds = this._prepareIdsTable(options.ids)

    if (!trimmed) {
      // 空搜索走普通分页查询（更快）
      return this._getSimplePaginatedResult(options.categoryId, currentPage, limit, hasIds)
    }

    const matchQuery = this.ready ? buildFtsMatchQuery(trimmed) : null
    const searchContent = hasCJK(trimmed)

    if (!matchQuery) {
      return searchContent
        ? this._getLikeResult(trimmed, options.categoryId, currentPage, limit, hasIds)
        : { results: [], total: 0 }
    }

    const fts = this._buildFtsQuery(matchQuery, options.categoryId, hasIds)
    const ftsTotal = this._countRows(fts)

    // 纯拼音/英文关键词只查标题、作者、词牌
    if (!searchContent) {
      const offset = limit > 0 ? (currentPage - 1) * limit : 0
      return { results: this._fetchRows(fts, limit, offset), total: ftsTotal }
    }

    // 中文关键词：并入正文匹配（排除 FTS 已命中行，避免重复）
    const like = this._buildLikeQuery(trimmed, options.categoryId, hasIds, matchQuery)
    const likeTotal = this._countRows(like)
    const total = ftsTotal + likeTotal

    // 精确检索完全无命中时，尝试容错匹配（异文/记错个别字）
    if (total === 0) {
      const fuzzy = this._getFuzzyResult(trimmed, options.categoryId, currentPage, limit, hasIds)
      if (fuzzy) return fuzzy
    }

    return {
      results: this._mergePagedResults(fts, ftsTotal, like, likeTotal, currentPage, limit),
      total
    }
  }

  /** 合并 FTS 与正文两段结果的分页切片：第一段按相关度，第二段按 id 倒序 */
  private _mergePagedResults(
    fts: QueryParts,
    ftsTotal: number,
    like: QueryParts,
    likeTotal: number,
    page: number,
    limit: number
  ): PoetrySummary[] {
    if (limit <= 0) {
      return [...this._fetchRows(fts, 0, 0), ...this._fetchRows(like, 0, 0)]
    }

    const offset = (page - 1) * limit
    const results: PoetrySummary[] = []

    if (offset < ftsTotal) {
      results.push(...this._fetchRows(fts, Math.min(limit, ftsTotal - offset), offset))
    }

    const remaining = limit - results.length
    if (remaining > 0) {
      const likeOffset = Math.max(0, offset - ftsTotal)
      if (likeOffset < likeTotal) {
        results.push(
          ...this._fetchRows(like, Math.min(remaining, likeTotal - likeOffset), likeOffset)
        )
      }
    }

    return results
  }

  /**
   * 把 id 集合写入临时表供各查询过滤。
   * 返回是否需要应用 id 过滤（传了 ids 即便为空数组也视为有效过滤，结果为空）。
   */
  private _prepareIdsTable(ids?: number[]): boolean {
    if (ids === undefined) return false

    this.db.exec('CREATE TEMP TABLE IF NOT EXISTS _search_ids (id INTEGER PRIMARY KEY)')
    this.db.prepare('DELETE FROM _search_ids').run()
    if (ids.length > 0) {
      const insert = this.db.prepare('INSERT OR IGNORE INTO _search_ids (id) VALUES (?)')
      const insertAll = this.db.transaction((rows: number[]) => {
        for (const id of rows) insert.run(id)
      })
      insertAll(ids)
    }
    return true
  }

  private _idsFilter(alias = 'p'): string {
    return ` AND ${alias}.id IN (SELECT id FROM _search_ids)`
  }

  // 普通分页查询（不经过FTS5）
  private _getSimplePaginatedResult(
    categoryId?: number,
    page: number = 1,
    limit: number = 0,
    hasIds: boolean = false
  ): PaginatedSearchResult {
    const offset = limit > 0 ? (page - 1) * limit : 0

    let countQuery = `SELECT COUNT(*) as total FROM poetry p WHERE 1=1`
    const countParams: any[] = []

    if (categoryId) {
      countQuery += ' AND p.category_id = ?'
      countParams.push(categoryId)
    }
    if (hasIds) {
      countQuery += this._idsFilter()
    }

    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }

    let dataQuery = `
      SELECT ${SUMMARY_COLUMNS}
      FROM poetry p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `

    const dataParams = [...countParams]
    if (categoryId) {
      dataQuery += ' AND p.category_id = ?'
    }
    if (hasIds) {
      dataQuery += this._idsFilter()
    }

    dataQuery += ' ORDER BY p.id DESC'
    if (limit > 0) {
      dataQuery += ' LIMIT ? OFFSET ?'
      dataParams.push(limit, offset)
    }

    const rawResults = this.db.prepare(dataQuery).all(...dataParams)
    const results = this._parseSummaryResults(rawResults)

    return {
      results,
      total
    }
  }

  // FTS5 检索查询（matchQuery 为已转义/分词的 MATCH 表达式）
  private _buildFtsQuery(
    matchQuery: string,
    categoryId?: number,
    hasIds: boolean = false
  ): QueryParts {
    let where = `
      FROM poetry_search
      JOIN poetry p ON poetry_search.rowid = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE poetry_search MATCH ?
    `
    const params: any[] = [matchQuery]

    if (categoryId) {
      where += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (hasIds) {
      where += this._idsFilter()
    }

    return {
      countSql: `SELECT COUNT(*) as total ${where}`,
      dataSql: `
        SELECT
          ${SUMMARY_COLUMNS},
          bm25(poetry_search) as relevance
        ${where}
        ORDER BY relevance
      `,
      params
    }
  }

  // 中文原文子串查询：正文以繁体为主，关键词同时按原文与繁体变体匹配。
  // excludeMatchQuery 提供时排除 FTS 已命中的行，避免与标题/作者结果重复。
  private _buildLikeQuery(
    keyword: string,
    categoryId?: number,
    hasIds: boolean = false,
    excludeMatchQuery?: string
  ): QueryParts {
    const variants = getKeywordVariants(keyword)
    const params: any[] = []

    // 注意：参数必须按占位符出现顺序推入（逐列、列内逐变体）
    const columnClause = (column: string): string => {
      const parts = variants.map((variant) => {
        params.push(`%${escapeLike(variant)}%`)
        return `${column} LIKE ? ESCAPE '\\'`
      })
      return `(${parts.join(' OR ')})`
    }

    let where = `(
      ${columnClause('p.title')}
      OR ${columnClause('p.author')}
      OR ${columnClause('p.rhythmic')}
      OR ${columnClause('p.paragraphs')}
    )`

    if (excludeMatchQuery) {
      where += ` AND p.id NOT IN (SELECT rowid FROM poetry_search WHERE poetry_search MATCH ?)`
      params.push(excludeMatchQuery)
    }
    if (categoryId) {
      where += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (hasIds) {
      where += this._idsFilter()
    }

    return {
      countSql: `SELECT COUNT(*) as total FROM poetry p WHERE ${where}`,
      dataSql: `
        SELECT ${SUMMARY_COLUMNS}
        FROM poetry p
        JOIN categories c ON p.category_id = c.id
        WHERE ${where}
        ORDER BY p.id DESC
      `,
      params
    }
  }

  /** 单独走正文子串搜索（关键词无法转拼音时） */
  private _getLikeResult(
    keyword: string,
    categoryId: number | undefined,
    page: number,
    limit: number,
    hasIds: boolean
  ): PaginatedSearchResult {
    const query = this._buildLikeQuery(keyword, categoryId, hasIds)
    const total = this._countRows(query)
    if (total === 0) {
      const fuzzy = this._getFuzzyResult(keyword, categoryId, page, limit, hasIds)
      if (fuzzy) return fuzzy
    }
    const offset = limit > 0 ? (page - 1) * limit : 0
    return {
      results: this._fetchRows(query, limit, offset),
      total
    }
  }

  /**
   * 容错匹配：整句精确无命中时，用各变体的首/中/尾双字片段取候选，
   * 再按有序覆盖率评分（窗口内 LCS，默认至少 4/5 命中）。
   * 候选与评分都遍历全部简繁/异体变体，以容忍「床/牀」这类用字差异。
   */
  private _getFuzzyResult(
    keyword: string,
    categoryId: number | undefined,
    page: number,
    limit: number,
    hasIds: boolean
  ): PaginatedSearchResult | null {
  const needles = getKeywordVariants(keyword)
    .map((variant) => [...variant].filter((c) => !FUZZY_IGNORED_CHARS.test(c)))
    .filter((chars) => chars.length >= FUZZY_MIN_LENGTH)
  if (needles.length === 0) return null

  const bigrams = new Set<string>()
  for (const needle of needles) {
    const mid = Math.floor((needle.length - 2) / 2)
    bigrams.add(needle.slice(0, 2).join(''))
    bigrams.add(needle.slice(-2).join(''))
    if (needle.length >= 6) bigrams.add(needle.slice(mid, mid + 2).join(''))
  }
  const bigramList = [...bigrams].filter((b) => b.length === 2).slice(0, 6)

  const matched = new Map<number, { row: any; score: number }>()
  for (const bigram of bigramList) {
    let where = `p.paragraphs LIKE ? ESCAPE '\\'`
    const params: any[] = [`%${escapeLike(bigram)}%`]
    if (categoryId) {
      where += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (hasIds) {
      where += this._idsFilter()
    }

    const rows = this.db
      .prepare(
        `
        SELECT ${SUMMARY_COLUMNS}
        FROM poetry p
        JOIN categories c ON p.category_id = c.id
        WHERE ${where}
        LIMIT ${FUZZY_PER_BIGRAM_LIMIT}
      `
      )
      .all(...params) as any[]

    for (const row of rows) {
      if (matched.has(row.id)) continue
      const text = row.paragraphs || ''
      let score = 0
      for (const needle of needles) {
        const coverage = bestOrderedCoverage(needle, text)
        if (coverage > score) score = coverage
        if (score === 1) break
      }
      if (score >= FUZZY_MIN_COVERAGE) {
        matched.set(row.id, { row, score })
      }
    }
    if (matched.size >= FUZZY_CANDIDATE_LIMIT) break
  }

  if (matched.size === 0) return null

  const sorted = [...matched.values()].sort((a, b) => b.score - a.score || b.row.id - a.row.id)
  const offset = limit > 0 ? (page - 1) * limit : 0
  const pageRows = limit > 0 ? sorted.slice(offset, offset + limit) : sorted

  return {
    results: this._parseSummaryResults(pageRows.map((m) => m.row)),
    total: sorted.length
  }
}

  private _countRows(query: QueryParts): number {
    const { total } = this.db.prepare(query.countSql).get(...query.params) as { total: number }
    return total
  }

  private _fetchRows(query: QueryParts, limit: number, offset: number): PoetrySummary[] {
    let sql = query.dataSql
    const params = [...query.params]
    if (limit > 0) {
      sql += ' LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }
    const rawResults = this.db.prepare(sql).all(...params)
    return this._parseSummaryResults(rawResults)
  }

  // 列表/搜索结果的公用解析：只需解析 paragraphs
  private _parseSummaryResults(rawResults: any[]): PoetrySummary[] {
    return rawResults.map((item) => ({
      ...item,
      paragraphs: JSON.parse(item.paragraphs || '[]')
    }))
  }

  // 获取所有作者
  getAllAuthors(): string[] {
    const stmt = this.db.prepare('SELECT DISTINCT author FROM poetry ORDER BY author')
    const results = stmt.all() as { author: string }[]
    return results.map((item) => item.author)
  }

  // 获取所有词牌名
  getAllRhythmics(): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT rhythmic FROM poetry
      WHERE rhythmic IS NOT NULL AND rhythmic != ''
      ORDER BY rhythmic
    `)
    const results = stmt.all() as { rhythmic: string }[]
    return results.map((item) => item.rhythmic)
  }

  // 获取随机诗词（id 随机落点，避免 ORDER BY RANDOM() 全表扫描）
  getRandomPoetry(count: number = 1): Poetry[] {
    const { maxId } = this.db.prepare('SELECT MAX(id) as maxId FROM poetry').get() as {
      maxId: number
    }
    if (!maxId) return []

    const pick = this.db.prepare(`
      SELECT * FROM poetry
      WHERE id >= ?
      ORDER BY id
      LIMIT 1
    `)
    const seen = new Set<number>()
    const results: any[] = []
    // 命中重复或 id 空洞时重试，上限避免小库死循环
    let attempts = 0
    const maxAttempts = count * 10 + 20
    while (results.length < count && attempts < maxAttempts && seen.size < maxId) {
      attempts++
      const row = pick.get(Math.floor(Math.random() * maxId) + 1) as any
      if (!row || seen.has(row.id)) continue
      seen.add(row.id)
      results.push(row)
    }

    return results.map((item) => ({
      ...item,
      paragraphs: JSON.parse(item.paragraphs || '[]'),
      notes: JSON.parse(item.notes || '[]'),
      tags: JSON.parse(item.tags || '[]'),
      extra_info: JSON.parse(item.extra_info || '{}')
    }))
  }

  // 事务示例 - 添加新诗词
  addPoetry(poetry: Omit<Poetry, 'id' | 'created_at' | 'updated_at'>): number {
    const insert = this.db.prepare(`
      INSERT INTO poetry (
        category_id, title, title_pinyin, title_initials,
        rhythmic, rhythmic_pinyin, rhythmic_initials,
        author, author_pinyin, author_initials,
        paragraphs, notes, tags, extra_info
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)

    return this.db.transaction(() => {
      const result = insert.run(
        poetry.category_id,
        poetry.title,
        poetry.title_pinyin,
        poetry.title_initials,
        poetry.rhythmic,
        poetry.rhythmic_pinyin,
        poetry.rhythmic_initials,
        poetry.author,
        poetry.author_pinyin,
        poetry.author_initials,
        JSON.stringify(poetry.paragraphs),
        JSON.stringify(poetry.notes),
        JSON.stringify(poetry.tags),
        JSON.stringify(poetry.extra_info)
      )

      return result.lastInsertRowid as number
    })()
  }
}

export const poetryDB = new PoetryDB(poetryDBPath)
