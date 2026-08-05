<template>
  <div>
    <p class="subtitle" v-if="loading">Agent 正在读取你的画像和今日状态…</p>

    <div v-for="(p, idx) in picks" :key="p.key" class="card pick-card" @click="goDetail(idx)">
      <div class="pick-title">{{ p.title }}</div>
      <div class="pick-dish">{{ p.dish }}</div>
      <div class="row">
        <span class="tag active">{{ p.budget }}</span>
        <span class="tag">{{ p.time }}</span>
        <span v-for="a in (p.allergens || [])" :key="a" class="tag danger-tag">含 {{ a }}</span>
      </div>
      <p class="pick-reason">{{ p.reason }}</p>
    </div>

    <div v-if="!loading" class="card refine">
      <div class="q-title">换一批？告诉 Agent 想要什么方向</div>
      <button class="btn-ghost slim" @click="load('healthier')">🥗 想更健康的</button>
      <button class="btn-ghost slim" @click="load('tastier')">😋 更符合口味的</button>
      <button class="btn-ghost slim" @click="load(null)">↻ 直接换一批</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as agent from '../services/agent.js'
import {
  getProfile, getTodayContext, getDiary, setPending,
  setLastReco, getLastReco, deriveAgeMode, getDeliveryStores
} from '../services/store.js'

const router = useRouter()
const picks = ref([])
const loading = ref(true)

async function load(refineHint) {
  loading.value = true
  const profile = getProfile()
  const last = getLastReco()
  const r = await agent.recommend({
    profile,
    todayContext: getTodayContext(),
    recentDiary: getDiary().slice(0, 6),
    ageMode: deriveAgeMode(profile),
    recentStores: getDeliveryStores(5),
    refineHint,                             // 'healthier' / 'tastier' / null
    previousPicks: last ? last.picks : null  // 让模型避开与上一批过度重复
  })
  loading.value = false
  if (r && r.ok) {
    picks.value = r.data.picks || []
    setLastReco({ picks: picks.value, refineHint, at: Date.now() })
  } else {
    alert('推荐失败')
  }
}

function goDetail(idx) {
  setPending('pick', picks.value[idx])
  router.push('/recommend/detail')
}

onMounted(() => load(null))
</script>

<style scoped>
.pick-card { cursor: pointer; }
.pick-title { color: #007aff; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.pick-dish { font-size: 18px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.2px; }
.pick-reason { color: #3c3c43; font-size: 14px; line-height: 1.5; margin: 8px 0 0; }
.danger-tag { background: #ffece9; color: #ff3b30; }
.refine .q-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #3c3c43; }
.btn-ghost.slim { padding: 10px 0; font-size: 14px; }
</style>
