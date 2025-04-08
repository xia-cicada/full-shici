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

export type SearchResult = Poetry & {
  relevance?: number // bm25 相关性评分
}

export interface PaginatedSearchResult {
  results: SearchResult[]
  total: number
}

export interface SearchOptions {
  keyword?: string
  categoryId?: number
  author?: string
  rhythmic?: string
  limit?: number
  offset?: number
}

// 诗词赏析部分
export interface VocabularyNote {
  word: string
  explanation: string
}

export interface PoetryAnalysis {
  title: string
  author: string
  dynasty: string
  vocabularyNotes: VocabularyNote[]
  contentAnalysis: string
  artisticFeatures: string[]
  emotionalExpression: string
}
