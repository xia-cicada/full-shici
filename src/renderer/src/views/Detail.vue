<template>
  <n-layout class="h-full overflow-hidden grid grid-rows-[min-content_1fr]">
    <!-- 头部 -->
    <n-layout-header class="flex items-center gap-3 px-6" style="height: 50px">
      <n-button quaternary @click="router.back()">
        <div class="i-tabler-arrow-back-up-double text-xl" />
      </n-button>
      <n-h1 class="text-xl m-0 flex-1">{{ poetry?.title }}</n-h1>
      <!-- 收藏按钮 -->
      <bookmark-button v-if="poetry" :poetry-id="poetry.id" size="medium" />
    </n-layout-header>

    <!-- 内容区 -->
    <n-layout-content position="absolute" content-class="flex flex-col" style="top: 50px">
      <div class="p-10 box-border h-full grid grid-rows-[2fr_1fr]">
        <!-- 上半部分：诗词内容和AI赏析 -->
        <div class="grid grid-cols-2 gap-6 pb-6 overflow-hidden">
          <n-card v-if="loading" class="mb-6">
            <n-skeleton height="30px" width="60%" class="mb-4" />
            <n-skeleton text style="width: 100%" />
          </n-card>

          <template v-else-if="poetry">
            <!-- 诗词内容 -->
            <n-scrollbar>
              <div id="poetry-area">
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

              <!-- 附加信息 -->
              <div class="pr-2">
                <n-collapse arrow-placement="right" :default-expanded-names="['tags', 'user-tags']">
                  <n-collapse-item title="原始标签" name="tags" v-if="poetry.tags.length">
                    <div class="flex flex-wrap gap-2">
                      <n-tag v-for="(tag, i) in poetry.tags" :key="i" type="primary" size="small">
                        {{ tag }}
                      </n-tag>
                    </div>
                  </n-collapse-item>
                  <n-collapse-item title="我的标签" name="user-tags">
                    <poetry-tags :poetry-id="poetry.id" />
                  </n-collapse-item>
                </n-collapse>
              </div>
            </n-scrollbar>

            <!-- AI 赏析 -->
            <n-scrollbar>
              <poetry-analysis :poetry="poetry"></poetry-analysis>
            </n-scrollbar>
          </template>

          <n-empty v-else description="找不到这首诗词" class="mt-20"> </n-empty>
        </div>

        <!-- 下半部分：评论笔记 -->
        <div class="border-t pt-6 overflow-hidden">
          <n-scrollbar v-if="poetry">
            <poetry-notes :poetry-id="poetry.id" />
          </n-scrollbar>
        </div>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import type { Poetry } from '@main/poetry/types'

const router = useRouter()
const message = useMessage()
const poetry = ref<Poetry | null>(null)
const loading = ref(true)

// 从路由获取ID
const { id } = router.currentRoute.value.query

onMounted(async () => {
  try {
    loading.value = true
    const res = await window.electronAPI.db.getPoetryById(Number(id))
    poetry.value = res
  } catch (error) {
    message.error('获取诗词详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<style></style>
