<template>
  <div>
    <div class="card">
      <div class="greet">{{ greeting }}</div>
      <div class="status-line">{{ modeLabel }} · 下一餐：{{ nextMeal }} · 已记录 {{ diaryToday }} 餐</div>
    </div>

    <div class="card">
      <div class="q-title">今日状态（用于本次推荐）</div>

      <div class="section-label">你现在有多饿？</div>
      <div class="row">
        <span v-for="o in hungerOptions" :key="o" class="tag"
              :class="{active: ctx.hunger === o}" @click="set('hunger', o)">{{ o }}</span>
      </div>

      <div class="section-label">今天心情</div>
      <div class="row">
        <span v-for="o in moodOptions" :key="o" class="tag"
              :class="{active: ctx.mood === o}" @click="set('mood', o)">{{ o }}</span>
      </div>

      <div class="section-label">这一餐有多少时间</div>
      <div class="row">
        <span v-for="o in timeOptions" :key="o" class="tag"
              :class="{active: ctx.time === o}" @click="set('time', o)">{{ o }}</span>
      </div>

      <div class="section-label">场景</div>
      <div class="row">
        <span v-for="o in sceneOptions" :key="o" class="tag"
              :class="{active: ctx.scene === o}" @click="set('scene', o)">{{ o }}</span>
      </div>

      <div class="section-label">此刻特别想吃</div>
      <div class="row">
        <span v-for="o in craveOptions" :key="o" class="tag"
              :class="{active: ctx.crave === o}" @click="set('crave', o)">{{ o }}</span>
      </div>
    </div>

    <div class="card">
      <div class="q-title">快速入口</div>
      <div class="grid">
        <div class="grid-item" @click="$router.push('/agent')">
          <div class="ico">📷</div>拍照记录
        </div>
        <div class="grid-item" @click="goRecommend">
          <div class="ico">🍽</div>帮我决定
        </div>
        <div class="grid-item" @click="$router.push('/diary')">
          <div class="ico">📔</div>饮食日记
        </div>
      </div>
    </div>

    <div class="card">
      <div class="q-title">今日提醒</div>
      <p class="reminder">{{ reminder }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, getDiary, getTodayContext, setTodayContext, deriveAgeMode } from '../services/store.js'

const router = useRouter()
const ctx = reactive({ hunger: '一般', mood: '普通', time: '20 分钟', scene: '外卖', crave: '无所谓' })
const greeting = ref('')
const modeLabel = ref('')
const nextMeal = ref('')
const diaryToday = ref(0)
const reminder = ref('')

const hungerOptions = ['不饿', '一般', '有点饿', '很饿']
const moodOptions = ['开心', '普通', '疲惫', '低落', '兴奋']
const timeOptions = ['10 分钟', '20 分钟', '30 分钟', '1 小时+']
const sceneOptions = ['在家做', '外卖', '食堂', '餐厅']
const craveOptions = ['无所谓', '清淡', '辣', '重口', '热汤', '凉的', '甜的']

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 5) return '深夜好'
  if (h < 10) return '早上好'
  if (h < 13) return '中午好'
  if (h < 17) return '下午好'
  if (h < 21) return '晚上好'
  return '晚安'
}
function nextMealGuess() {
  const h = new Date().getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '下午加餐'
  if (h < 21) return '晚餐'
  return '夜宵'
}
function modeText(m) { return ({ growth: '成长模式', adult: '成人模式', senior: '活力模式' })[m] || '成人模式' }

onMounted(() => {
  const diary = getDiary()
  const today = new Date()
  const key = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  diaryToday.value = diary.filter(d => {
    const t = new Date(d.createdAt)
    return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}` === key
  }).length

  const saved = getTodayContext() || {}
  Object.assign(ctx, saved)

  greeting.value = timeGreeting()
  nextMeal.value = nextMealGuess()
  modeLabel.value = modeText(deriveAgeMode(getProfile()))

  if (diary.length === 0) {
    reminder.value = '记录一顿餐食，Agent 会根据你的最近饮食给出更贴合的推荐。'
  } else {
    const recent = diary.slice(0, 2)
    const hasVeg = recent.some(d => (d.items || []).some(i => /菜|菠菜|青菜|西兰花|蔬菜|沙拉/.test(i.name || '')))
    reminder.value = hasVeg
      ? '最近饮食结构还不错，保持食物多样性即可。'
      : '最近两餐蔬菜较少，下一餐可以优先补充一种深色蔬菜。'
  }
})

function set(field, val) {
  ctx[field] = val
  setTodayContext({ ...ctx })
}
function goRecommend() {
  setTodayContext({ ...ctx })
  router.push('/recommend')
}
</script>

<style scoped>
.greet { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.status-line { color: #666; font-size: 13px; }
.q-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.grid-item {
  background: #fafafa; border-radius: 12px; padding: 14px 8px;
  text-align: center; font-size: 13px; color: #333;
  cursor: pointer; transition: background .15s;
}
.grid-item:hover { background: #f2f2f4; }
.grid-item .ico { font-size: 22px; margin-bottom: 4px; }
.reminder { color: #555; font-size: 13px; line-height: 1.6; margin: 0; }
</style>
