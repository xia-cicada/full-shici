<template>
  <div class="main-layout">
    <custom-app-bar></custom-app-bar>
    <!-- 诗词数据库缺失时展示引导，避免空数据页面 -->
    <db-missing-tip v-if="dbStatus && !dbStatus.ready" :db-path="dbStatus.dbPath" @relaunch="relaunchApp" />
    <router-view v-else v-slot="{ Component }">
      <keep-alive include="Home">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
const dbStatus = ref<{ ready: boolean; dbPath: string } | null>(null)

const relaunchApp = () => {
  window.electronAPI.relaunch()
}

onMounted(async () => {
  try {
    dbStatus.value = await window.electronAPI.db.getStatus()
  } catch (error) {
    // 查询失败时不阻断页面，保持原行为
    console.error('获取数据库状态失败:', error)
    dbStatus.value = { ready: true, dbPath: '' }
  }
})
</script>

<style lang="scss">
.main-layout {
  --at-apply: h-screen overflow-hidden grid grid-cols-1 grid-rows-[min-content_1fr];
}
</style>
