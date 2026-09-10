<template>
  <div class="h-full flex items-center justify-center">
    <n-result status="404" title="诗词数据库缺失" :description="tipText">
      <template #footer>
        <n-flex justify="center">
          <n-button @click="emit('relaunch')">重新启动</n-button>
          <n-button type="primary" @click="openGuide">查看构建指引</n-button>
        </n-flex>
      </template>
    </n-result>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  dbPath?: string
}>()

const emit = defineEmits<{
  (e: 'relaunch'): void
}>()

const tipText = computed(
  () =>
    `未在 ${props.dbPath || '应用 resources 目录'} 找到 poetry.sqlite。` +
    '请将数据库文件放置到上述目录，或参考项目 README 自行构建后重启应用。'
)

const openGuide = () => {
  window.open('https://github.com/xia-cicada/full-shici#readme')
}
</script>

<style scoped></style>
