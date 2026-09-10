<template>
  <div class="poetry-notes">
    <!-- 标题栏 -->
    <n-flex justify="space-between" align="center" class="mb-4">
      <n-h3 class="m-0">评论笔记</n-h3>
      <n-button type="primary" @click="showAddDialog = true">
        <template #icon>
          <div class="i-tabler-plus" />
        </template>
        添加评论
      </n-button>
    </n-flex>

    <!-- 评论列表 -->
    <n-spin :show="loading">
      <n-empty v-if="!loading && notes.length === 0" description="无"> </n-empty>

      <n-space v-else vertical size="large">
        <n-card v-for="note in notes" :key="note.id" size="small" hoverable>
          <template #header>
            <n-flex justify="space-between" align="center">
              <n-text strong>{{ note.title || '无标题' }}</n-text>
              <n-space>
                <n-button text @click="handleEdit(note)">
                  <div class="i-tabler-edit text-lg" />
                </n-button>
                <n-button text @click="handleDelete(note.id)">
                  <div class="i-tabler-trash text-lg text-red-500" />
                </n-button>
              </n-space>
            </n-flex>
          </template>

          <n-text class="whitespace-pre-wrap">{{ note.content }}</n-text>

          <template #footer>
            <n-text depth="3" class="text-xs">
              {{ formatTime(note.created_at) }}
              <span v-if="note.updated_at !== note.created_at">
                · 编辑于 {{ formatTime(note.updated_at) }}
              </span>
            </n-text>
          </template>
        </n-card>
      </n-space>
    </n-spin>

    <!-- 添加/编辑对话框 -->
    <n-modal
      v-model:show="showAddDialog"
      preset="dialog"
      :title="isEditing ? '编辑评论' : '添加评论'"
      positive-text="确定"
      negative-text="取消"
      @positive-click="handleSubmit"
    >
      <n-form ref="formRef" :model="formData" :rules="rules" class="mt-4">
        <n-form-item label="标题" path="title">
          <n-input
            v-model:value="formData.title"
            placeholder="请输入标题（选填）"
            maxlength="100"
            show-count
          />
        </n-form-item>
        <n-form-item label="内容" path="content">
          <n-input
            v-model:value="formData.content"
            type="textarea"
            placeholder="写下你的想法..."
            :autosize="{ minRows: 5, maxRows: 15 }"
            maxlength="5000"
            show-count
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
/**
 * 诗词评论笔记组件
 * 显示和管理诗词的评论笔记
 */
import type { Note } from '@main/interaction/types'
import type { FormInst, FormRules } from 'naive-ui'

interface Props {
  poetryId: number
}

const props = defineProps<Props>()
const message = useMessage()
const dialog = useDialog()

const notes = ref<Note[]>([])
const loading = ref(false)
const showAddDialog = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

// 表单
const formRef = ref<FormInst | null>(null)
const formData = ref({
  title: '',
  content: ''
})

const rules: FormRules = {
  content: [{ required: true, message: '请输入评论内容', trigger: 'blur' }]
}

// 格式化时间
const formatTime = (timestamp: number | string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 加载评论列表
const loadNotes = async () => {
  loading.value = true
  try {
    notes.value = await window.electronAPI.interaction.getNotesByPoetry(props.poetryId)
    // 按创建时间降序排序
    notes.value.sort((a, b) => b.created_at - a.created_at)
  } catch (error) {
    console.error('加载评论失败:', error)
    message.error('加载评论失败')
  } finally {
    loading.value = false
  }
}

// 编辑评论
const handleEdit = (note: Note) => {
  isEditing.value = true
  editingId.value = note.id
  formData.value = {
    title: note.title || '',
    content: note.content
  }
  showAddDialog.value = true
}

// 删除评论
const handleDelete = (id: number) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await window.electronAPI.interaction.deleteNote(id)
        message.success('删除成功')
        await loadNotes()
      } catch (error) {
        console.error('删除评论失败:', error)
        message.error('删除失败')
      }
    }
  })
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()

    if (isEditing.value && editingId.value) {
      // 更新
      await window.electronAPI.interaction.updateNote({
        id: editingId.value,
        title: formData.value.title,
        content: formData.value.content
      })
      message.success('更新成功')
    } else {
      // 新增
      await window.electronAPI.interaction.addNote({
        poetryId: props.poetryId,
        title: formData.value.title,
        content: formData.value.content
      })
      message.success('添加成功')
    }

    // 重置表单
    formData.value = { title: '', content: '' }
    isEditing.value = false
    editingId.value = null
    showAddDialog.value = false

    // 重新加载列表
    await loadNotes()
  } catch (error) {
    console.error('提交失败:', error)
  }
}

// 初始化加载
onMounted(() => {
  loadNotes()
})
</script>

<style scoped>
.poetry-notes {
  width: 100%;
}
</style>
