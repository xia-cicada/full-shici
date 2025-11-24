<script setup lang="ts">
import { getPy } from '@/utils'
import { DataTableColumns, NButton, NTag } from 'naive-ui'
import { useInteractionStore } from '@/stores/interaction'
import BookmarkButton from '@/components/BookmarkButton.vue'

interface PoetryRow {
  id: number
  title: string
  author: string
  rhythmic: string | null
  paragraphs: string[]
  category_name: string
}

interface Category {
  id: number
  name: string
}

const searchKeyword = ref('')
const selectedCategory = ref<number | null>(null)
const selectedTag = ref<number | null>(null)
const showFavoritesOnly = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const isLoading = ref(false)
const poetryList = ref<PoetryRow[]>([])
const categories = ref<Category[]>([])

const router = useRouter()
const interactionStore = useInteractionStore()

// 收藏状态缓存 (用于当前页的快速显示)
const bookmarkStatus = ref<Map<number, boolean>>(new Map())

// 用户标签列表
const userTags = computed(() => interactionStore.tags)

// 表头配置
const columns: DataTableColumns<PoetryRow> = [
  {
    title: '',
    key: 'bookmark',
    width: 50,
    render: (row) => {
      const isBookmarked = bookmarkStatus.value.get(row.id) || false
      return h('div', { class: 'flex justify-center' }, [
        h('div', {
          class: isBookmarked ? 'i-tabler-heart-filled text-red-500' : 'i-tabler-heart text-gray-400',
          style: { fontSize: '18px' }
        })
      ])
    }
  },
  {
    title: '标题',
    key: 'title',
    width: 200,
    render: (row) => h('span', { class: 'font-bold' }, row.title)
  },
  {
    title: '作者',
    key: 'author',
    width: 120
  },
  {
    title: '词牌',
    key: 'rhythmic',
    render: (row) => (row.rhythmic ? h(NTag, {}, () => row.rhythmic) : null)
  },
  {
    title: '分类',
    key: 'category_name',
    width: 100
  },
  {
    title: '内容',
    key: 'paragraphs',
    width: 200,
    ellipsis: {
      tooltip: false
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) =>
      h('div', { class: 'flex gap-2' }, [
        h(BookmarkButton, {
          poetryId: row.id,
          size: 'small',
          type: 'icon',
          onBookmarkChanged: () => loadBookmarkStatus()
        }),
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => viewDetail(row.id)
          },
          () => '详情'
        )
      ])
  }
]

