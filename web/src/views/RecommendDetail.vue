<template>
  <div>
    <div class="card">
      <div class="pick-title">{{ pick.title }}</div>
      <div class="pick-dish">{{ pick.dish }}</div>
      <p class="pick-reason">{{ pick.reason }}</p>

      <div class="section-label">预计</div>
      <div class="row">
        <span class="tag active">预算 {{ pick.budget }}</span>
        <span class="tag">用时 {{ pick.time }}</span>
      </div>

      <div v-if="pick.allergens && pick.allergens.length">
        <div class="section-label">过敏原提示</div>
        <div class="row">
          <span v-for="a in pick.allergens" :key="a" class="tag">{{ a }}</span>
        </div>
      </div>

      <div v-if="pick.swaps && pick.swaps.length">
        <div class="section-label">可替换</div>
        <div class="row">
          <span v-for="s in pick.swaps" :key="s" class="tag">{{ s }}</span>
        </div>
      </div>

      <div class="section-label">做法 / 点单方式</div>
      <p class="pick-reason">{{ pick.howto }}</p>
    </div>

    <div class="card">
      <div class="section-label">继续追问</div>
      <div class="row">
        <span class="tag" @click="quickAsk('我不想吃米饭，可以换什么？')">换掉主食</span>
        <span class="tag" @click="quickAsk('我想更辣一点。')">更辣一点</span>
        <span class="tag" @click="quickAsk('有没有更便宜的？')">更便宜</span>
        <span class="tag" @click="quickAsk('这个菜怎么做？')">教我做法</span>
      </div>
      <div v-if="reply" class="reply">{{ reply }}</div>
    </div>

    <button class="btn-primary" @click="onPick">就吃这个</button>
    <button class="btn-ghost" @click="$router.back()">换一个</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as agent from '../services/agent.js'
import { getPending, getProfile, getTodayContext, appendDiary } from '../services/store.js'

const router = useRouter()
const pick = ref({ allergens: [], swaps: [] })
const reply = ref('')

onMounted(() => {
  pick.value = getPending('pick') || { allergens: [], swaps: [] }
})

async function quickAsk(q) {
  reply.value = '思考中…'
  const r = await agent.chat({
    userText: q,
    profile: getProfile(),
    todayContext: getTodayContext(),
    history: [{ role: 'agent', text: pick.value.dish }]
  })
  reply.value = (r && r.data && r.data.reply) || '（无回复）'
}

function guessMeal() {
  const h = new Date().getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '加餐'
  if (h < 21) return '晚餐'
  return '夜宵'
}

function onPick() {
  appendDiary({
    items: [{ name: pick.value.dish, portion: '一份', method: '推荐执行' }],
    pick: pick.value, meal: guessMeal(),
    confirmed: false, awaitingFeedback: true
  })
  router.replace('/recommend/feedback')
}
</script>

<style scoped>
.pick-title {
  color: #c46a3a; font-size: 12px;
  font-weight: 400; letter-spacing: 0.1em;
  text-transform: uppercase; margin-bottom: 12px;
}
.pick-dish {
  font-size: 26px; font-weight: 300; color: #2a1e17;
  letter-spacing: -0.01em; line-height: 1.3;
  margin-bottom: 16px;
}
.pick-reason { color: #5a4a3f; font-size: 14px; line-height: 1.7; margin: 0; }
.reply {
  margin-top: 16px; padding: 16px 18px;
  background: #f3ecdf; border-radius: 12px;
  color: #2a1e17; font-size: 14px; line-height: 1.7;
}
</style>
