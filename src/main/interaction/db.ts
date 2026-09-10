import { userData } from '../userData/db'
import { Annotation, AnnotationInput, BookmarkInput, Note, NoteInput, Tag } from './types'

/**单批 IN 条件的最大参数数（SQLite 变量上限的保守值） */
const IN_CHUNK_SIZE = 500

export class InteractionDB {
  private userData = userData
  private db = userData.getDatabase()

  constructor() {
    this.initTable()
  }

  initTable() {
    // 迁移脚本必须幂等（IF NOT EXISTS）。
    // 历史实现是 DROP + 重建且依赖全局版本号防重放，一旦误执行会清空用户的笔记/收藏/标签。
    const migrationScript = `
    -- 注解表（基于诗句数组定位）
    CREATE TABLE IF NOT EXISTS annotation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      verse_index INTEGER NOT NULL,   -- 第几句，第0句表示标题
      start_pos INTEGER NOT NULL,     -- 该句中的起始位置
      end_pos INTEGER NOT NULL,       -- 该句中的结束位置
      content TEXT NOT NULL,          -- 注解内容
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    -- 笔记表
    CREATE TABLE IF NOT EXISTS note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      title TEXT,                     -- 笔记标题
      content TEXT NOT NULL,          -- 笔记内容
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    -- 标记表（收藏、点赞等）
    CREATE TABLE IF NOT EXISTS bookmark (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      type TEXT NOT NULL,             -- 标记类型（收藏，点赞等）
      data TEXT,                      -- 额外数据
      created_at TIMESTAMP NOT NULL,
      UNIQUE(poetry_id, type)         -- 防止重复标记
    );

    -- 标签表
    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,      -- 标签名称
      color TEXT,                     -- 标签颜色
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    -- 诗词-标签关联表
    CREATE TABLE IF NOT EXISTS poetry_tag (
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      tag_id INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL,
      PRIMARY KEY (poetry_id, tag_id),
      FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
    );

    -- 创建索引提高查询性能
    CREATE INDEX IF NOT EXISTS idx_annotation_poetry_id ON annotation(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_note_poetry_id ON note(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_poetry_id ON bookmark(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_type ON bookmark(type);
    CREATE INDEX IF NOT EXISTS idx_poetry_tag_poetry_id ON poetry_tag(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_poetry_tag_tag_id ON poetry_tag(tag_id);
    `

    this.userData.migrateNs('interaction', 1, migrationScript)
  }

  // ========== 注解相关方法 ==========

