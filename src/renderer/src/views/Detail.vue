<template>
  <n-layout class="h-full overflow-hidden grid grid-rows-[min-content_1fr]">
    <!-- 头部 -->
    <n-layout-header class="flex items-center gap-3 px-6" style="height: 50px">
      <n-button quaternary @click="router.back()">
        <div class="i-tabler-arrow-back-up-double text-xl" />
      </n-button>
      <n-h1 class="text-xl m-0">{{ poetry?.title }}</n-h1>
    </n-layout-header>

    <!-- 内容区 -->
    <n-layout-content
      position="absolute"
      content-class="flex flex-col"
      :native-scrollbar="false"
      style="top: 50px"
    >
      <div class="p-10">
        <n-card v-if="loading" class="mb-6">
          <n-skeleton height="30px" width="60%" class="mb-4" />
          <n-skeleton text style="width: 100%" />
        </n-card>

        <template v-else-if="poetry">
          <!-- 作者信息 -->
          <div class="mb-8">
            <n-text class="text-lg font-bold">{{ poetry.author }}</n-text>
            <n-text depth="3" class="block text-sm">{{ poetry.category_name }}</n-text>
          </div>

          <!-- 诗词内容 -->
          <div class="poetry-content mb-8">
            <n-h2 class="text-2xl mb-6">{{ poetry.title }}</n-h2>

            <div v-for="(para, index) in poetry.paragraphs" :key="index" class="mb-4">
              <p class="text-lg">{{ para }}</p>
            </div>
          </div>

          <!-- 附加信息 -->
          <n-collapse arrow-placement="right">
            <n-collapse-item title="词牌信息" name="rhythmic" v-if="poetry.rhythmic">
              <n-p>{{ poetry.rhythmic }}</n-p>
            </n-collapse-item>

            <n-collapse-item title="注释" name="notes" v-if="poetry.notes.length">
              <ul class="list-disc pl-6 space-y-2">
                <li v-for="(note, i) in poetry.notes" :key="i">
                  <n-p>{{ note }}</n-p>
                </li>
              </ul>
            </n-collapse-item>

            <n-collapse-item title="标签" name="tags" v-if="poetry.tags.length">
              <div class="flex flex-wrap gap-2">
                <n-tag v-for="(tag, i) in poetry.tags" :key="i" type="primary" round size="small">
                  {{ tag }}
                </n-tag>
              </div>
            </n-collapse-item>
          </n-collapse>
        </template>

        <n-empty v-else description="找不到这首诗词" class="mt-20">
          <template #extra>
            <n-button size="small" @click="router.push('/')">返回首页</n-button>
          </template>
        </n-empty>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import type { Poetry } from '@main/db/types'

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
