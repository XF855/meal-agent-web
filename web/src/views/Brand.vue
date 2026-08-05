<template>
  <div class="brand">
    <div class="hero">
      <div class="hero-title">吃得开心</div>
      <div class="hero-title">吃得放心</div>
      <div class="hero-title">吃得省心</div>
      <div class="hero-sub">Enjoy Every Bite.</div>
      <div class="hero-sub">Trust Every Choice.</div>
      <div class="hero-sub">Skip the Stress.</div>
    </div>

    <p class="intro">先了解你的口味，再帮你决定下一餐。</p>

    <div class="actions">
      <button class="btn-primary" @click="$router.push('/onboarding/basic')">开始建立饮食卡片</button>
      <button class="btn-ghost" @click="skip">先体验一下</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { getProfile, setProfile } from '../services/store.js'
const router = useRouter()
function skip() {
  const p = getProfile() || {}
  setProfile(Object.assign(p, { onboarded: true, skipped: true }))
  router.replace('/today')
}
</script>

<style scoped>
.brand { min-height: 100vh; display: flex; flex-direction: column; padding-top: 40px; }
.hero { text-align: left; margin-bottom: 40px; }
.hero-title {
  font-size: 44px; font-weight: 300;
  color: #2a1e17; line-height: 1.15;
  letter-spacing: -0.02em;
}
.hero-sub {
  color: #a89684; font-size: 13px; line-height: 1.7;
  margin-top: 4px; letter-spacing: 0.02em;
}
.hero-sub:first-of-type { margin-top: 20px; }
.intro {
  color: #5a4a3f; font-size: 16px; line-height: 1.7;
  margin: 0 0 auto 0;
}
.actions { margin-top: 40px; }
</style>
