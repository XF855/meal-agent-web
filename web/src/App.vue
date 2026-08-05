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
.app { min-height: 100vh; padding-bottom: 120px; background: #ffffff; }
.page { padding: 40px 24px 32px; box-sizing: border-box; max-width: 640px; margin: 0 auto; }
</style>
