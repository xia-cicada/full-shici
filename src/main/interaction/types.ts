// 注解类型
export interface Annotation {
  id: number
  poetry_id: number
  verse_index: number
  start_pos: number
  end_pos: number
  content: string
  created_at: string
  updated_at: string
}

// 笔记类型
export interface Note {
  id: number
  poetry_id: number
  title?: string
  content: string
  created_at: string
  updated_at: string
}

// 标记类型
export interface Bookmark {
  id: number
  poetry_id: number
  type: string
  data?: string
  created_at: string
}

// 标签类型
export interface Tag {
  id: number
  name: string
  color?: string
}
