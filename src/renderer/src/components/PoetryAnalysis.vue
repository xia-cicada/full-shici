<template>
  <div>
    <!-- 加载状态 -->
    <n-spin
      :show="loading"
      content-class="min-h-[10rem]"
      size="small"
      description="诗歌正在赏析中..."
    >
      <!-- 诗歌基本信息 -->
      <n-card :bordered="false" content-style="padding: 0 0.7rem;">
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
import { poetryHighlight } from './poetry-highlight'

const props = defineProps<{
  poetry: Poetry
}>()

const loading = ref(true)
const error = ref('')
const analysisResult = ref<PoetryAnalysis>()

let cleanHighlight: Function
onMounted(async () => {
  try {
    cleanHighlight?.()
    const result = await window.electronAPI.ai.analyzePoetry(toDeepRaw(props.poetry))

    analysisResult.value = result
    cleanHighlight = poetryHighlight(result.vocabularyNotes)
  } catch (err) {
    error.value = `分析失败: ${err instanceof Error ? err.message : String(err)}`
    console.error('AI分析错误:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss"></style>
