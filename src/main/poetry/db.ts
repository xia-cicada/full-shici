import { existsSync } from 'fs'
import Database from 'better-sqlite3'
import { Category, PaginatedSearchResult, Poetry, PoetrySummary, SearchOptions } from './types'
import { buildFtsMatchQuery, escapeLike, hasCJK } from './pinyin-search'
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
   * - 有关键词先走 FTS5 拼音检索，中文未命中时回退为原文子串搜索（含正文）
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

    // 条件搜索走FTS5全文检索（拼音分词，输入已做转义）
    if (this.ready) {
      const matchQuery = buildFtsMatchQuery(trimmed)
      if (matchQuery) {
        const ftsResult = this._getFtsPaginatedResult(
          matchQuery,
          options.categoryId,
          currentPage,
          limit,
          hasIds
        )
        if (ftsResult.total > 0) {
          return ftsResult
        }
      }
    }

    // FTS（按拼音）没有命中时，中文关键词再按原文子串兜底搜索标题/作者/词牌/正文
    if (hasCJK(trimmed)) {
      return this._getLikePaginatedResult(trimmed, options.categoryId, currentPage, limit, hasIds)
    }

    return { results: [], total: 0 }
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

  // FTS5全文检索分页（matchQuery 为已转义/分词的 MATCH 表达式）
  private _getFtsPaginatedResult(
    matchQuery: string,
    categoryId?: number,
    page: number = 1,
    limit: number = 0,
    hasIds: boolean = false
  ): PaginatedSearchResult {
    const offset = limit > 0 ? (page - 1) * limit : 0

    let baseQuery = `
      FROM poetry_search
      JOIN poetry p ON poetry_search.rowid = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE poetry_search MATCH ?
    `

    const params: any[] = [matchQuery]
    if (categoryId) {
      baseQuery += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (hasIds) {
      baseQuery += this._idsFilter()
    }

    // 获取总数（使用COUNT优化）
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total ${baseQuery}`)
    const { total } = countStmt.get(...params) as { total: number }

    // 获取分页数据
    let dataQuery = `
      SELECT
        ${SUMMARY_COLUMNS},
        bm25(poetry_search) as relevance
      ${baseQuery}
      ORDER BY relevance
    `
    const pageParams = [...params]
    if (limit > 0) {
      dataQuery += ' LIMIT ? OFFSET ?'
      pageParams.push(limit, offset)
    }

    const rawResults = this.db.prepare(dataQuery).all(...pageParams)
    const results = this._parseSummaryResults(rawResults)

    return {
      results,
      total
    }
  }

  // 中文原文子串搜索分页（FTS未命中时的兜底，可命中诗词正文）
  private _getLikePaginatedResult(
    keyword: string,
    categoryId?: number,
    page: number = 1,
    limit: number = 0,
    hasIds: boolean = false
  ): PaginatedSearchResult {
    const offset = limit > 0 ? (page - 1) * limit : 0
    const pattern = `%${escapeLike(keyword)}%`
    let where = `(
      p.title LIKE ? ESCAPE '\\'
      OR p.author LIKE ? ESCAPE '\\'
      OR p.rhythmic LIKE ? ESCAPE '\\'
      OR p.paragraphs LIKE ? ESCAPE '\\'
    )`
    const params: any[] = [pattern, pattern, pattern, pattern]

    if (categoryId) {
      where += ' AND p.category_id = ?'
      params.push(categoryId)
    }
    if (hasIds) {
      where += this._idsFilter()
    }

    const { total } = this.db.prepare(
      `SELECT COUNT(*) as total FROM poetry p WHERE ${where}`
    ).get(...params) as { total: number }

    let dataQuery = `
      SELECT ${SUMMARY_COLUMNS}
      FROM poetry p
      JOIN categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.id DESC
    `
    const dataParams = [...params]
    if (limit > 0) {
      dataQuery += ' LIMIT ? OFFSET ?'
      dataParams.push(limit, offset)
    }

    const rawResults = this.db.prepare(dataQuery).all(...dataParams)

    return {
      results: this._parseSummaryResults(rawResults),
      total
    }
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

  // 获取随机诗词
  getRandomPoetry(count: number = 1): Poetry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM poetry
      ORDER BY RANDOM()
      LIMIT ?
    `)
    const results = stmt.all(count) as any[]

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
