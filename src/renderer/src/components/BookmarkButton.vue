<template>
  <n-button v-if="type === 'button'" :size="size" :quaternary="quaternary" @click="handleToggle">
    <template #icon>
      <div :class="iconClass" />
    </template>
  </n-button>

  <n-button v-else text :size="size" @click="handleToggle" class="bookmark-icon-button">
    <div :class="iconClass" />
  </n-button>
</template>

<script setup lang="ts">
/**
 * 收藏按钮组件
 * 可以作为按钮或图标使用，支持不同尺寸
 */
import { useInteractionStore } from '@/stores/interaction'

interface Props {
  poetryId: number
  size?: 'tiny' | 'small' | 'medium' | 'large'
  type?: 'button' | 'icon'
  quaternary?: boolean
  showText?: boolean
}

interface Emits {
  (e: 'bookmarkChanged', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  type: 'button',
  quaternary: false,
  showText: true
})

const emit = defineEmits<Emits>()

const interactionStore = useInteractionStore()
const loading = ref(false)

// 直接从 store 缓存读取收藏状态（响应式）
const bookmarked = computed(() => {
  return interactionStore.bookmarkCache.get(props.poetryId) || false
})

// 图标类名（根据收藏状态）
const iconClass = computed(() => {
  const sizeClass = {
    tiny: 'text-sm',
    small: 'text-base',
    medium: 'text-lg',
    large: 'text-xl'
  }[props.size]

  const iconName = bookmarked.value ? 'i-tabler-heart-filled' : 'i-tabler-heart'
  const colorClass = bookmarked.value ? 'text-red' : ''

  return [iconName, sizeClass, colorClass].filter(Boolean).join(' ')
})

// 初始化：确保收藏状态已加载到缓存
const loadBookmarkStatus = async () => {
  // 如果缓存中没有，则加载状态
  if (!interactionStore.bookmarkCache.has(props.poetryId)) {
    loading.value = true
    try {
      await interactionStore.isBookmarked(props.poetryId)
    } catch (error) {
      console.error('加载收藏状态失败:', error)
    } finally {
      loading.value = false
    }
  }
}

// 切换收藏
const handleToggle = async () => {
  if (loading.value) return

  loading.value = true
  try {
    const newStatus = await interactionStore.toggleBookmark(props.poetryId)
    emit('bookmarkChanged', newStatus)
  } catch (error) {
    console.error('切换收藏状态失败:', error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载状态
onMounted(() => {
  loadBookmarkStatus()
})
</script>

<style scoped>
.bookmark-icon-button {
  padding: 4px;
}
</style>
