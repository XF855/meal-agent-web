<template>
  <nav class="tabbar">
    <router-link v-for="t in tabs" :key="t.path" :to="t.path" class="tab" active-class="tab-active">
      <div class="lbl">{{ t.label }}</div>
    </router-link>
  </nav>
</template>

<script setup>
const tabs = [
  { path: '/today', label: '今日' },
  { path: '/party', label: '聚餐' },
  { path: '/diary', label: '日记' },
  { path: '/mine', label: '我的' }
]
</script>

<style scoped>
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0;
  height: 56px;
  background: #ffffff;
  border-top: 1px solid rgba(0,0,0,0.06);
  display: flex; z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.tab {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  color: #a8a8a8; text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.06em;
  font-weight: 400;
  transition: color .15s;
}
.tab-active { color: #111; font-weight: 500; }
.lbl { padding: 0 6px; }
</style>
