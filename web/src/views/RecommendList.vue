<template>
  <div>
    <p class="subtitle" v-if="loading">Agent 正在读取你的画像和今日状态…</p>

    <div v-for="(p, idx) in picks" :key="p.key" class="card" @click="goDetail(idx)">
      <div class="pick-title">{{ p.title }}</div>
      <div class="pick-dish">{{ p.dish }}</div>
      <div class="row">
        <span class="tag active">预算 {{ p.budget }}</span>
        <span class="tag">用时 {{ p.time }}</span>
        <span v-for="a in p.allergens" :key="a" class="tag">过敏原 {{ a }}</span>
      </div>
      <p class="pick-reason">{{ p.reason }}</p>
    </div>

    <button class="btn-ghost" v-if="!loading" @click="load">换一批</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as agent from '../services/agent.js'
import { getProfile, getTodayContext, getDiary, setPending, setLastReco, deriveAgeMode } from '../services/store.js'

const router = useRouter()
const picks = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  const profile = getProfile()
  const r = await agent.recommend({
    profile, todayContext: getTodayContext(),
    recentDiary: getDiary().slice(0, 6),
    ageMode: deriveAgeMode(profile)
  })
  loading.value = false
  if (r && r.ok) {
    picks.value = r.data.picks || []
    setLastReco({ picks: picks.value, at: Date.now() })
  } else {
    alert('推荐失败')
  }
}

function goDetail(idx) {
  setPending('pick', picks.value[idx])
  router.push('/recommend/detail')
}

onMounted(load)
</script>

<style scoped>
.pick-title { color: #ff7043; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.pick-dish { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.pick-reason { color: #666; font-size: 13px; line-height: 1.5; margin: 8px 0 0; }
.card { cursor: pointer; }
</style>