  addAnnotation(params: AnnotationInput) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO annotation (poetry_id, verse_index, start_pos, end_pos, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      params.poetryId,
      params.verseIndex,
      params.startPos,
      params.endPos,
      params.content,
      now,
      now
    )
  }

  getAnnotationsByPoetry(poetryId: number) {
    const stmt = this.db.prepare(`
      SELECT * FROM annotation
      WHERE poetry_id = ?
      ORDER BY verse_index, start_pos
    `)
    return stmt.all(poetryId)
  }

  getAnnotationsByVerse(poetryId: number, verseIndex: number) {
    const stmt = this.db.prepare(`
      SELECT * FROM annotation
      WHERE poetry_id = ? AND verse_index = ?
      ORDER BY start_pos
    `)
    return stmt.all(poetryId, verseIndex)
  }

  updateAnnotation(params: Pick<Annotation, 'id' | 'content'>) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE annotation
      SET content = ?, updated_at = ?
      WHERE id = ?
    `)
    return stmt.run(params.content, now, params.id)
  }

  deleteAnnotation(id: number) {
    const stmt = this.db.prepare(`DELETE FROM annotation WHERE id = ?`)
    return stmt.run(id)
  }

  // ========== 笔记相关方法 ==========

  addNote(params: NoteInput) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO note (poetry_id, title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    return stmt.run(params.poetryId, params.title, params.content, now, now)
  }

  getNotesByPoetry(poetryId: number) {
    const stmt = this.db.prepare(`
      SELECT * FROM note
      WHERE poetry_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(poetryId)
  }

  getNotesSummaryByPoetry(poetryId: number) {
    // 获取总条数
    const countStmt = this.db.prepare(`
    SELECT COUNT(*) AS count FROM note
    WHERE poetry_id = ?
  `)
    const countResult = countStmt.get(poetryId) as { count: number }
    const total = countResult?.count || 0

    if (total === 0) {
      return {
        latestContent: null,
        totalCount: 0
      }
    }

    // 获取最新一条的内容（按 created_at DESC 的第一条）
    const latestStmt = this.db.prepare(`
    SELECT content FROM note
    WHERE poetry_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `)
    const latestResult = latestStmt.get(poetryId) as { content: string } | undefined

    return {
      latestContent: latestResult?.content ?? null,
      totalCount: total
    }
  }

  getNote(id: number) {
    const stmt = this.db.prepare(`SELECT * FROM note WHERE id = ?`)
    return stmt.get(id)
  }

  updateNote(params: Pick<Note, 'id' | 'title' | 'content'>) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE note
      SET title = ?, content = ?, updated_at = ?
      WHERE id = ?
    `)
    return stmt.run(params.title, params.content, now, params.id)
  }

  deleteNote(id: number) {
    const stmt = this.db.prepare(`DELETE FROM note WHERE id = ?`)
    return stmt.run(id)
  }

  // ========== 标记相关方法 ==========

  setBookmark(params: BookmarkInput) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO bookmark (poetry_id, type, data, created_at)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(params.poetryId, params.type, params.data, now)
  }

  getBookmark(poetryId: number, type: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM bookmark
      WHERE poetry_id = ? AND type = ?
    `)
    return stmt.get(poetryId, type)
  }

  getAllBookmarks(type?: string) {
    let sql = `SELECT * FROM bookmark`
    const params: string[] = []

    if (type) {
      sql += ` WHERE type = ?`
      params.push(type)
    }

    sql += ` ORDER BY created_at DESC`
    const stmt = this.db.prepare(sql)
    return params.length > 0 ? stmt.all(...params) : stmt.all()
  }

  removeBookmark(poetryId: number, type: string) {
    const stmt = this.db.prepare(`
      DELETE FROM bookmark
      WHERE poetry_id = ? AND type = ?
    `)
    return stmt.run(poetryId, type)
  }

  /**获取某类标记的全部诗词ID（只取ID列，供跨库批量查询诗词用） */
  getBookmarkPoetryIds(type: string): number[] {
    const rows = this.db
      .prepare(`SELECT poetry_id FROM bookmark WHERE type = ?`)
      .all(type) as Array<{ poetry_id: number }>
    return rows.map((r) => r.poetry_id)
  }

  /**从给定诗词ID中筛出已标记的（单次 IN 批量查询，替代逐个查询/全表拉取） */
  filterBookmarkedIds(poetryIds: number[], type: string): number[] {
    if (poetryIds.length === 0) return []
    const stmt = this.db.prepare(
      `SELECT poetry_id FROM bookmark WHERE type = ? AND poetry_id IN (${poetryIds.map(() => '?').join(',')})`
    )
    const results: number[] = []
    for (let i = 0; i < poetryIds.length; i += IN_CHUNK_SIZE) {
      const chunk = poetryIds.slice(i, i + IN_CHUNK_SIZE)
      const rows = stmt.all(type, ...chunk) as Array<{ poetry_id: number }>
      results.push(...rows.map((r) => r.poetry_id))
    }
    return results
  }

  // ========== 标签相关方法 ==========

  createTag(params: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Tag {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO tag (name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(params.name, params.color, now, now)

    // 查询并返回完整的 Tag 对象
    const selectStmt = this.db.prepare(`SELECT * FROM tag WHERE id = ?`)
    return selectStmt.get(result.lastInsertRowid) as Tag
  }

  getAllTags(): Tag[] {
    const stmt = this.db.prepare(`SELECT * FROM tag ORDER BY name`)
    return stmt.all() as Tag[]
  }

  updateTag(params: Pick<Tag, 'id' | 'name' | 'color'>): Tag {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE tag
      SET name = ?, color = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(params.name, params.color, now, params.id)

    // 查询并返回更新后的 Tag 对象
    const selectStmt = this.db.prepare(`SELECT * FROM tag WHERE id = ?`)
    return selectStmt.get(params.id) as Tag
  }

  deleteTag(id: number) {
    // 先删除关联关系
    this.db.prepare(`DELETE FROM poetry_tag WHERE tag_id = ?`).run(id)
    // 再删除标签
    const stmt = this.db.prepare(`DELETE FROM tag WHERE id = ?`)
    return stmt.run(id)
  }

  addTagToPoetry(poetryId: number, tagId: number) {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO poetry_tag (poetry_id, tag_id, created_at)
      VALUES (?, ?, ?)
    `)
    return stmt.run(poetryId, tagId, now)
  }

  getTagsByPoetry(poetryId: number) {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tag t
      JOIN poetry_tag pt ON t.id = pt.tag_id
      WHERE pt.poetry_id = ?
      ORDER BY t.name
    `)
    return stmt.all(poetryId)
  }

  getPoetriesByTag(tagId: number): number[] {
    const stmt = this.db.prepare(`
      SELECT poetry_id FROM poetry_tag
      WHERE tag_id = ?
      ORDER BY poetry_id
    `)
    const results = stmt.all(tagId) as Array<{ poetry_id: number }>
    return results.map((r) => r.poetry_id)
  }

  removeTagFromPoetry(poetryId: number, tagId: number) {
    const stmt = this.db.prepare(`
      DELETE FROM poetry_tag
      WHERE poetry_id = ? AND tag_id = ?
    `)
    return stmt.run(poetryId, tagId)
  }

  /**统计各标签下的诗词数量（单条 GROUP BY 查询，替代逐标签拉取全部诗词） */
  getTagPoetryCounts(tagIds?: number[]): Array<{ tag_id: number; count: number }> {
    let sql = `SELECT tag_id, COUNT(*) as count FROM poetry_tag`
    const params: number[] = []

    if (tagIds && tagIds.length > 0) {
      const conditions: string[] = []
      for (let i = 0; i < tagIds.length; i += IN_CHUNK_SIZE) {
        conditions.push(`tag_id IN (${tagIds.slice(i, i + IN_CHUNK_SIZE).map(() => '?').join(',')})`)
        params.push(...tagIds.slice(i, i + IN_CHUNK_SIZE))
      }
      sql += ` WHERE ${conditions.join(' OR ')}`
    }

    sql += ` GROUP BY tag_id`
    return this.db.prepare(sql).all(...params) as Array<{ tag_id: number; count: number }>
  }
}

export const interactionDB = new InteractionDB()
