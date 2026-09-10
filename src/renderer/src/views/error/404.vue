<template>
  <div class="h-full flex items-center justify-center">
    <n-result status="404" title="页面不存在" description="要访问的页面不存在或已被移除。">
      <template #footer>
        <n-button type="primary" @click="router.replace('/home')">回到首页</n-button>
      </template>
    </n-result>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
</script>

<style scoped></style>
