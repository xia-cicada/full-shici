<script setup lang="ts">
import { getPy } from '@/utils'
import { DataTableColumns, NButton, NTag } from 'naive-ui'

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
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const isLoading = ref(false)
const poetryList = ref<PoetryRow[]>([])
const categories = ref<Category[]>([])

const router = useRouter()

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
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          onClick: () => viewDetail(row.id)
        },
        () => '查看详情'
      )
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
  } catch (error) {
    console.error('搜索失败:', error)
    poetryList.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  selectedCategory.value = null
  searchPoetry(true)
}

// 初始化加载数据
onMounted(() => {
  loadCategories()
  searchPoetry(true)
})
</script>

<template>
  <main class="overflow-hidden grid grid-rows-[auto_1fr] p-1">
    <n-flex class="p-3">
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
        style="width: 200px"
      />
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
            searchPoetry()
          }
        "
      />
    </n-spin>
  </main>
</template>

<style scoped></style>
