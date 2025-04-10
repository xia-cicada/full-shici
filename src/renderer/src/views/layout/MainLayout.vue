<template>
  <div class="main-layout">
    <custom-app-bar></custom-app-bar>
    <router-view v-slot="{ Component }">
      <keep-alive include="Home">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss">
.main-layout {
  --at-apply: h-screen overflow-hidden grid grid-cols-1 grid-rows-[min-content_1fr];
}
</style>
