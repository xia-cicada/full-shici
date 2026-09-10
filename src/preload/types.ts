import { ModelConfig } from '../main/ai/types'
import { Category, Poetry, SearchOptions, PaginatedSearchResult, PoetryAnalysis } from '../main/poetry/types'
import { Annotation, Bookmark, Note, Tag, AnnotationInput, BookmarkInput, NoteInput } from '../main/interaction/types'

export interface PoetryDBAPI {
  // 数据库状态（诗词库文件是否存在，用于缺库引导）
  getStatus: () => Promise<{ ready: boolean; dbPath: string }>

  // 分类相关
  getAllCategories: () => Promise<Category[]>
  getCategoryById: (id: number) => Promise<Category | null>

  // 诗词相关
  getPoetryCount: (options?: SearchOptions) => Promise<number>
  getPoetryList: (options?: SearchOptions) => Promise<Poetry[]>
  getPoetryById: (id: number) => Promise<Poetry | null>
  getRandomPoetry: (count?: number) => Promise<Poetry[]>

  // 搜索相关（关键词传原文即可，主进程内部会做拼音转换与转义）
  searchPoetry: (
    keyword: string,
    options: {
      categoryId?: number
      page?: number
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
  analyzePoetry: (poetry: Poetry, force?: boolean) => Promise<PoetryAnalysis>
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
  addAnnotation: (params: AnnotationInput) => Promise<number>
  getAnnotationsByPoetry: (poetryId: number) => Promise<Annotation[]>
  getAnnotationsByVerse: (params: {
    poetryId: number
    verseIndex: number
  }) => Promise<Annotation[]>
  updateAnnotation: (params: Pick<Annotation, 'id' | 'content'>) => Promise<void>
  deleteAnnotation: (id: number) => Promise<void>

  // ========== 笔记相关API ==========
  addNote: (params: NoteInput) => Promise<number>
  getNotesByPoetry: (poetryId: number) => Promise<Note[]>
  getNotesSummaryByPoetry: (
    poetryId: number
  ) => Promise<{ latestContent: string | null; totalCount: number }>
  getNote: (id: number) => Promise<Note | null>
  updateNote: (params: Pick<Note, 'id' | 'title' | 'content'>) => Promise<void>
  deleteNote: (id: number) => Promise<void>

  // ========== 标记相关API ==========
  setBookmark: (params: BookmarkInput) => Promise<void>
  getBookmark: (params: { poetryId: number; type: string }) => Promise<Bookmark | null>
  getAllBookmarks: (type?: string) => Promise<Bookmark[]>
  removeBookmark: (params: { poetryId: number; type: string }) => Promise<void>
  /**批量查询给定诗词中已收藏的ID（默认收藏类型） */
  filterBookmarkedIds: (poetryIds: number[], type?: string) => Promise<number[]>
  /**在收藏集合内搜索/分页诗词（单次 IPC 完成过滤+分页） */
  searchBookmarkedPoetry: (
    options?: { keyword?: string; categoryId?: number; page?: number; limit?: number }
  ) => Promise<PaginatedSearchResult>

  // ========== 标签相关API ==========
  createTag: (params: Omit<Tag, 'id' | 'created_at' | 'updated_at'>) => Promise<Tag>
  getAllTags: () => Promise<Tag[]>
  updateTag: (params: Pick<Tag, 'id' | 'name' | 'color'>) => Promise<Tag>
  deleteTag: (id: number) => Promise<void>
  addTagToPoetry: (params: { poetryId: number; tagId: number }) => Promise<void>
  getTagsByPoetry: (poetryId: number) => Promise<Tag[]>
  getPoetriesByTag: (tagId: number) => Promise<number[]>
  removeTagFromPoetry: (params: { poetryId: number; tagId: number }) => Promise<void>
  /**统计各标签下的诗词数量 */
  getTagPoetryCounts: (
    tagIds?: number[]
  ) => Promise<Array<{ tagId: number; count: number }>>
  /**在标签集合内搜索/分页诗词（单次 IPC 完成过滤+分页） */
  searchTaggedPoetry: (
    options: { tagId: number; keyword?: string; categoryId?: number; page?: number; limit?: number }
  ) => Promise<PaginatedSearchResult>
}

export interface ExposedApi {
  // 窗口控制
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<void>
  close: () => Promise<void>
  relaunch: () => Promise<void>
  onMaximized: (fn: () => void) => () => void
  onUnmaximized: (fn: () => void) => () => void

  // 数据库访问
  db: PoetryDBAPI
  ai: AIAPI
  interaction: InteractionAPI
}
