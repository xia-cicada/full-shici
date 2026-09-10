<script setup lang="ts">
import { DataTableColumns, NButton, NTag } from 'naive-ui'
import { useInteractionStore } from '@/stores/interaction'
import BookmarkButton from '@/components/BookmarkButton.vue'

interface PoetryRow {
  id: number
  title: string
  author: string
  rhythmic: string | null
  paragraphs: string[]
  category_id: number
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

// 用户标签列表
const userTags = computed(() => interactionStore.tags)

// 表头配置
const columns: DataTableColumns<PoetryRow> = [
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
    },
    render: (row) => row.paragraphs.join(' ')
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
          type: 'button',
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

onActivated(() => {
  loadBookmarkStatus()
})

// 搜索诗词
const searchPoetry = async (toResetPage = false) => {
  try {
    if (toResetPage) currentPage.value = 1
    isLoading.value = true

    const listOptions = {
      keyword: searchKeyword.value || undefined,
      categoryId: selectedCategory.value || undefined,
      page: currentPage.value,
      limit: pageSize.value
    }

    // 收藏/标签视图由主进程在对应 ID 集合内完成过滤与分页，各一次 IPC
    let result
    if (showFavoritesOnly.value) {
      result = await window.electronAPI.interaction.searchBookmarkedPoetry(listOptions)
    } else if (selectedTag.value) {
      result = await interactionStore.searchTaggedPoetry(selectedTag.value, listOptions)
    } else {
      // 关键词传原文即可：主进程内部会做拼音转换/转义，未命中时再按中文原文搜正文
      result = await window.electronAPI.db.searchPoetry(
        searchKeyword.value,
        listOptions
      )
    }

    poetryList.value = result.results
    totalItems.value = result.total

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

// 加载收藏状态：填充 store 缓存，BookmarkButton 响应式读取
const loadBookmarkStatus = async () => {
  if (poetryList.value.length === 0) return

  await interactionStore.batchCheckBookmarks(poetryList.value.map((p) => p.id))
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
      <n-button @click="showFavoritesOnly = !showFavoritesOnly">
        <template #icon>
          <n-icon>
            <i
              class="i-tabler:heart"
              :class="{ 'text-red i-tabler:heart-filled': showFavoritesOnly }"
            ></i>
          </n-icon>
        </template>
      </n-button>
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
          :row-key="(d) => d.id"
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
