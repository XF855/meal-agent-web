<template>
  <div>
    <div class="card head-card">
      <div class="greet">{{ greeting }}</div>
      <div class="status-line">{{ modeLabel }} · 下一餐：{{ nextMeal }} · 今天已记录 {{ diaryToday }} 餐</div>
    </div>

    <!-- 今日营养建议 -->
    <div class="card">
      <div class="q-title">今日营养建议</div>
      <div v-if="nutritionLoading" class="subtitle">正在结合你最近几天的饮食生成建议…</div>
      <div v-else-if="nutrition && nutrition.items && nutrition.items.length">
        <div v-for="n in nutrition.items" :key="n.name" class="nutri-row">
          <div class="nutri-name">{{ n.name }} <span class="nutri-portion">· {{ n.portion }}</span></div>
          <div class="nutri-why">{{ n.why }}</div>
        </div>
        <div class="nutri-summary" v-if="nutrition.summary">{{ nutrition.summary }}</div>
      </div>
      <div v-else class="subtitle">再记录几餐就能看到个性化的营养建议。</div>
      <button class="btn-ghost slim" @click="loadNutrition">刷新建议</button>
    </div>

    <!-- 今日状态 -->
    <div class="card">
      <div class="q-title">今日状态</div>

      <div class="section-label">你现在有多饿</div>
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

      <div class="section-label">个性化补充（可选）</div>
      <textarea class="textarea"
                placeholder="例如：今天不想吃米饭 / 想吃茄子 / 中午没吃菜"
                v-model="personalNote"
                @change="saveNote"></textarea>
    </div>

    <!-- 快速入口 -->
    <div class="card">
      <div class="q-title">快速入口</div>
      <div class="grid">
        <label class="grid-item">
          <div class="ico">📷</div>拍照记录
          <input type="file" accept="image/*" capture="environment" hidden @change="onPickPhoto"/>
        </label>
        <div class="grid-item" @click="goRecommend">
          <div class="ico">🍽</div>帮我决定
        </div>
        <div class="grid-item" @click="$router.push('/diary')">
          <div class="ico">📔</div>饮食日记
        </div>
      </div>
      <div v-if="capturing" class="subtitle" style="margin-top: 8px;">
        识别中，请稍候…
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
import {
  getProfile, getDiary, getTodayContext, setTodayContext,
  deriveAgeMode, setPending, getDeliveryStores
} from '../services/store.js'
import { recognizeMeal, dailyNutrition } from '../services/agent.js'

const router = useRouter()
const ctx = reactive({
  hunger: '一般', mood: '普通', time: '20 分钟',
  scene: '外卖', crave: '无所谓'
})
const personalNote = ref('')
const greeting = ref('')
const modeLabel = ref('')
const nextMeal = ref('')
const diaryToday = ref(0)
const reminder = ref('')
const capturing = ref(false)

const nutrition = ref(null)
const nutritionLoading = ref(false)

const hungerOptions = ['不饿', '一般', '有点饿', '很饿']
const moodOptions = ['开心', '普通', '疲惫', '低落', '兴奋']
const timeOptions = ['10 分钟', '20 分钟', '30 分钟', '1 小时+']
const sceneOptions = ['在家做', '外卖', '食堂', '餐厅']
const craveOptions = [
  '无所谓', '清淡', '辣', '重口', '热汤', '凉的', '甜的',
  '面食', '米饭', '肉', '海鲜', '蔬菜', '烧烤', '火锅', '轻食', '主食少一点'
]

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
  personalNote.value = saved.personalNote || ''

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

  // 首屏立即拉一次营养建议（有缓存 5 分钟）
  loadNutrition()
})

function set(field, val) {
  ctx[field] = val
  setTodayContext({ ...ctx, personalNote: personalNote.value })
}
function saveNote() {
  setTodayContext({ ...ctx, personalNote: personalNote.value })
}
function goRecommend() {
  setTodayContext({ ...ctx, personalNote: personalNote.value })
  router.push('/recommend')
}

async function loadNutrition() {
  nutritionLoading.value = true
  const r = await dailyNutrition({
    profile: getProfile(),
    ageMode: deriveAgeMode(getProfile()),
    recentDiary: getDiary().slice(0, 10),
    todayContext: { ...ctx, personalNote: personalNote.value }
  })
  nutritionLoading.value = false
  if (r && r.ok && r.data) nutrition.value = r.data
}

// 拍照 → 压缩 → 调 recognizeMeal → 进 Confirm 页
function onPickPhoto(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  capturing.value = true
  compressToDataUrl(file).then(async (dataUrl) => {
    const r = await recognizeMeal({
      imageDataUrl: dataUrl,
      profile: getProfile(),
      recentStores: getDeliveryStores(5)
    })
    capturing.value = false
    const items = (r && r.ok && r.data && r.data.items) || []
    setPending('recognize', { items, imageSrc: dataUrl })
    router.push('/capture/confirm')
  }).catch(() => {
    capturing.value = false
    alert('图片读取失败，请重试')
  })
}

function compressToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > height && width > MAX) { height = height * MAX / width; width = MAX }
        else if (height > MAX) { width = width * MAX / height; height = MAX }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
</script>

<style scoped>
.head-card { padding-top: 18px; padding-bottom: 16px; }
.greet { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; margin-bottom: 4px; }
.status-line { color: #8e8e93; font-size: 13px; }
.q-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }

.nutri-row { padding: 8px 0; border-bottom: 0.5px solid rgba(60,60,67,0.14); }
.nutri-row:last-of-type { border-bottom: none; }
.nutri-name { font-size: 15px; font-weight: 500; }
.nutri-portion { color: #8e8e93; font-weight: 400; }
.nutri-why { color: #6d6d72; font-size: 13px; margin-top: 2px; line-height: 1.4; }
.nutri-summary { color: #6d6d72; font-size: 13px; margin-top: 8px; line-height: 1.5; }
.btn-ghost.slim { padding: 8px 0; font-size: 14px; margin-top: 12px; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.grid-item {
  background: #fafafa; border-radius: 12px; padding: 16px 8px;
  text-align: center; font-size: 13px; color: #1c1c1e;
  cursor: pointer; transition: background .15s;
  border: 0.5px solid rgba(60,60,67,0.1);
}
.grid-item:active { background: #f0f0f5; }
.grid-item .ico { font-size: 24px; margin-bottom: 4px; }
.reminder { color: #3c3c43; font-size: 14px; line-height: 1.6; margin: 0; }
</style>
