export interface Category {
  id: number
  name: string
  name_pinyin: string
  name_initials: string
  description: string
  created_at: string
  updated_at: string
}

export interface Poetry {
  id: number
  category_id: number
  title: string
  title_pinyin: string
  title_initials: string
  rhythmic: string | null
  rhythmic_pinyin: string | null
  rhythmic_initials: string | null
  author: string
  author_pinyin: string
  author_initials: string
  paragraphs: string[]
  notes: string[]
  tags: string[]
  extra_info: Record<string, any>
  created_at: string
  updated_at: string
  category_name?: string
}

export interface SearchResult {
  rowid: number
  title: string
  author: string
  rhythmic: string
  title_pinyin: string
  author_pinyin: string
  rhythmic_pinyin: string
  title_initials: string
  author_initials: string
  rhythmic_initials: string
}

export interface SearchOptions {
  keyword?: string
  categoryId?: number
  author?: string
  rhythmic?: string
  limit?: number
  offset?: number
}
