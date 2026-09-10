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
        <!-- 赏析工具栏：补充要求 + 重新赏析 -->
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-bold shrink-0">AI 赏析</span>
          <n-input
            v-model:value="customPrompt"
            size="small"
            placeholder="补充要求（可选），如：侧重分析用典与格律"
            :disabled="loading"
            clearable
            @keyup.enter="loadAnalysis(true)"
          />
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" :disabled="loading" @click="loadAnalysis(true)">
                <template #icon>
                  <i class="i-tabler-refresh" />
                </template>
              </n-button>
            </template>
            重新赏析（忽略缓存{{ customPrompt.trim() ? '，并按补充要求生成' : '' }}）
          </n-tooltip>
        </div>

        <!-- 赏析结果展示区 -->
        <div class="flex flex-col gap-2" v-if="analysisResult">
          <n-card name="vocabulary" title="词汇注释" hoverable>
            <n-list>
              <n-list-item v-for="(note, index) in vocabularyNotes" :key="index">
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
            <n-flex>
              <n-list>
                <n-list-item
                  v-for="(feature, index) in analysisResult.artisticFeatures"
                  :key="index"
                >
                  {{ feature }}
                </n-list-item>
              </n-list>
            </n-flex>
          </n-card>
        </div>

        <!-- 错误提示 -->
        <n-alert v-if="error" type="error" class="mt-4">
          <n-flex>
            <span>{{ error }}</span>
            <n-button type="primary" text @click="handleConfigModel()">配置</n-button>
          </n-flex>
        </n-alert>
      </n-card>
    </n-spin>
  </div>
</template>

<script lang="ts" setup>
import { parsePoetryNote, toDeepRaw } from '@/utils'
import { Poetry, PoetryAnalysis, VocabularyNote } from '@main/poetry/types'
import { poetryHighlight } from './poetry-highlight'

const props = defineProps<{
  poetry: Poetry
}>()

const loading = ref(true)
const error = ref('')
const analysisResult = ref<PoetryAnalysis | null>()
/** 用户补充要求：填写后重新赏析会优先满足，留空则按默认提示词 */
const customPrompt = ref('')

const router = useRouter()
const handleConfigModel = () => {
  router.push({ path: 'model-config' })
}

let cleanHighlight: Function
const vocabularyNotes = ref<VocabularyNote[]>([])

const loadAnalysis = async (force = false) => {
  try {
    loading.value = true
    error.value = ''
    cleanHighlight?.()
    const result = await window.electronAPI.ai.analyzePoetry(
      toDeepRaw(props.poetry),
      force,
      customPrompt.value.trim() || undefined
    )

    analysisResult.value = result
    const notes = (props.poetry.notes || []).map((d) => parsePoetryNote(d))
    if (result) {
      for (const t of result.vocabularyNotes) {
        if (notes.find((d) => d.word === t.word)) continue
        notes.push(t)
      }
      vocabularyNotes.value = notes
      cleanHighlight = poetryHighlight(vocabularyNotes.value)
    }
  } catch (err) {
    error.value = `分析失败: ${err instanceof Error ? err.message : String(err)}`
    console.error('AI分析错误:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAnalysis())
</script>

<style lang="scss"></style>
