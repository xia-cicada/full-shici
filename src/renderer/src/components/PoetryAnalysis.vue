<template>
  <div class="min-h-[20em]">
    <!-- 加载状态 -->
    <n-spin :show="loading" description="诗歌正在赏析中...">
      <!-- 诗歌基本信息 -->
      <n-card :title="poetry.title">
        <!-- 赏析结果展示区 -->
        <div class="flex flex-col gap-2" v-if="analysisResult">
          <n-card name="vocabulary" title="词汇注释" hoverable>
            <n-list>
              <n-list-item v-for="(note, index) in analysisResult.vocabularyNotes" :key="index">
                <n-thing :title="note.word" :description="note.explanation" />
              </n-list-item>
            </n-list>
          </n-card>

          <n-card name="analysis" title="内容赏析" hoverable>
            <n-p class="analysis-text">{{ analysisResult.contentAnalysis }}</n-p>
          </n-card>

          <n-card name="emotionalExpression" title="情感表达" hoverable>
            <n-p class="analysis-text">{{ analysisResult.emotionalExpression }}</n-p>
          </n-card>

          <n-card name="art" title="艺术特色" hoverable>
            <n-space>
              <n-tag v-for="(feature, index) in analysisResult.artisticFeatures" :key="index">
                {{ feature }}
              </n-tag>
            </n-space>
          </n-card>
        </div>

        <!-- 错误提示 -->
        <n-alert v-if="error" type="error" class="mt-4">
          {{ error }}
        </n-alert>
      </n-card>
    </n-spin>
  </div>
</template>

<script lang="ts" setup>
import { toDeepRaw } from '@/utils'
import { Poetry, PoetryAnalysis } from '@main/db/types'

const props = defineProps<{
  poetry: Poetry
}>()

const loading = ref(true)
const error = ref('')
const analysisResult = ref<PoetryAnalysis>()

onMounted(async () => {
  try {
    // 通过Electron IPC调用AI分析
    const result = await window.electronAPI.ai.analyzePoetry(toDeepRaw(props.poetry))

    analysisResult.value = result
  } catch (err) {
    error.value = `分析失败: ${err instanceof Error ? err.message : String(err)}`
    console.error('AI分析错误:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss"></style>
