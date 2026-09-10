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
        @input="onKeywordInput"
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
      <n-empty v-if="!isLoading && filteredTotal === 0" description="没有找到匹配的诗词">
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

interface PoetryRow {
  id: number
  title: string
  author: string
  rhythmic: string | null
  paragraphs: string[]
  category_name: string
  category_id: number
}

interface Category {
  id: number
  name: string
}

const router = useRouter()
const message = useMessage()

const poetryList = ref<PoetryRow[]>([])
const categories = ref<Category[]>([])
const searchKeyword = ref('')
const selectedCategory = ref<number | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const filteredTotal = ref(0)
const isLoading = ref(false)

// 分类选项
const categoryOptions = computed(() =>
  categories.value.map((c) => ({ label: c.name, value: c.id }))
)

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

// 加载收藏列表：过滤与分页由主进程在收藏 ID 集合内完成
const loadFavorites = async () => {
  try {
    isLoading.value = true

    const { results, total } = await window.electronAPI.interaction.searchBookmarkedPoetry({
      keyword: searchKeyword.value || undefined,
      categoryId: selectedCategory.value || undefined,
      page: currentPage.value,
      limit: pageSize.value
    })

    poetryList.value = results as PoetryRow[]
    filteredTotal.value = total
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    message.error('加载收藏列表失败')
    poetryList.value = []
    filteredTotal.value = 0
  } finally {
    isLoading.value = false
  }
}

// 输入关键词后回到第一页重新查询
const onKeywordInput = () => {
  currentPage.value = 1
  loadFavorites()
}

// 更新当前页
const updatePage = (page: number) => {
  currentPage.value = page
  loadFavorites()
}

// 更新页大小
const updatePageSize = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadFavorites()
}

// 重置筛选
const resetFilter = () => {
  searchKeyword.value = ''
  selectedCategory.value = null
  currentPage.value = 1
  loadFavorites()
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 监听分类选择变化
watch(selectedCategory, () => {
  currentPage.value = 1
  loadFavorites()
})

// 初始化加载
onMounted(() => {
  window.electronAPI.db
    .getAllCategories()
    .then((list) => (categories.value = list))
    .catch((error) => console.error('加载分类失败:', error))
  loadFavorites()
})
</script>

<style scoped></style>
