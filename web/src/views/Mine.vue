<template>
  <div>
    <div class="card">
      <h2 class="title" style="font-size:16px;">当前模式</h2>
      <span class="tag active">{{ modeLabel }}</span>
    </div>

    <div class="card">
      <h2 class="title" style="font-size:16px;">饮食卡片</h2>
      <div class="row" v-if="profile?.basic">
        <span class="tag" v-if="profile.basic.birthYear">出生年 {{ profile.basic.birthYear }}</span>
        <span class="tag" v-if="profile.basic.diet">饮食 {{ profile.basic.diet }}</span>
        <span class="tag" v-for="a in profile.basic.allergies" :key="a">过敏 {{ a }}</span>
        <span class="tag" v-for="t in profile.basic.taboos" :key="t">忌口 {{ t }}</span>
      </div>
      <div class="row" v-if="profile?.prefer" style="margin-top: 8px;">
        <span class="tag" v-for="c in profile.prefer.cuisines" :key="c">{{ c }}</span>
        <span class="tag" v-if="profile.prefer.budget">预算 {{ profile.prefer.budget }}</span>
      </div>
      <button class="btn-ghost" style="margin-top: 12px;" @click="$router.push('/onboarding/basic')">修改</button>
    </div>

    <div class="card">
      <h2 class="title" style="font-size:16px;">Agent 接入状态</h2>
      <p class="subtitle" style="margin: 0;">
        请求 <code>/api/agent</code>；后端如果配置了 <code>ANTHROPIC_API_KEY</code> 就走真实 Claude，
        否则自动返回 Mock 数据。
      </p>
    </div>

    <button class="btn-ghost danger" @click="clear">清空本地数据</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, deriveAgeMode, clearAll } from '../services/store.js'

const router = useRouter()
const profile = ref(null)
const modeLabel = ref('')

onMounted(() => {
  profile.value = getProfile()
  const m = deriveAgeMode(profile.value)
  modeLabel.value = ({ growth: '成长模式', adult: '成人模式', senior: '活力模式' })[m]
})

function clear() {
  if (!confirm('会删除本地画像、日记与今日状态，且不可恢复。')) return
  clearAll()
  router.replace('/onboarding/brand')
}
</script>

<style scoped>
.danger { color: #ff5252; border-color: #ff5252; }
code { background: #f2f2f4; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
</style>
