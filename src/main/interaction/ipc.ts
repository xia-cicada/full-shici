import { ipcMain } from 'electron'
import { interactionDB } from './db'
import { Annotation, Bookmark, Note, Tag } from './types'

export function setupInteractionDatabaseIPC() {
  // ========== 注解相关IPC ==========
  ipcMain.handle(
    'interaction-add-annotation',
    (_, params: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => {
      return interactionDB.addAnnotation(params)
    }
  )

  ipcMain.handle('interaction-get-annotations-by-poetry', (_, poetryId: number) => {
    return interactionDB.getAnnotationsByPoetry(poetryId)
  })

  ipcMain.handle(
    'interaction-get-annotations-by-verse',
    (_, params: Pick<Annotation, 'poetry_id' | 'verse_index'>) => {
      return interactionDB.getAnnotationsByVerse(params)
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
  ipcMain.handle(
    'interaction-add-note',
    (_, params: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
      return interactionDB.addNote(params)
    }
  )

  ipcMain.handle('interaction-get-notes-by-poetry', (_, poetryId: number) => {
    return interactionDB.getNotesByPoetry(poetryId)
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
  ipcMain.handle('interaction-set-bookmark', (_, params: Omit<Bookmark, 'id' | 'created_at'>) => {
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
  ipcMain.handle('interaction-create-tag', (_, params: Omit<Tag, 'id'>) => {
    return interactionDB.createTag(params)
  })

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
