// 注解类型
export interface Annotation {
  id: number
  poetry_id: number
  verse_index: number
  start_pos: number
  end_pos: number
  content: string
  created_at: number
  updated_at: number
}

// 笔记类型
export interface Note {
  id: number
  poetry_id: number
  title?: string
  content: string
  created_at: number
  updated_at: number
}

// 标记类型
export interface Bookmark {
  id: number
  poetry_id: number
  type: string
  data?: string
  created_at: number
}

// 标签类型
export interface Tag {
  id: number
  name: string
  color?: string
  created_at: number
  updated_at: number
}

// ===== 渲染层 IPC 输入参数（统一驼峰命名，与上面数据库行的 snake_case 列名区分） =====

export interface AnnotationInput {
  poetryId: number
  verseIndex: number
  startPos: number
  endPos: number
  content: string
}

export interface NoteInput {
  poetryId: number
  title?: string
  content: string
}

export interface BookmarkInput {
  poetryId: number
  type: string
  data?: string
}
