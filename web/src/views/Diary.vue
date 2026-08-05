<template>
  <div>
    <div class="card">
      <h2 class="title" style="font-size:16px;">本周概览</h2>
      <p class="subtitle" style="margin:0;">{{ summary }}</p>
    </div>

    <template v-for="g in groups" :key="g.day">
      <div class="day-title">{{ g.day }}</div>
      <div v-for="e in g.entries" :key="e.id" class="card">
        <div class="head">
          <span class="meal">{{ e.meal || '一餐' }}</span>
          <span class="time">{{ e.timeLabel }}</span>
        </div>
        <img v-if="e.imageSrc" :src="e.imageSrc" class="preview"/>
        <div v-for="it in e.items" :key="it.name" class="line">
          · {{ it.name }}（{{ it.portion }}）
        </div>
        <div v-if="e.feedback" class="fb">
          满意度 {{ e.feedback.score }} · 饱腹感 {{ e.feedback.fullness }} · {{ e.feedback.feel }}
        </div>
        <div v-else-if="e.awaitingFeedback" class="fb">等待你的饭后反馈…</div>
      </div>
    </template>

    <p v-if="groups.length === 0" class="subtitle" style="text-align:center; margin-top:40px;">
      还没有记录，去 Agent 页上传第一顿饭吧。
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDiary } from '../services/store.js'

const groups = ref([])
const summary = ref('')

function pad(n) { return n < 10 ? '0' + n : '' + n }
function fmtTime(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function groupByDay(list) {
  const map = {}
  list.forEach(x => {
    const d = new Date(x.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (!map[key]) map[key] = { day: key, entries: [] }
    map[key].entries.push({ ...x, timeLabel: fmtTime(x.createdAt) })
  })
  return Object.values(map)
}

onMounted(() => {
  const list = getDiary()
  groups.value = groupByDay(list)
  if (!list.length) {
    summary.value = '还没有记录，回到 Agent 页上传第一顿饭吧。'
  } else {
    const week = list.filter(x => Date.now() - x.createdAt < 7 * 86400000)
    const proteins = new Set()
    week.forEach(w => (w.items || []).forEach(i => {
      const m = (i.name || '').match(/鸡|鸭|鱼|虾|牛|猪|羊|蛋|豆|豆腐/)
      if (m) proteins.add(m[0])
    }))
    summary.value = `本周记录 ${week.length} 餐，尝试了 ${proteins.size} 种蛋白质来源。`
  }
})
</script>

<style scoped>
.day-title { color: #888; font-size: 12px; margin: 8px 4px; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.meal { color: #ff7043; font-weight: 600; font-size: 13px; }
.time { color: #999; font-size: 12px; }
.preview { width: 100%; border-radius: 8px; margin: 6px 0; }
.line { color: #333; font-size: 13px; line-height: 1.6; }
.fb { color: #888; font-size: 12px; margin-top: 6px; }
</style>
