<template>
  <main class="h-full overflow-hidden grid grid-rows-[auto_auto_1fr] p-1">
    <!-- 顶部标题栏 -->
    <n-flex class="p-3 items-center">
      <n-button quaternary @click="router.back()">
        <div class="i-tabler-arrow-left text-xl" />
      </n-button>
      <n-h2 class="m-0">我的收藏</n-h2>
      <n-text depth="3" class="ml-2">共 {{ filteredTotal }} 首诗词</n-text>
    </n-flex>

    <!-- 搜索和筛选栏 -->
    <n-flex class="px-3 pb-3" align="center">
      <n-input
        v-model:value="searchKeyword"
        placeholder="搜索收藏的诗词"
        clearable
        style="width: 300px"
        @input="filterFavorites"
      >
        <template #prefix>
          <div class="i-tabler-search" />
        </template>
      </n-input>
      <n-select
        v-model:value="selectedCategory"
        :options="categoryOptions"
        placeholder="选择分类"
        clearable
        style="width: 150px"
      />
    </n-flex>

    <!-- 收藏列表 -->
    <n-spin :show="isLoading" content-class="h-full box-border overflow-hidden p-3">
      <n-empty v-if="!isLoading && filteredPoetries.length === 0" description="没有找到匹配的诗词">
        <template #extra>
          <n-button v-if="searchKeyword || selectedCategory" @click="resetFilter">
            清空筛选
          </n-button>
          <n-button v-else type="primary" @click="router.push('/home')">去浏览诗词</n-button>
        </template>
      </n-empty>

      <div v-else class="h-full grid grid-rows-[1fr_auto] gap-3">
        <n-data-table
          :columns="columns"
          :data="poetryList"
          :bordered="true"
          style="height: 100%"
          flex-height
        />

        <div class="flex justify-center">
          <n-pagination
            v-model:page="currentPage"
            :page-count="Math.ceil(filteredTotal / pageSize)"
            :page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            show-size-picker
            @update:page="updatePage"
            @update:page-size="updatePageSize"
          />
        </div>
      </div>
    </n-spin>
  </main>
</template>

<script setup lang="ts">
import { DataTableColumns, NButton, NTag } from 'naive-ui'
import BookmarkButton from '@/components/BookmarkButton.vue'
import type { Poetry } from '@main/poetry/types'

interface PoetryRow {
  id: number
  title: string
  author: string
  rhythmic: string | null
  paragraphs: string[]
  category_name: string
  category_id: number
}

const router = useRouter()
const message = useMessage()

const allPoetries = ref<PoetryRow[]>([])
const filteredPoetries = ref<PoetryRow[]>([])
const poetryList = ref<PoetryRow[]>([])
const searchKeyword = ref('')
const selectedCategory = ref<number | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const filteredTotal = ref(0)
const isLoading = ref(false)

// 分类选项
const categoryOptions = computed(() => {
  const categories = new Map<number, string>()
  allPoetries.value.forEach((p) => {
    if (!categories.has(p.category_id)) {
      categories.set(p.category_id, p.category_name)
    }
  })
  return Array.from(categories.entries()).map(([value, label]) => ({ label, value }))
})

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
    width: 100,
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
          type: 'icon',
          onBookmarkChanged: () => loadFavorites()
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

// 加载收藏列表
const loadFavorites = async () => {
  try {
    isLoading.value = true

    // 获取所有收藏的书签
    const bookmarks = await window.electronAPI.interaction.getAllBookmarks('favorite')

    // 获取诗词详情
    const poetries = await Promise.all(
      bookmarks.map((bookmark) => window.electronAPI.db.getPoetryById(bookmark.poetry_id))
    )

    allPoetries.value = poetries.filter((p) => p !== null) as PoetryRow[]
    filterFavorites()
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    message.error('加载收藏列表失败')
  } finally {
    isLoading.value = false
  }
}

// 筛选收藏列表
const filterFavorites = () => {
  let filtered = [...allPoetries.value]

  // 应用分类筛选
  if (selectedCategory.value) {
    filtered = filtered.filter((p) => p.category_id === selectedCategory.value)
  }

  // 应用关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(keyword) ||
        p.author.toLowerCase().includes(keyword) ||
        (p.rhythmic && p.rhythmic.toLowerCase().includes(keyword)) ||
        p.paragraphs.some((para) => para.toLowerCase().includes(keyword))
    )
  }

  filteredPoetries.value = filtered
  filteredTotal.value = filtered.length

  // 重置到第一页并更新显示
  currentPage.value = 1
  updatePage()
}

// 更新当前页数据
const updatePage = () => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  poetryList.value = filteredPoetries.value.slice(start, end)
}

// 更新页大小
const updatePageSize = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  updatePage()
}

// 重置筛选
const resetFilter = () => {
  searchKeyword.value = ''
  selectedCategory.value = null
  filterFavorites()
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 监听分类选择变化
watch(selectedCategory, () => {
  filterFavorites()
})

// 初始化加载
onMounted(() => {
  loadFavorites()
})
</script>

<style scoped></style>
