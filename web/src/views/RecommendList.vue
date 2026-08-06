<template>
  <div>
    <p class="subtitle" v-if="loading">Agent 正在读取你的画像和今日状态…</p>
    <p class="places-note" v-else-if="nearbyUsed > 0">
      · 结合了附近 {{ nearbyUsed }} 家好评餐厅
    </p>

    <div v-for="(p, idx) in picks" :key="p.key" class="card pick-card" @click="goDetail(idx)">
      <div class="pick-title">{{ p.title }}</div>
      <div class="pick-dish">{{ p.dish }}</div>
      <div class="row">
        <span class="tag active">{{ p.budget }}</span>
        <span class="tag">{{ p.time }}</span>
        <span v-for="a in (p.allergens || [])" :key="a" class="tag danger-tag">含 {{ a }}</span>
      </div>
      <p class="pick-reason">{{ p.reason }}</p>
      <a v-if="p.mapsUrl" :href="p.mapsUrl" target="_blank" class="maps-link" @click.stop>Google Maps 查看 →</a>
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
  setLastReco, getLastReco, deriveAgeMode, getDeliveryStores,
  getSavedLocation
} from '../services/store.js'

const router = useRouter()
const picks = ref([])
const loading = ref(true)
const nearbyUsed = ref(0)

async function load(refineHint) {
  loading.value = true
  const profile = getProfile()
  const last = getLastReco()
  const todayCtx = getTodayContext()
  const wantsPlaces = todayCtx && todayCtx.scene === '餐厅'
  const r = await agent.recommend({
    profile,
    todayContext: todayCtx,
    recentDiary: getDiary().slice(0, 6),
    ageMode: deriveAgeMode(profile),
    recentStores: getDeliveryStores(5),
    location: wantsPlaces ? getSavedLocation() : null,
    refineHint,
    previousPicks: last ? last.picks : null
  })
  loading.value = false
  if (r && r.ok) {
    picks.value = r.data.picks || []
    nearbyUsed.value = (r.meta && r.meta.nearbyPlacesCount) || 0
    setLastReco({ picks: picks.value, nearbyUsed: nearbyUsed.value, refineHint, at: Date.now() })
  } else {
    alert('推荐失败')
  }
}

function goDetail(idx) {
  setPending('pick', picks.value[idx])
  router.push('/recommend/detail')
}

onMounted(() => {
  if (picks.value.length) return
  const last = getLastReco()
  if (last && last.picks && last.picks.length) {
    picks.value = last.picks
    nearbyUsed.value = last.nearbyUsed || 0
    loading.value = false
  } else {
    load(null)
  }
})
</script>

<style scoped>
.pick-card { cursor: pointer; padding: 32px 0; }
.pick-title {
  color: #c46a3a; font-size: 12px;
  font-weight: 400; letter-spacing: 0.1em;
  text-transform: uppercase; margin-bottom: 12px;
}
.pick-dish {
  font-size: 24px; font-weight: 300; color: #2a1e17;
  letter-spacing: -0.01em; line-height: 1.3;
  margin-bottom: 16px;
}
.pick-reason { color: #5a4a3f; font-size: 14px; line-height: 1.7; margin: 16px 0 0; }
.places-note {
  color: #a89684; font-size: 12px;
  letter-spacing: 0.06em; margin: 0 0 8px 0;
}
.danger-tag { border-color: rgba(160,74,58,0.2); color: #a04a3a; }
.maps-link {
  display: inline-block; margin-top: 12px;
  color: #4285F4; font-size: 13px; text-decoration: none;
  border-bottom: 1px solid rgba(66,133,244,0.3);
}
.maps-link:hover { color: #2a5bbf; border-color: rgba(42,91,191,0.5); }
.refine .q-title {
  font-size: 12px; color: #a89684;
  letter-spacing: 0.08em; text-transform: uppercase;
  margin-bottom: 16px; font-weight: 400;
}
.btn-ghost.slim { padding: 12px 0; font-size: 14px; }
</style>
