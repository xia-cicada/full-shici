<script setup lang="ts">
import { useNaiveTheme } from '@/composables/useTheme'

const { naiveTheme } = useNaiveTheme()
</script>

<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <app-utils>
              <router-view></router-view>
            </app-utils>
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style lang="scss"></style>
