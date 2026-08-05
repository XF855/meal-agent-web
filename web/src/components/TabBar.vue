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
  { path: '/party', label: '聚餐', icon: '🍽' },
  { path: '/diary', label: '日记', icon: '📔' },
  { path: '/mine', label: '我的', icon: '👤' }
]
</script>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 56px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 0.5px solid rgba(60,60,67,0.18);
  display: flex; z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.tab {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #8e8e93; text-decoration: none;
  font-size: 10px;
}
.tab-active { color: #007aff; }
.ico { font-size: 20px; line-height: 1; }
.lbl { margin-top: 2px; font-weight: 500; }
</style>
