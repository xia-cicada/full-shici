/**
 * 用户交互状态管理
 * 管理收藏、标签等用户交互数据的全局状态
 */
import { defineStore } from 'pinia'
import type { Tag } from '@main/interaction/types'

export const useInteractionStore = defineStore('interaction', () => {
  const message = window.$message

  // ========== 收藏状态管理 ==========

  // 收藏状态缓存 (poetryId -> isBookmarked)
  const bookmarkCache = ref<Map<number, boolean>>(new Map())

  /**
   * 检查诗词是否已收藏
   */
  const isBookmarked = async (poetryId: number): Promise<boolean> => {
    // 优先从缓存读取
    if (bookmarkCache.value.has(poetryId)) {
      return bookmarkCache.value.get(poetryId)!
    }

    // 从数据库查询
    try {
      const bookmark = await window.electronAPI.interaction.getBookmark({
        poetryId,
        type: 'favorite'
      })
      const bookmarked = !!bookmark
      bookmarkCache.value.set(poetryId, bookmarked)
      return bookmarked
    } catch (error) {
      console.error('查询收藏状态失败:', error)
      return false
    }
  }

  /**
   * 批量检查收藏状态
   * @param poetryIds 诗词ID列表
   * @returns Map<poetryId, isBookmarked>
   */
  const batchCheckBookmarks = async (poetryIds: number[]): Promise<Map<number, boolean>> => {
    const results = new Map<number, boolean>()

    // 先从缓存读取
    const uncachedIds: number[] = []
    for (const id of poetryIds) {
      if (bookmarkCache.value.has(id)) {
        results.set(id, bookmarkCache.value.get(id)!)
      } else {
        uncachedIds.push(id)
      }
    }

    // 批量查询未缓存的
    if (uncachedIds.length > 0) {
      try {
        // 获取所有收藏的诗词ID
        const allBookmarks = await window.electronAPI.interaction.getAllBookmarks('favorite')
        const bookmarkedIds = new Set(allBookmarks.map((b) => b.poetry_id))

        // 更新缓存和结果
        for (const id of uncachedIds) {
          const bookmarked = bookmarkedIds.has(id)
          bookmarkCache.value.set(id, bookmarked)
          results.set(id, bookmarked)
        }
      } catch (error) {
        console.error('批量查询收藏状态失败:', error)
        // 查询失败时默认未收藏
        for (const id of uncachedIds) {
          results.set(id, false)
        }
      }
    }

    return results
  }

  /**
   * 切换收藏状态
   */
  const toggleBookmark = async (poetryId: number): Promise<boolean> => {
    try {
      const currentStatus = await isBookmarked(poetryId)

      if (currentStatus) {
        // 取消收藏
        await window.electronAPI.interaction.removeBookmark({
          poetryId,
          type: 'favorite'
        })
        bookmarkCache.value.set(poetryId, false)
        message.success('已取消收藏')
        return false
      } else {
        // 添加收藏
        await window.electronAPI.interaction.setBookmark({
          poetry_id: poetryId,
          type: 'favorite'
        })
        bookmarkCache.value.set(poetryId, true)
        message.success('已添加到收藏')
        return true
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error)
      message.error('操作失败，请重试')
      return await isBookmarked(poetryId)
    }
  }

  /**
   * 清除收藏缓存
   */
  const clearBookmarkCache = () => {
    bookmarkCache.value.clear()
  }

  // ========== 标签管理 ==========

  // 标签列表缓存
  const tags = ref<Tag[]>([])
  const tagsLoaded = ref(false)

  /**
   * 加载所有标签
   */
  const loadTags = async (force = false) => {
    if (tagsLoaded.value && !force) {
      return tags.value
    }

    try {
      tags.value = await window.electronAPI.interaction.getAllTags()
      tagsLoaded.value = true
      return tags.value
    } catch (error) {
      console.error('加载标签失败:', error)
      message.error('加载标签失败')
      return []
    }
  }

  /**
   * 创建新标签
   */
  const createTag = async (name: string, color?: string): Promise<Tag | null> => {
    try {
      const newTag = await window.electronAPI.interaction.createTag({ name, color })
      tags.value.push(newTag)
      message.success('标签创建成功')
      return newTag
    } catch (error) {
      console.error('创建标签失败:', error)
      message.error('创建标签失败')
      return null
    }
  }

  /**
   * 更新标签
   */
  const updateTag = async (id: number, name: string, color?: string): Promise<boolean> => {
    try {
      await window.electronAPI.interaction.updateTag({ id, name, color })
      const index = tags.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tags.value[index] = { ...tags.value[index], name, color, updated_at: Date.now() }
      }
      message.success('标签更新成功')
      return true
    } catch (error) {
      console.error('更新标签失败:', error)
      message.error('更新标签失败')
      return false
    }
  }

  /**
   * 删除标签
   */
  const deleteTag = async (id: number): Promise<boolean> => {
    try {
      await window.electronAPI.interaction.deleteTag(id)
      tags.value = tags.value.filter((t) => t.id !== id)
      message.success('标签删除成功')
      return true
    } catch (error) {
      console.error('删除标签失败:', error)
      message.error('删除标签失败')
      return false
    }
  }

  /**
   * 获取诗词的标签
   */
  const getPoetryTags = async (poetryId: number): Promise<Tag[]> => {
    try {
      return await window.electronAPI.interaction.getTagsByPoetry(poetryId)
    } catch (error) {
      console.error('获取诗词标签失败:', error)
      return []
    }
  }

  /**
   * 给诗词添加标签
   */
  const addTagToPoetry = async (poetryId: number, tagId: number): Promise<boolean> => {
    try {
      await window.electronAPI.interaction.addTagToPoetry({ poetryId, tagId })
      message.success('标签添加成功')
      return true
    } catch (error) {
      console.error('添加标签失败:', error)
      message.error('添加标签失败')
      return false
    }
  }

  /**
   * 移除诗词的标签
   */
  const removeTagFromPoetry = async (poetryId: number, tagId: number): Promise<boolean> => {
    try {
      await window.electronAPI.interaction.removeTagFromPoetry({ poetryId, tagId })
      message.success('标签移除成功')
      return true
    } catch (error) {
      console.error('移除标签失败:', error)
      message.error('移除标签失败')
      return false
    }
  }

  /**
   * 获取标签下的诗词列表
   */
  const getPoetriesByTag = async (tagId: number) => {
    try {
      // 获取诗词 ID 列表
      const poetryIds = await window.electronAPI.interaction.getPoetriesByTag(tagId)

      // 批量查询诗词详情
      const poetries = await Promise.all(
        poetryIds.map((id) => window.electronAPI.db.getPoetryById(id))
      )

      // 过滤掉可能为 null 的结果
      return poetries.filter((p) => p !== null)
    } catch (error) {
      console.error('获取标签诗词列表失败:', error)
      message.error('加载诗词列表失败')
      return []
    }
  }

  // ========== 重置 ==========

  /**
   * 清除所有缓存
   */
  const clearCache = () => {
    clearBookmarkCache()
    tags.value = []
    tagsLoaded.value = false
  }

  return {
    // 收藏
    bookmarkCache,
    isBookmarked,
    batchCheckBookmarks,
    toggleBookmark,
    clearBookmarkCache,

    // 标签
    tags,
    tagsLoaded,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    getPoetryTags,
    addTagToPoetry,
    removeTagFromPoetry,
    getPoetriesByTag,

    // 工具
    clearCache
  }
})
