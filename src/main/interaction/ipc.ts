import { ipcMain } from 'electron'
import { interactionDB } from './db'
import { poetryDB } from '../poetry/db'
import { Annotation, AnnotationInput, BookmarkInput, Note, NoteInput, Tag } from './types'

/**收藏/标签视图共用的查询条件 */
interface PoetryListOptions {
  keyword?: string
  categoryId?: number
  page?: number
  limit?: number
}

export function setupInteractionDatabaseIPC() {
  // ========== 收藏/标签视图的跨库组合查询 ==========
  // 诗词库与用户库是两个独立 sqlite 文件，无法 SQL JOIN：
  // 先在用户库取 ID 集合，再让诗词库在 ID 集合内完成过滤/搜索/分页（各一次 IPC）

  ipcMain.handle('interaction-search-bookmarked-poetry', (_, options: PoetryListOptions = {}) => {
    const ids = interactionDB.getBookmarkPoetryIds('favorite')
    return poetryDB.searchPoetry(options.keyword ?? '', { ...options, ids })
  })

  ipcMain.handle(
    'interaction-search-tagged-poetry',
    (_, options: PoetryListOptions & { tagId: number }) => {
      const { tagId, ...listOptions } = options
      const ids = interactionDB.getPoetriesByTag(tagId)
      return poetryDB.searchPoetry(listOptions.keyword ?? '', { ...listOptions, ids })
    }
  )

  ipcMain.handle('interaction-filter-bookmarked-ids', (_, poetryIds: number[], type?: string) => {
    return interactionDB.filterBookmarkedIds(poetryIds, type || 'favorite')
  })

  ipcMain.handle('interaction-get-tag-poetry-counts', (_, tagIds?: number[]) => {
    const rows = interactionDB.getTagPoetryCounts(tagIds)
    return rows.map((r) => ({ tagId: r.tag_id, count: r.count }))
  })

  // ========== 注解相关IPC ==========
  ipcMain.handle('interaction-add-annotation', (_, params: AnnotationInput) => {
    return interactionDB.addAnnotation(params)
  })

  ipcMain.handle('interaction-get-annotations-by-poetry', (_, poetryId: number) => {
    return interactionDB.getAnnotationsByPoetry(poetryId)
  })

  ipcMain.handle(
    'interaction-get-annotations-by-verse',
    (_, params: { poetryId: number; verseIndex: number }) => {
      return interactionDB.getAnnotationsByVerse(params.poetryId, params.verseIndex)
    }
  )

  ipcMain.handle(
    'interaction-update-annotation',
    (_, params: Pick<Annotation, 'id' | 'content'>) => {
      return interactionDB.updateAnnotation(params)
    }
  )

  ipcMain.handle('interaction-delete-annotation', (_, id: number) => {
    return interactionDB.deleteAnnotation(id)
  })

  // ========== 笔记相关IPC ==========
  ipcMain.handle('interaction-add-note', (_, params: NoteInput) => {
    return interactionDB.addNote(params)
  })

  ipcMain.handle('interaction-get-notes-by-poetry', (_, poetryId: number) => {
    return interactionDB.getNotesByPoetry(poetryId)
  })

  ipcMain.handle('interaction-get-notes-summary-by-poetry', (_, poetryId: number) => {
    return interactionDB.getNotesSummaryByPoetry(poetryId)
  })

  ipcMain.handle('interaction-get-note', (_, id: number) => {
    return interactionDB.getNote(id)
  })

  ipcMain.handle('interaction-update-note', (_, params: Pick<Note, 'id' | 'title' | 'content'>) => {
    return interactionDB.updateNote(params)
  })

  ipcMain.handle('interaction-delete-note', (_, id: number) => {
    return interactionDB.deleteNote(id)
  })

  // ========== 标记相关IPC ==========
  ipcMain.handle('interaction-set-bookmark', (_, params: BookmarkInput) => {
    return interactionDB.setBookmark(params)
  })

  ipcMain.handle('interaction-get-bookmark', (_, params: { poetryId: number; type: string }) => {
    return interactionDB.getBookmark(params.poetryId, params.type)
  })

  ipcMain.handle('interaction-get-all-bookmarks', (_, type?: string) => {
    return interactionDB.getAllBookmarks(type)
  })

  ipcMain.handle('interaction-remove-bookmark', (_, params: { poetryId: number; type: string }) => {
    return interactionDB.removeBookmark(params.poetryId, params.type)
  })

  // ========== 标签相关IPC ==========
  ipcMain.handle(
    'interaction-create-tag',
    (_, params: Omit<Tag, 'id' | 'created_at' | 'updated_at'>) => {
      return interactionDB.createTag(params)
    }
  )

  ipcMain.handle('interaction-get-all-tags', () => {
    return interactionDB.getAllTags()
  })

  ipcMain.handle('interaction-update-tag', (_, params: Pick<Tag, 'id' | 'name' | 'color'>) => {
    return interactionDB.updateTag(params)
  })

  ipcMain.handle('interaction-delete-tag', (_, id: number) => {
    return interactionDB.deleteTag(id)
  })

  ipcMain.handle(
    'interaction-add-tag-to-poetry',
    (_, params: { poetryId: number; tagId: number }) => {
      return interactionDB.addTagToPoetry(params.poetryId, params.tagId)
    }
  )

  ipcMain.handle('interaction-get-tags-by-poetry', (_, poetryId: number) => {
    return interactionDB.getTagsByPoetry(poetryId)
  })

  ipcMain.handle('interaction-get-poetries-by-tag', (_, tagId: number) => {
    return interactionDB.getPoetriesByTag(tagId)
  })

  ipcMain.handle(
    'interaction-remove-tag-from-poetry',
    (_, params: { poetryId: number; tagId: number }) => {
      return interactionDB.removeTagFromPoetry(params.poetryId, params.tagId)
    }
  )
}
