<template>
  <main class="h-full overflow-hidden grid grid-rows-[auto_1fr] p-1">
    <!-- 顶部标题栏 -->
    <n-flex class="p-3 items-center justify-space-between">
      <n-flex align="center">
        <n-button quaternary @click="router.back()">
          <div class="i-tabler-arrow-left text-xl" />
        </n-button>
        <n-h2 class="m-0">标签管理</n-h2>
      </n-flex>
      <n-button type="primary" @click="handleCreateTag">
        <template #icon>
          <div class="i-tabler-plus" />
        </template>
        创建标签
      </n-button>
    </n-flex>

    <!-- 主内容区：左侧标签列表，右侧诗词列表 -->
    <div class="grid grid-cols-[300px_1fr] gap-4 p-3 overflow-hidden">
      <!-- 左侧：标签列表 -->
      <n-card title="标签列表" size="small" class="h-full overflow-hidden">
        <template #header-extra>
          <n-text depth="3">共 {{ tags.length }} 个</n-text>
        </template>

        <n-scrollbar style="max-height: calc(100vh - 200px)">
          <n-empty v-if="tags.length === 0" description="还没有标签" size="small" class="my-8" />

          <n-list v-else hoverable clickable>
            <n-list-item
              v-for="tag in tags"
              :key="tag.id"
              @click="selectTag(tag)"
              :class="{ 'bg-gray-100 dark:bg-gray-800': selectedTag?.id === tag.id }"
            >
              <template #prefix>
                <div
                  class="w-4 h-4 rounded"
                  :style="{ backgroundColor: tag.color || '#18a058' }"
                />
              </template>
              <n-thing>
                <template #header>{{ tag.name }}</template>
                <template #description>
                  <n-text depth="3" class="text-xs">
                    {{ tagPoetryCount.get(tag.id) || 0 }} 首诗词
                  </n-text>
                </template>
              </n-thing>
              <template #suffix>
                <n-space :size="8">
                  <n-button text @click.stop="handleEditTag(tag)">
                    <div class="i-tabler-edit text-lg" />
                  </n-button>
                  <n-button text @click.stop="handleDeleteTag(tag.id)">
                    <div class="i-tabler-trash text-lg text-red-500" />
                  </n-button>
                </n-space>
              </template>
            </n-list-item>
          </n-list>
        </n-scrollbar>
      </n-card>

      <!-- 右侧：诗词列表 -->
      <n-card size="small" class="h-full overflow-hidden">
        <template #header>
          <n-flex align="center" justify="space-between">
            <span v-if="selectedTag">标签「{{ selectedTag.name }}」下的诗词</span>
            <span v-else>请选择一个标签</span>
            <n-text v-if="selectedTag" depth="3">共 {{ tagPoetryTotal }} 首</n-text>
          </n-flex>
        </template>

        <n-spin :show="loadingPoetries">
          <n-empty
            v-if="!selectedTag"
            description="请从左侧选择一个标签查看诗词"
            class="my-20"
          />

          <n-empty
            v-else-if="!loadingPoetries && poetryList.length === 0"
            description="这个标签下还没有诗词"
            class="my-20"
          />

          <n-data-table
            v-else
            :columns="columns"
            :data="poetryList"
            :bordered="true"
            :max-height="'calc(100vh - 220px)'"
          />
        </n-spin>
      </n-card>
    </div>

    <!-- 创建/编辑标签对话框 -->
    <n-modal
      v-model:show="showTagDialog"
      preset="dialog"
      :title="isEditingTag ? '编辑标签' : '创建标签'"
      positive-text="确定"
      negative-text="取消"
      @positive-click="handleSubmitTag"
    >
      <n-form ref="tagFormRef" :model="tagForm" :rules="tagRules" class="mt-4">
        <n-form-item label="标签名称" path="name">
          <n-input v-model:value="tagForm.name" placeholder="请输入标签名称" maxlength="20" />
        </n-form-item>
        <n-form-item label="标签颜色" path="color">
          <n-color-picker v-model:value="tagForm.color" :swatches="tagColorSwatches" />
        </n-form-item>
      </n-form>
    </n-modal>
  </main>
</template>

