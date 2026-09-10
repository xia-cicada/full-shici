<template>
  <n-layout class="h-full overflow-hidden grid grid-rows-[min-content_1fr]">
    <!-- 头部 -->
    <n-layout-header class="flex items-center gap-3 px-2" style="height: 50px">
      <n-button quaternary @click="router.back()">
        <div class="i-tabler-arrow-back-up-double text-xl" />
      </n-button>
      <n-h1 class="text-xl m-0">{{ poetry?.title }}</n-h1>
      <!-- 收藏按钮 -->
      <bookmark-button v-if="poetry" :poetry-id="poetry.id" type="icon" />
    </n-layout-header>

    <!-- 内容区 -->
    <n-layout-content position="absolute" content-class="flex flex-col" style="top: 50px">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 overflow-hidden">
        <n-card v-if="loading" class="mb-6">
          <n-skeleton height="30px" width="60%" class="mb-4" />
          <n-skeleton text style="width: 100%" />
        </n-card>

        <template v-else-if="poetry">
          <!-- 诗词内容 -->
          <n-scrollbar>
            <div id="poetry-area" class="py-3 px-5">
              <div class="mb-8">
                <n-text class="text-lg font-bold">{{ poetry.author }}</n-text>
                <n-text depth="3" class="block text-sm">{{ poetry.category_name }}</n-text>
              </div>

              <!-- 诗词内容 -->
              <div class="poetry-content mb-8 pr-3">
                <n-h2 class="text-2xl mb-6">{{ poetry.title }}</n-h2>

                <div v-for="(para, index) in poetry.paragraphs" :key="index" class="mb-4">
                  <p class="text-lg">{{ para }}</p>
                </div>
              </div>
            </div>
          </n-scrollbar>

          <!-- AI 赏析 -->
          <n-scrollbar>
            <div class="flex flex-col gap-2">
              <n-card :bordered="false" content-style="padding: 0 0.7rem;">
                <n-card :hoverable="true" class="mb-2">
                  <template #header>
                    <span>评论</span>
                    <n-button
                      size="small"
                      type="primary"
                      text
                      class="ml-2"
                      @click="handleMoreNotes"
                    >
                      <n-icon>
                        <i class="i-tabler-edit"></i>
                      </n-icon>
                    </n-button>
                  </template>
                  <div>
                    {{ notesSummary?.latestContent || '无' }}
                  </div>
                </n-card>
                <n-card :hoverable="true" title="标签">
                  <n-collapse
                    arrow-placement="right"
                    :default-expanded-names="['tags', 'user-tags']"
                  >
                    <div class="flex flex-wrap gap-2" v-if="poetry.tags.length > 0">
                      <n-tag v-for="(tag, i) in poetry.tags" :key="i" type="primary" size="small">
                        {{ tag }}
                      </n-tag>
                    </div>
                    <n-collapse-item title="我的标签" name="user-tags">
                      <poetry-tags :poetry-id="poetry.id" />
                    </n-collapse-item>
                  </n-collapse>
                </n-card>
              </n-card>
              <poetry-analysis :poetry="poetry"></poetry-analysis>
            </div>
          </n-scrollbar>
        </template>

        <n-empty v-else description="找不到这首诗词" class="mt-20"> </n-empty>
      </div>
    </n-layout-content>
    <n-modal
      preset="card"
      class="max-w-80%"
      v-model:show="moreNotesVisible"
      @close="loadNotesSummary"
    >
      <poetry-notes v-if="moreNotesVisible" :poetry-id="poetry!.id" />
    </n-modal>
  </n-layout>
</template>

<script setup lang="ts">
import type { Poetry } from '@main/poetry/types'

const router = useRouter()
const message = useMessage()
const poetry = ref<Poetry | null>(null)
const notesSummary = ref<{ latestContent: string | null; totalCount: number }>()
const loading = ref(true)

// 从路由获取ID（非法 id 视为未找到，走 n-empty 分支）
const { id } = router.currentRoute.value.query
const poetryId = Number(id)
const isValidId = Number.isInteger(poetryId) && poetryId > 0

const moreNotesVisible = ref(false)
function handleMoreNotes() {
  moreNotesVisible.value = true
}

async function loadNotesSummary() {
  if (!isValidId) return
  const summary = await window.electronAPI.interaction.getNotesSummaryByPoetry(poetryId)
  notesSummary.value = summary
}

onMounted(async () => {
  if (!isValidId) {
    loading.value = false
    return
  }
  try {
    loading.value = true
    const res = await window.electronAPI.db.getPoetryById(poetryId)
    poetry.value = res
    loadNotesSummary()
  } catch (error) {
    message.error('获取诗词详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<style></style>
