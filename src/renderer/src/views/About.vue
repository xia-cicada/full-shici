<template>
  <main class="h-full overflow-auto p-6">
    <n-card title="关于全诗词" class="max-w-200 mx-auto">
      <n-flex vertical size="large">
        <p class="m-0">
          全诗词是一个离线古诗词阅读应用，支持分类浏览、拼音/正文搜索、AI
          赏析、笔记、收藏与标签管理。
        </p>
        <n-descriptions :column="1" label-placement="left" bordered size="small">
          <n-descriptions-item label="版本">v{{ version }}</n-descriptions-item>
          <n-descriptions-item label="数据来源">
            <n-button text type="primary" @click="openLink(chinesePoetryUrl)">
              chinese-poetry
            </n-button>
          </n-descriptions-item>
          <n-descriptions-item label="项目主页">
            <n-button text type="primary" @click="openLink(repoUrl)">GitHub</n-button>
          </n-descriptions-item>
        </n-descriptions>
        <n-text depth="3" class="text-sm">
          诗词数据基于 Chinese-Poetry 开源项目；AI 赏析由用户自行配置的模型服务提供。
        </n-text>
      </n-flex>
    </n-card>
  </main>
</template>

<script setup lang="ts">
const version = __APP_VERSION__
const repoUrl = 'https://github.com/xia-cicada/full-shici'
const chinesePoetryUrl = 'https://github.com/chinese-poetry/chinese-poetry'

const openLink = (url: string) => window.open(url)
</script>

<style scoped></style>
