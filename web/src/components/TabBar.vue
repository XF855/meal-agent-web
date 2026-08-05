<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.path" :to="t.path" class="tab" active-class="tab-active">
      <div class="ico">{{ t.icon }}</div>
      <div class="lbl">{{ t.label }}</div>
    </router-link>
  </nav>
</template>

<script setup>
const tabs = [
  { path: '/today', label: '今日', icon: '🏠' },
  { path: '/agent', label: 'Agent', icon: '🤖' },
  { path: '/diary', label: '日记', icon: '📔' },
  { path: '/mine', label: '我的', icon: '👤' }
]
</script>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 60px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex; z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.tab {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #8a8a8a; text-decoration: none;
  font-size: 11px;
}
.tab-active { color: #ff7043; }
.ico { font-size: 22px; line-height: 1; }
.lbl { margin-top: 2px; }
</style>
