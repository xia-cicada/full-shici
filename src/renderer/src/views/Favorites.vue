<template>
  <main class="h-full overflow-hidden grid grid-rows-[auto_1fr] p-1">
    <!-- 顶部标题栏 -->
    <n-flex class="p-3 items-center">
      <n-button quaternary @click="router.back()">
        <div class="i-tabler-arrow-left text-xl" />
      </n-button>
      <n-h2 class="m-0">我的收藏</n-h2>
      <n-text depth="3" class="ml-2">共 {{ totalItems }} 首诗词</n-text>
    </n-flex>

    <!-- 收藏列表 -->
    <n-spin :show="isLoading" content-class="h-full box-border overflow-hidden p-3">
      <n-empty v-if="!isLoading && poetryList.length === 0" description="还没有收藏任何诗词">
        <template #extra>
          <n-button type="primary" @click="router.push('/home')">去浏览诗词</n-button>
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
            :page-count="Math.ceil(totalItems / pageSize)"
            :page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            show-size-picker
            @update:page="loadFavorites"
            @update:page-size="
              (size) => {
                pageSize = size
                loadFavorites()
              }
            "
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
}

const router = useRouter()
const message = useMessage()

const poetryList = ref<PoetryRow[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const isLoading = ref(false)

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
    totalItems.value = bookmarks.length

    // 分页
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    const pageBookmarks = bookmarks.slice(start, end)

    // 获取诗词详情
    const poetries = await Promise.all(
      pageBookmarks.map((bookmark) => window.electronAPI.db.getPoetryById(bookmark.poetry_id))
    )

    poetryList.value = poetries as PoetryRow[]
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    message.error('加载收藏列表失败')
  } finally {
    isLoading.value = false
  }
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 初始化加载
onMounted(() => {
  loadFavorites()
})
</script>

<style scoped></style>