// 加载分类数据
const loadCategories = async () => {
  try {
    categories.value = await window.electronAPI.db.getAllCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 搜索诗词
const searchPoetry = async (toResetPage = false) => {
  try {
    if (toResetPage) currentPage.value = 1
    isLoading.value = true

    // 如果选择了只看收藏，则按收藏查询
    if (showFavoritesOnly.value) {
      await searchByFavorites()
      return
    }

    // 如果选择了标签，则按标签查询
    if (selectedTag.value) {
      await searchByTag()
      return
    }

    const options = {
      keyword: searchKeyword.value,
      categoryId: selectedCategory.value || undefined,
      page: currentPage.value,
      limit: pageSize.value
    }

    // 由于诗词简繁体都有并且不好区分，因此查询关键字使用拼音做适配
    const { results, total } = await window.electronAPI.db.searchPoetry(
      getPy(options.keyword),
      options
    )

    poetryList.value = results as PoetryRow[]
    totalItems.value = total as number

    // 加载收藏状态
    await loadBookmarkStatus()
  } catch (error) {
    console.error('搜索失败:', error)
    poetryList.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 按收藏搜索诗词
const searchByFavorites = async () => {
  try {
    isLoading.value = true

    // 获取所有收藏的诗词ID
    const bookmarks = await window.electronAPI.interaction.getAllBookmarks('favorite')
    const favoriteIds = bookmarks.map((b) => b.poetry_id)

    if (favoriteIds.length === 0) {
      poetryList.value = []
      totalItems.value = 0
      return
    }

    // 批量查询诗词详情
    const allPoetries = await Promise.all(
      favoriteIds.map((id) => window.electronAPI.db.getPoetryById(id))
    )

    // 过滤掉 null 结果
    let filteredPoetries = allPoetries.filter((p) => p !== null) as PoetryRow[]

    // 应用分类过滤
    if (selectedCategory.value) {
      filteredPoetries = filteredPoetries.filter((p) => p.category_id === selectedCategory.value)
    }

    // 应用关键词过滤
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      filteredPoetries = filteredPoetries.filter(
        (p) =>
          p.title.toLowerCase().includes(keyword) ||
          p.author.toLowerCase().includes(keyword) ||
          (p.rhythmic && p.rhythmic.toLowerCase().includes(keyword)) ||
          p.paragraphs.some((para) => para.toLowerCase().includes(keyword))
      )
    }

    // 分页
    totalItems.value = filteredPoetries.length
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    poetryList.value = filteredPoetries.slice(start, end)

    // 加载收藏状态（都是已收藏的）
    await loadBookmarkStatus()
  } catch (error) {
    console.error('按收藏搜索失败:', error)
    poetryList.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 按标签搜索诗词
const searchByTag = async () => {
  if (!selectedTag.value) return

  try {
    isLoading.value = true

    // 获取标签下的所有诗词ID
    let poetries = await interactionStore.getPoetriesByTag(selectedTag.value)

    // 应用分类过滤
    if (selectedCategory.value) {
      poetries = poetries.filter((p: any) => p.category_id === selectedCategory.value)
    }

    // 应用关键词过滤
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      poetries = poetries.filter(
        (p: any) =>
          p.title.toLowerCase().includes(keyword) ||
          p.author.toLowerCase().includes(keyword) ||
          (p.rhythmic && p.rhythmic.toLowerCase().includes(keyword)) ||
          p.paragraphs.some((para: string) => para.toLowerCase().includes(keyword))
      )
    }

    // 分页
    totalItems.value = poetries.length
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    const pagePoetries = poetries.slice(start, end)

    poetryList.value = pagePoetries as PoetryRow[]

    // 加载收藏状态
    await loadBookmarkStatus()
  } catch (error) {
    console.error('按标签搜索失败:', error)
    poetryList.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 加载收藏状态
const loadBookmarkStatus = async () => {
  if (poetryList.value.length === 0) return

  const poetryIds = poetryList.value.map((p) => p.id)
  const statuses = await interactionStore.batchCheckBookmarks(poetryIds)
  bookmarkStatus.value = statuses
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  selectedCategory.value = null
  selectedTag.value = null
  showFavoritesOnly.value = false
  searchPoetry(true)
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 监听筛选条件变化，自动触发搜索
watch([selectedCategory, selectedTag, showFavoritesOnly], () => {
  searchPoetry(true)
})

// 初始化加载数据
onMounted(() => {
  loadCategories()
  interactionStore.loadTags() // 加载用户标签
  searchPoetry(true)
})
</script>

<template>
  <main class="overflow-hidden grid grid-rows-[auto_1fr] p-1">
    <n-flex class="p-3" align="center">
      <n-input
        v-model:value="searchKeyword"
        placeholder="输入关键词搜索"
        clearable
        style="width: 300px"
        @keyup.enter="searchPoetry(true)"
      />
      <n-select
        v-model:value="selectedCategory"
        :options="categories.map((c) => ({ label: c.name, value: c.id }))"
        placeholder="选择分类"
        clearable
        style="width: 150px"
      />
      <n-select
        v-model:value="selectedTag"
        :options="userTags.map((t) => ({ label: t.name, value: t.id }))"
        placeholder="选择标签"
        clearable
        style="width: 150px"
      />
      <n-switch v-model:value="showFavoritesOnly">
        <template #checked>
          <n-flex align="center" :size="4">
            <div class="i-tabler-heart-filled" />
            <span>只看收藏</span>
          </n-flex>
        </template>
        <template #unchecked>
          <n-flex align="center" :size="4">
            <div class="i-tabler-heart" />
            <span>全部</span>
          </n-flex>
        </template>
      </n-switch>
      <n-button type="primary" @click="searchPoetry(true)">
        <template #icon>
          <div class="i-tabler-search" />
        </template>
        搜索
      </n-button>
      <n-button @click="resetSearch">重置</n-button>
    </n-flex>

    <n-spin
      content-class="h-full box-border overflow-hidden grid grid-cols-1 grid-rows-[1fr_min-content] gap-3 justify-items-center p-3"
      :show="isLoading"
    >
      <div>
        <n-data-table
          :columns="columns"
          :data="poetryList"
          :bordered="true"
          style="height: 100%"
          flex-height
        />
      </div>

      <n-pagination
        v-model:page="currentPage"
        :page-count="Math.ceil(totalItems / pageSize)"
        :page-size="pageSize"
        :page-sizes="[10, 20, 30, 50]"
        show-size-picker
        @update:page="searchPoetry(false)"
        @update:page-size="
          (size) => {
            pageSize = size
            searchPoetry(true)
          }
        "
      />
    </n-spin>
  </main>
</template>

<style scoped></style>
