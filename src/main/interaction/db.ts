import { userData } from '../userData/db'
import { Annotation, Bookmark, Note, Tag } from './types'

export class InteractionDB {
  private userData = userData
  private db = userData.getDatabase()

  constructor() {
    this.initTable()
  }

  initTable() {
    const migrationScript = `
    -- 注解表（基于诗句数组定位）
    CREATE TABLE IF NOT EXISTS annotation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      verse_index INTEGER NOT NULL,   -- 第几句，第0句表示标题
      start_pos INTEGER NOT NULL,     -- 该句中的起始位置
      end_pos INTEGER NOT NULL,       -- 该句中的结束位置
      content TEXT NOT NULL,          -- 注解内容
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poetry_id) REFERENCES poetry(id) ON DELETE CASCADE
    );

    -- 笔记表
    CREATE TABLE IF NOT EXISTS note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      title TEXT,                     -- 笔记标题
      content TEXT NOT NULL,          -- 笔记内容
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poetry_id) REFERENCES poetry(id) ON DELETE CASCADE
    );

    -- 标记表（收藏、点赞等）
    CREATE TABLE IF NOT EXISTS bookmark (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      type TEXT NOT NULL,             -- 标记类型（收藏，点赞等）
      data TEXT,                      -- 额外数据
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poetry_id) REFERENCES poetry(id) ON DELETE CASCADE,
      UNIQUE(poetry_id, type)         -- 防止重复标记
    );

    -- 标签表
    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,      -- 标签名称
      color TEXT                      -- 标签颜色
    );

    -- 诗词-标签关联表
    CREATE TABLE IF NOT EXISTS poetry_tag (
      poetry_id INTEGER NOT NULL,     -- 关联的诗词ID
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (poetry_id, tag_id),
      FOREIGN KEY (poetry_id) REFERENCES poetry(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
    );

    -- 创建索引提高查询性能
    CREATE INDEX IF NOT EXISTS idx_annotation_poetry_id ON annotation(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_note_poetry_id ON note(poetry_id);
    CREATE INDEX IF NOT EXISTS idx_bookmark_poetry_id ON bookmark(poetry_id);
    `

    this.userData.migrate(2, migrationScript)
  }

  // ========== 注解相关方法 ==========

  addAnnotation(params: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) {
    const stmt = this.db.prepare(`
      INSERT INTO annotation (poetry_id, verse_index, start_pos, end_pos, content)
      VALUES (?, ?, ?, ?, ?)
    `)
    return stmt.run(
      params.poetry_id,
      params.verse_index,
      params.start_pos,
      params.end_pos,
      params.content
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

  getAnnotationsByVerse(params: Pick<Annotation, 'poetry_id' | 'verse_index'>) {
    const stmt = this.db.prepare(`
      SELECT * FROM annotation
      WHERE poetry_id = ? AND verse_index = ?
      ORDER BY start_pos
    `)
    return stmt.all(params.poetry_id, params.verse_index)
  }

  updateAnnotation(params: Pick<Annotation, 'id' | 'content'>) {
    const stmt = this.db.prepare(`
      UPDATE annotation
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(params.content, params.id)
  }

  deleteAnnotation(id: number) {
    const stmt = this.db.prepare(`DELETE FROM annotation WHERE id = ?`)
    return stmt.run(id)
  }

  // ========== 笔记相关方法 ==========

  addNote(params: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
    const stmt = this.db.prepare(`
      INSERT INTO note (poetry_id, title, content)
      VALUES (?, ?, ?)
    `)
    return stmt.run(params.poetry_id, params.title, params.content)
  }

  getNotesByPoetry(poetryId: number) {
    const stmt = this.db.prepare(`
      SELECT * FROM note
      WHERE poetry_id = ?
      ORDER BY created_at DESC
    `)
    return stmt.all(poetryId)
  }

  getNote(id: number) {
    const stmt = this.db.prepare(`SELECT * FROM note WHERE id = ?`)
    return stmt.get(id)
  }

  updateNote(params: Pick<Note, 'id' | 'title' | 'content'>) {
    const stmt = this.db.prepare(`
      UPDATE note
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(params.title, params.content, params.id)
  }

  deleteNote(id: number) {
    const stmt = this.db.prepare(`DELETE FROM note WHERE id = ?`)
    return stmt.run(id)
  }

  // ========== 标记相关方法 ==========

  setBookmark(params: Omit<Bookmark, 'id' | 'created_at'>) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO bookmark (poetry_id, type, data, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `)
    return stmt.run(params.poetry_id, params.type, params.data)
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

  // ========== 标签相关方法 ==========

  createTag(params: Omit<Tag, 'id'>) {
    const stmt = this.db.prepare(`
      INSERT INTO tag (name, color)
      VALUES (?, ?)
    `)
    return stmt.run(params.name, params.color)
  }

  getAllTags() {
    const stmt = this.db.prepare(`SELECT * FROM tag ORDER BY name`)
    return stmt.all()
  }

  updateTag(params: Pick<Tag, 'id' | 'name' | 'color'>) {
    const stmt = this.db.prepare(`
      UPDATE tag
      SET name = ?, color = ?
      WHERE id = ?
    `)
    return stmt.run(params.name, params.color, params.id)
  }

  deleteTag(id: number) {
    // 先删除关联关系
    this.db.prepare(`DELETE FROM poetry_tag WHERE tag_id = ?`).run(id)
    // 再删除标签
    const stmt = this.db.prepare(`DELETE FROM tag WHERE id = ?`)
    return stmt.run(id)
  }

  addTagToPoetry(poetryId: number, tagId: number) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO poetry_tag (poetry_id, tag_id)
      VALUES (?, ?)
    `)
    return stmt.run(poetryId, tagId)
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

  getPoetriesByTag(tagId: number) {
    const stmt = this.db.prepare(`
      SELECT p.* FROM poetry p
      JOIN poetry_tag pt ON p.id = pt.poetry_id
      WHERE pt.tag_id = ?
      ORDER BY p.title
    `)
    return stmt.all(tagId)
  }

  removeTagFromPoetry(poetryId: number, tagId: number) {
    const stmt = this.db.prepare(`
      DELETE FROM poetry_tag
      WHERE poetry_id = ? AND tag_id = ?
    `)
    return stmt.run(poetryId, tagId)
  }
}

export const interactionDB = new InteractionDB()
