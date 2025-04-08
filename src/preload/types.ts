import { Category, Poetry, SearchOptions, PaginatedSearchResult } from '../main/db/types'

export interface PoetryDBAPI {
  // 分类相关
  getAllCategories: () => Promise<Category[]>
  getCategoryById: (id: number) => Promise<Category | null>

  // 诗词相关
  getPoetryCount: (options?: SearchOptions) => Promise<number>
  getPoetryList: (options?: SearchOptions) => Promise<Poetry[]>
  getPoetryById: (id: number) => Promise<Poetry | null>
  getRandomPoetry: (count?: number) => Promise<Poetry[]>

  // 搜索相关
  searchPoetry: (
    keyword: string,
    options: {
      categoryId?: number
      limit?: number
    }
  ) => Promise<PaginatedSearchResult>

  // 元数据相关
  getAllAuthors: () => Promise<string[]>
  getAllRhythmics: () => Promise<string[]>

  // 添加新诗词
  addPoetry: (poetry: Omit<Poetry, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
}

export interface ExposedApi {
  // 窗口控制
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<void>
  close: () => Promise<void>
  onMaximized: (fn: () => void) => void
  onUnmaximized: (fn: () => void) => void

  // 数据库访问
  db: PoetryDBAPI
}
