import Database from 'better-sqlite3'
import { Category, PaginatedSearchResult, Poetry, SearchOptions, SearchResult } from './types'
import poetryDBPath from '../../../resources/poetry.sqlite?asset&asarUnpack'

/**古诗词的数据库基本不会变化，和用户数据库区分开来 */
class PoetryDB {
  private db: Database.Database

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initialize()
  }

  private initialize() {
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')
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

  // 获取诗词列表
  getPoetryList(options: SearchOptions = {}): Poetry[] {
    let query = `
      SELECT
        p.*,
        c.name as category_name
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

    // 解析JSON字段
    return results.map((item) => ({
      ...item,
      paragraphs: JSON.parse(item.paragraphs || '[]'),
      notes: JSON.parse(item.notes || '[]'),
      tags: JSON.parse(item.tags || '[]'),
      extra_info: JSON.parse(item.extra_info || '{}')
    }))
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

  // 全文搜索
  searchPoetry(
    keyword: string,
    options: {
      categoryId?: number
      page?: number
      limit?: number
    } = {}
  ): PaginatedSearchResult {
    const currentPage = Math.max(1, options.page || 1)
    const limit = Math.max(1, options.limit || 10)

    if (!keyword?.trim()) {
      // 空搜索走普通分页查询（更快）
      return this._getSimplePaginatedResult(options.categoryId, currentPage, limit)
    }

    // 条件搜索走FTS5全文检索
    return this._getFtsPaginatedResult(keyword, options.categoryId, currentPage, limit)
  }

  // 普通分页查询（不经过FTS5）
  private _getSimplePaginatedResult(
    categoryId?: number,
    page: number = 1,
    limit: number = 10
  ): PaginatedSearchResult {
    const offset = (page - 1) * limit

    let countQuery = `SELECT COUNT(*) as total FROM poetry WHERE 1=1`
    const countParams: any[] = []

    if (categoryId) {
      countQuery += ' AND category_id = ?'
      countParams.push(categoryId)
    }

    const { total } = this.db.prepare(countQuery).get(...countParams) as { total: number }

    let dataQuery = `
      SELECT
        p.*,
        c.name as category_name
      FROM poetry p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `

    const dataParams = [...countParams]
    if (categoryId) {
      dataQuery += ' AND p.category_id = ?'
    }

    dataQuery += ' ORDER BY p.id DESC LIMIT ? OFFSET ?'
    dataParams.push(limit, offset)

    const rawResults = this.db.prepare(dataQuery).all(...dataParams)
    const results = this._parsePoetryResults(rawResults)

    return {
      results,
      total
    }
  }

  // FTS5全文检索分页
  private _getFtsPaginatedResult(
    keyword: string,
    categoryId?: number,
    page: number = 1,
    limit: number = 10
  ): PaginatedSearchResult {
    const offset = (page - 1) * limit

    let baseQuery = `
      FROM poetry_search
      JOIN poetry p ON poetry_search.rowid = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE poetry_search MATCH ?
    `

    const params: any[] = [keyword]
    if (categoryId) {
      baseQuery += ' AND p.category_id = ?'
      params.push(categoryId)
    }

    // 获取总数（使用COUNT优化）
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total ${baseQuery}`)
    const { total } = countStmt.get(...params) as { total: number }

    // 获取分页数据
    const dataStmt = this.db.prepare(`
      SELECT
        p.*,
        c.name as category_name,
        bm25(poetry_search) as relevance
      ${baseQuery}
      ORDER BY relevance
      LIMIT ? OFFSET ?
    `)

    const pageParams = [...params, limit, offset]
    const rawResults = dataStmt.all(...pageParams)
    const results = this._parsePoetryResults(rawResults)

    return {
      results,
      total
    }
  }

  // 公用结果解析方法
  private _parsePoetryResults(rawResults: any[]): SearchResult[] {
    return rawResults.map((item) => ({
      ...item,
      paragraphs: JSON.parse(item.paragraphs || '[]'),
      notes: JSON.parse(item.notes || '[]'),
      tags: JSON.parse(item.tags || '[]'),
      extra_info: JSON.parse(item.extra_info || '{}')
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
