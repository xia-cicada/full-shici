<template>
  <n-el class="flex justify-end overflow-hidden text-[var(--text-color)] bg-[var(--card-color)]">
    <div class="flex-1" style="app-region: drag"></div>
    <div>
      <n-button quaternary @click="configAI()">
        <i class="i-tabler-brand-adobe-illustrator"></i>
      </n-button>
      <n-button quaternary @click="toggleDark()">
        <i class="i-tabler-sun-filled" v-if="isDark"></i>
        <i class="i-tabler-moon-filled" v-else></i>
      </n-button>
      <n-button quaternary @click="minimize">
        <i class="i-tabler-minus"></i>
      </n-button>
      <n-button quaternary @click="toggleMaximize">
        <i class="i-tabler-maximize" v-if="!isMaximized"></i>
        <i class="i-tabler-minimize" v-else></i>
      </n-button>
      <n-button quaternary @click="close" class="close-btn">
        <i class="i-tabler-x"></i>
      </n-button>
    </div>
  </n-el>
</template>

<script setup lang="ts">
import { useNaiveTheme } from '@/composables/useTheme'

const { isDark, toggleDark } = useNaiveTheme()
const { minimize, toggleMaximize, close, onMaximized, onUnmaximized } = window.electronAPI

const isMaximized = ref(false)

const router = useRouter()
const configAI = () => {
  router.push({ path: 'model-config' })
}

// 监听窗口状态变化
onMounted(() => {
  onMaximized(() => {
    isMaximized.value = true
  })

  onUnmaximized(() => {
    isMaximized.value = false
  })
})
</script>

<style scoped></style>
