import { ModelConfig } from '../main/ai/types'
import {
  Category,
  Poetry,
  SearchOptions,
  PaginatedSearchResult,
  PoetryAnalysis
} from '../main/poetry/types'
import { Annotation, Bookmark, Note, Tag } from '../main/interaction/types'

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

export interface AIAPI {
  analyzePoetry: (poetry: Poetry) => Promise<PoetryAnalysis | null>
  addModelConfig: (config: ModelConfig) => Promise<ModelConfig>
  updateModelConfig: (id: number, config: Partial<ModelConfig>) => Promise<ModelConfig | null>
  getAllModelConfigs: () => Promise<ModelConfig[]>
  getModelConfigById: (id: number) => Promise<ModelConfig | null>
  getModelConfigByName: (name: string) => Promise<ModelConfig | null>
  getDefaultModelConfig: () => Promise<ModelConfig | null>
  deleteModelConfig: (id: number) => Promise<boolean>
}

export interface InteractionAPI {
  // ========== 注解相关API ==========
  addAnnotation: (params: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
  getAnnotationsByPoetry: (poetryId: number) => Promise<Annotation[]>
  getAnnotationsByVerse: (params: { poetryId: number; verseIndex: number }) => Promise<Annotation[]>
  updateAnnotation: (params: Pick<Annotation, 'id' | 'content'>) => Promise<void>
  deleteAnnotation: (id: number) => Promise<void>

  // ========== 笔记相关API ==========
  addNote: (params: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
  getNotesByPoetry: (poetryId: number) => Promise<Note[]>
  getNote: (id: number) => Promise<Note | null>
  updateNote: (params: Pick<Note, 'id' | 'title' | 'content'>) => Promise<void>
  deleteNote: (id: number) => Promise<void>

  // ========== 标记相关API ==========
  setBookmark: (params: Omit<Bookmark, 'id' | 'created_at'>) => Promise<void>
  getBookmark: (params: { poetryId: number; type: string }) => Promise<Bookmark | null>
  getAllBookmarks: (type?: string) => Promise<Bookmark[]>
  removeBookmark: (params: { poetryId: number; type: string }) => Promise<void>

  // ========== 标签相关API ==========
  createTag: (params: Omit<Tag, 'id'>) => Promise<number>
  getAllTags: () => Promise<Tag[]>
  updateTag: (params: Pick<Tag, 'id' | 'name' | 'color'>) => Promise<void>
  deleteTag: (id: number) => Promise<void>
  addTagToPoetry: (params: { poetryId: number; tagId: number }) => Promise<void>
  getTagsByPoetry: (poetryId: number) => Promise<Tag[]>
  getPoetriesByTag: (tagId: number) => Promise<number[]>
  removeTagFromPoetry: (params: { poetryId: number; tagId: number }) => Promise<void>
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
  ai: AIAPI
  interaction: InteractionAPI
}
