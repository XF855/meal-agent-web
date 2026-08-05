<template>
  <div>
    <div class="hero">
      <div class="hero-title">吃得开心</div>
      <div class="hero-title">吃得放心</div>
      <div class="hero-title">吃得省心</div>
      <div class="hero-sub">Enjoy Every Bite. Trust Every Choice. Skip the Stress.</div>
    </div>

    <p class="intro">先了解你的口味，再帮你决定下一餐。</p>

    <button class="btn-primary" @click="$router.push('/onboarding/basic')">开始建立饮食卡片</button>
    <button class="btn-ghost" @click="skip">先体验一下</button>
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
.hero { padding: 60px 0 30px; text-align: center; }
.hero-title { font-size: 38px; font-weight: 700; color: #007aff; line-height: 1.2; letter-spacing: -0.6px; }
.hero-sub { margin-top: 18px; color: #8e8e93; font-size: 12px; }
.intro { text-align: center; color: #3c3c43; font-size: 15px; line-height: 1.6; padding: 20px 16px 40px; }
</style>
