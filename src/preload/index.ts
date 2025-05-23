import { contextBridge, ipcRenderer } from 'electron'
import { ExposedApi } from './types'
import { ModelConfig } from '../main/ai/types'

// Custom APIs for renderer
const electronAPI: ExposedApi = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  onMaximized: (fn: Function) => {
    ipcRenderer.on('window-maximized', () => {
      fn()
    })
  },
  onUnmaximized: (fn: Function) => {
    ipcRenderer.on('window-unmaximized', () => {
      fn()
    })
  },

  // 数据库方法
  db: {
    getAllCategories: () => ipcRenderer.invoke('db-get-all-categories'),
    getCategoryById: (id) => ipcRenderer.invoke('db-get-category', id),

    // 诗词相关
    getPoetryCount: (options) => ipcRenderer.invoke('db-get-poetry-count', options),
    getPoetryList: (options) => ipcRenderer.invoke('db-get-poetry-list', options),
    getPoetryById: (id) => ipcRenderer.invoke('db-get-poetry-by-id', id),
    getRandomPoetry: (count) => ipcRenderer.invoke('db-get-random-poetry', count),

    // 搜索相关
    searchPoetry: (keyword, options) => ipcRenderer.invoke('db-search', keyword, options),

    // 元数据相关
    getAllAuthors: () => ipcRenderer.invoke('db-get-all-authors'),
    getAllRhythmics: () => ipcRenderer.invoke('db-get-all-rhythmics'),

    // 添加新诗词
    addPoetry: (poetry) => ipcRenderer.invoke('db-add-poetry', poetry)
  },

  ai: {
    analyzePoetry: (poetry) => ipcRenderer.invoke('ai-analyze-poetry', poetry),
    addModelConfig: (config: ModelConfig) => ipcRenderer.invoke('ai-add-model-config', config),
    updateModelConfig: (id: number, config: Partial<ModelConfig>) =>
      ipcRenderer.invoke('ai-update-model-config', id, config),
    getAllModelConfigs: () => ipcRenderer.invoke('ai-get-all-model-configs'),
    getModelConfigById: (id: number) => ipcRenderer.invoke('ai-get-model-config-by-id', id),
    getModelConfigByName: (name: string) => ipcRenderer.invoke('ai-get-model-config-by-name', name),
    getDefaultModelConfig: () => ipcRenderer.invoke('ai-get-default-model-config'),
    deleteModelConfig: (id: number) => ipcRenderer.invoke('ai-delete-model-config', id)
  },

  interaction: {
    // 注解相关
    addAnnotation: (annotation) => ipcRenderer.invoke('interaction-add-annotation', annotation),
    getAnnotationsByPoetry: (poetryId) =>
      ipcRenderer.invoke('interaction-get-annotations-by-poetry', poetryId),
    getAnnotationsByVerse: (params) =>
      ipcRenderer.invoke(
        'interaction-get-annotations-by-verse',
        params.poetryId,
        params.verseIndex
      ),
    updateAnnotation: (params) =>
      ipcRenderer.invoke('interaction-update-annotation', params.id, params.content),
    deleteAnnotation: (id) => ipcRenderer.invoke('interaction-delete-annotation', id),

    // 笔记相关
    addNote: (note) => ipcRenderer.invoke('interaction-add-note', note),
    getNotesByPoetry: (poetryId) => ipcRenderer.invoke('interaction-get-notes-by-poetry', poetryId),
    getNote: (id) => ipcRenderer.invoke('interaction-get-note', id),
    updateNote: (params) =>
      ipcRenderer.invoke('interaction-update-note', params.id, params.title, params.content),
    deleteNote: (id) => ipcRenderer.invoke('interaction-delete-note', id),

    // 标记相关
    setBookmark: (bookmark) => ipcRenderer.invoke('interaction-set-bookmark', bookmark),
    getBookmark: (params) =>
      ipcRenderer.invoke('interaction-get-bookmark', params.poetryId, params.type),
    getAllBookmarks: (type) => ipcRenderer.invoke('interaction-get-all-bookmarks', type),
    removeBookmark: (params) =>
      ipcRenderer.invoke('interaction-remove-bookmark', params.poetryId, params.type),

    // 标签相关
    createTag: (tag) => ipcRenderer.invoke('interaction-create-tag', tag),
    getAllTags: () => ipcRenderer.invoke('interaction-get-all-tags'),
    updateTag: (params) =>
      ipcRenderer.invoke('interaction-update-tag', params.id, params.name, params.color),
    deleteTag: (id) => ipcRenderer.invoke('interaction-delete-tag', id),
    addTagToPoetry: (params) =>
      ipcRenderer.invoke('interaction-add-tag-to-poetry', params.poetryId, params.tagId),
    getTagsByPoetry: (poetryId) => ipcRenderer.invoke('interaction-get-tags-by-poetry', poetryId),
    getPoetriesByTag: (tagId) => ipcRenderer.invoke('interaction-get-poetries-by-tag', tagId),
    removeTagFromPoetry: (params) =>
      ipcRenderer.invoke('interaction-remove-tag-from-poetry', params.poetryId, params.tagId)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
