<template>
  <div class="app">
    <router-view class="page" v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
    <TabBar v-if="showTab" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'

const route = useRoute()
const showTab = computed(() => !!route.meta?.tab)
</script>

<style>
.app { min-height: 100vh; padding-bottom: 120px; }
.page { padding: 16px 16px 24px; box-sizing: border-box; }
</style>
