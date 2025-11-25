<template>
  <div class="poetry-tags">
    <!-- 显示已添加的标签 -->
    <n-flex v-if="poetryTags.length > 0 || editable" align="center">
      <n-tag
        v-for="tag in poetryTags"
        :key="tag.id"
        :color="{ color: tag.color || '#18a058', textColor: '#fff' }"
        style="--n-close-icon-color: #eee; --n-close-icon-color-hover: #fff"
        :closable="editable"
        @close="handleRemoveTag(tag.id)"
      >
        {{ tag.name }}
      </n-tag>

      <!-- 添加标签按钮 -->
      <n-button v-if="editable" size="small" @click="showTagSelector = true">
        <template #icon>
          <div class="i-tabler-plus" />
        </template>
        添加标签
      </n-button>
    </n-flex>

    <n-empty v-else description="无" size="small" class="py-4" style="min-height: auto" />

    <!-- 标签选择器 -->
    <n-modal
      v-model:show="showTagSelector"
      preset="dialog"
      title="选择标签"
      :show-icon="false"
      positive-text="确定"
      negative-text="取消"
      @positive-click="handleAddTags"
    >
      <div class="mt-4">
        <n-flex vertical>
          <!-- 创建新标签 -->
          <n-card size="small" title="创建新标签">
            <n-flex align="center">
              <n-input
                v-model:value="newTagName"
                placeholder="标签名称"
                @keyup.enter="handleCreateTag"
              />
              <n-color-picker
                v-model:value="newTagColor"
                :swatches="tagColorSwatches"
                style="width: 100px"
              />
              <n-button type="primary" size="small" @click="handleCreateTag">创建</n-button>
            </n-flex>
          </n-card>

          <!-- 选择已有标签 -->
          <n-card size="small" title="选择已有标签">
            <n-checkbox-group v-model:value="selectedTagIds">
              <n-flex>
                <n-tag
                  v-for="tag in availableTags"
                  :key="tag.id"
                  :color="{ color: tag.color || '#18a058', textColor: '#fff' }"
                  :checkable="true"
                  :checked="selectedTagIds.includes(tag.id)"
                  @click="toggleTag(tag.id)"
                >
                  {{ tag.name }}
                </n-tag>
              </n-flex>
            </n-checkbox-group>

            <n-empty
              v-if="availableTags.length === 0"
              description="没有可用的标签"
              size="small"
              class="mt-4"
            />
          </n-card>
        </n-flex>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
/**
 * 诗词标签组件
 * 显示和管理诗词的标签
 */
import { useInteractionStore } from '@/stores/interaction'
import type { Tag } from '@main/interaction/types'

interface Props {
  poetryId: number
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: true
})

const interactionStore = useInteractionStore()
const message = useMessage()

const poetryTags = ref<Tag[]>([])
const showTagSelector = ref(false)
const selectedTagIds = ref<number[]>([])
const newTagName = ref('')
const newTagColor = ref('#18a058')

// 标签颜色预设
const tagColorSwatches = [
  '#18a058', // 绿色
  '#2080f0', // 蓝色
  '#f0a020', // 橙色
  '#d03050', // 红色
  '#7c3aed', // 紫色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#84cc16' // 黄绿色
]

// 可用的标签（排除已添加的）
const availableTags = computed(() => {
  const addedTagIds = new Set(poetryTags.value.map((t) => t.id))
  return interactionStore.tags.filter((t) => !addedTagIds.has(t.id))
})

// 加载诗词的标签
const loadPoetryTags = async () => {
  try {
    poetryTags.value = await interactionStore.getPoetryTags(props.poetryId)
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

// 切换标签选中状态
const toggleTag = (tagId: number) => {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
  } else {
    selectedTagIds.value.push(tagId)
  }
}

// 创建新标签
const handleCreateTag = async () => {
  if (!newTagName.value.trim()) {
    message.warning('请输入标签名称')
    return
  }

  const newTag = await interactionStore.createTag(newTagName.value.trim(), newTagColor.value)
  if (newTag) {
    selectedTagIds.value.push(newTag.id)
    newTagName.value = ''
    newTagColor.value = '#18a058'
  }
}

// 添加选中的标签到诗词
const handleAddTags = async () => {
  if (selectedTagIds.value.length === 0) {
    showTagSelector.value = false
    return
  }

  try {
    // 添加所有选中的标签
    for (const tagId of selectedTagIds.value) {
      await interactionStore.addTagToPoetry(props.poetryId, tagId)
    }

    // 重新加载标签
    await loadPoetryTags()

    // 重置选中状态
    selectedTagIds.value = []
    showTagSelector.value = false
  } catch (error) {
    console.error('添加标签失败:', error)
  }
}

// 移除标签
const handleRemoveTag = async (tagId: number) => {
  try {
    await interactionStore.removeTagFromPoetry(props.poetryId, tagId)
    await loadPoetryTags()
  } catch (error) {
    console.error('移除标签失败:', error)
  }
}

// 初始化
onMounted(async () => {
  // 加载所有标签
  await interactionStore.loadTags()
  // 加载诗词的标签
  await loadPoetryTags()
})
</script>

<style scoped>
.poetry-tags {
  width: 100%;
}
</style>