<script setup lang="ts">
import { useInteractionStore } from '@/stores/interaction'
import type { Tag } from '@main/interaction/types'
import type { FormInst, FormRules, DataTableColumns } from 'naive-ui'
import { NButton } from 'naive-ui'

interface PoetryRow {
  id: number
  title: string
  author: string
  rhythmic: string | null
  category_name: string
}

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const interactionStore = useInteractionStore()

const tags = computed(() => interactionStore.tags)
const selectedTag = ref<Tag | null>(null)
const poetryList = ref<PoetryRow[]>([])
const tagPoetryTotal = ref(0)
const loadingPoetries = ref(false)

// 标签诗词数量统计
const tagPoetryCount = ref<Map<number, number>>(new Map())

// 标签表单
const showTagDialog = ref(false)
const isEditingTag = ref(false)
const editingTagId = ref<number | null>(null)
const tagFormRef = ref<FormInst | null>(null)
const tagForm = ref({
  name: '',
  color: '#18a058'
})

const tagRules: FormRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '标签名称长度为1-20个字符', trigger: 'blur' }
  ]
}

const tagColorSwatches = [
  '#18a058',
  '#2080f0',
  '#f0a020',
  '#d03050',
  '#7c3aed',
  '#ec4899',
  '#06b6d4',
  '#84cc16'
]

// 诗词列表表头
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
    width: 100
  },
  {
    title: '分类',
    key: 'category_name',
    width: 100
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row) =>
      h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          onClick: () => viewDetail(row.id)
        },
        () => '详情'
      )
  }
]

// 选择标签
const selectTag = async (tag: Tag) => {
  selectedTag.value = tag
  await loadTagPoetries(tag.id)
}

// 加载标签下的诗词（主进程在标签 ID 集合内一次完成查询）
const loadTagPoetries = async (tagId: number) => {
  loadingPoetries.value = true
  try {
    const { results, total } = await interactionStore.searchTaggedPoetry(tagId)
    poetryList.value = results as PoetryRow[]
    tagPoetryTotal.value = total
  } catch (error) {
    console.error('加载诗词失败:', error)
    message.error('加载诗词失败')
  } finally {
    loadingPoetries.value = false
  }
}

// 加载标签诗词数量统计（单条 GROUP BY 查询）
const loadTagPoetryCount = async () => {
  try {
    const counts = await window.electronAPI.interaction.getTagPoetryCounts()
    tagPoetryCount.value = new Map(counts.map((c) => [c.tagId, c.count]))
  } catch (error) {
    console.error('加载标签统计失败:', error)
  }
}

// 创建标签
const handleCreateTag = () => {
  isEditingTag.value = false
  editingTagId.value = null
  tagForm.value = {
    name: '',
    color: '#18a058'
  }
  showTagDialog.value = true
}

// 编辑标签
const handleEditTag = (tag: Tag) => {
  isEditingTag.value = true
  editingTagId.value = tag.id
  tagForm.value = {
    name: tag.name,
    color: tag.color || '#18a058'
  }
  showTagDialog.value = true
}

// 提交标签表单
const handleSubmitTag = async () => {
  try {
    await tagFormRef.value?.validate()

    if (isEditingTag.value && editingTagId.value) {
      // 更新
      await interactionStore.updateTag(editingTagId.value, tagForm.value.name, tagForm.value.color)
    } else {
      // 创建
      await interactionStore.createTag(tagForm.value.name, tagForm.value.color)
    }

    showTagDialog.value = false
    await loadTagPoetryCount()
  } catch (error) {
    console.error('提交失败:', error)
  }
}

// 删除标签
const handleDeleteTag = (tagId: number) => {
  dialog.warning({
    title: '确认删除',
    content: '删除标签后，该标签与诗词的关联也会被删除。确定要继续吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await interactionStore.deleteTag(tagId)

      // 如果删除的是当前选中的标签，清空选中状态
      if (selectedTag.value?.id === tagId) {
        selectedTag.value = null
        poetryList.value = []
        tagPoetryTotal.value = 0
      }

      await loadTagPoetryCount()
    }
  })
}

// 查看详情
const viewDetail = (id: number) => {
  router.push({ path: '/detail', query: { id } })
}

// 初始化
onMounted(async () => {
  await interactionStore.loadTags()
  await loadTagPoetryCount()
})
</script>

<style scoped></style>
