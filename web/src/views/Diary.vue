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
          <span class="actions">
            <button class="act" @click="startEdit(e)">编辑</button>
            <button class="act danger" @click="onDelete(e)">删除</button>
          </span>
        </div>
        <img v-if="e.imageSrc" :src="e.imageSrc" class="preview"/>
        <div v-for="it in e.items" :key="it.name + it.portion" class="line">
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

    <!-- 编辑弹层 -->
    <div v-if="editing" class="mask" @click.self="cancelEdit">
      <div class="sheet">
        <div class="sheet-head">
          <span>编辑这一餐</span>
          <button class="close" @click="cancelEdit">×</button>
        </div>

        <div class="section-label">餐次</div>
        <div class="row">
          <span v-for="m in mealOptions" :key="m" class="tag"
                :class="{active: draft.meal === m}" @click="draft.meal = m">{{ m }}</span>
        </div>

        <div class="section-label">菜品</div>
        <div v-for="(it, idx) in draft.items" :key="idx" class="item-row">
          <input class="input inline" v-model="it.name" placeholder="菜名"/>
          <input class="input inline" v-model="it.portion" placeholder="份量"/>
          <button class="act danger" @click="draft.items.splice(idx, 1)">×</button>
        </div>
        <button class="btn-ghost small" @click="addItem">＋ 加一项</button>

        <div class="section-label">饭后感受 · 可选</div>
        <div class="row">
          <span v-for="o in feelOptions" :key="o" class="tag"
                :class="{active: draft.feedback && draft.feedback.feel === o}"
                @click="setFeel(o)">{{ o }}</span>
        </div>

        <button class="btn-primary" @click="saveEdit">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getDiary, updateDiary, deleteDiary } from '../services/store.js'

const groups = ref([])
const summary = ref('')
const editing = ref(false)
const draft = reactive({ id: null, meal: '', items: [], feedback: null })

const mealOptions = ['早餐', '午餐', '加餐', '晚餐', '夜宵']
const feelOptions = ['舒服', '偏腻', '胀', '困', '其他']

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

function refresh() {
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
}

onMounted(refresh)

function onDelete(e) {
  if (!confirm(`删除「${(e.items[0] && e.items[0].name) || '这条记录'}」？此操作不可撤销。`)) return
  deleteDiary(e.id)
  refresh()
}

function startEdit(e) {
  draft.id = e.id
  draft.meal = e.meal || '午餐'
  draft.items = (e.items || []).map(x => ({ ...x }))
  draft.feedback = e.feedback ? { ...e.feedback } : null
  editing.value = true
}
function cancelEdit() { editing.value = false }
function addItem() { draft.items.push({ name: '', portion: '一份' }) }
function setFeel(o) {
  if (!draft.feedback) draft.feedback = { score: 4, fullness: '刚好', feel: o, willAgain: '愿意' }
  else draft.feedback.feel = o
}
function saveEdit() {
  const valid = draft.items.filter(x => (x.name || '').trim())
  if (!valid.length) { alert('至少保留一项菜品'); return }
  updateDiary(draft.id, { meal: draft.meal, items: valid, feedback: draft.feedback })
  editing.value = false
  refresh()
}
</script>

<style scoped>
.day-title { color: #888; font-size: 12px; margin: 8px 4px; }
.head {
  display: flex; align-items: center; margin-bottom: 6px; gap: 8px;
}
.meal { color: #ff7043; font-weight: 600; font-size: 13px; }
.time { color: #999; font-size: 12px; }
.actions { margin-left: auto; display: flex; gap: 4px; }
.act {
  background: transparent; border: 1px solid #e0e0e2;
  color: #666; padding: 3px 10px; font-size: 12px;
  border-radius: 12px; cursor: pointer;
}
.act.danger { color: #ff5252; border-color: #ffd0d0; }
.preview { width: 100%; border-radius: 8px; margin: 6px 0; }
.line { color: #333; font-size: 13px; line-height: 1.6; }
.fb { color: #888; font-size: 12px; margin-top: 6px; }

.mask {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 16px;
  max-height: 84vh; overflow-y: auto;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
}
.sheet-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; font-weight: 600; margin-bottom: 8px;
}
.close {
  border: none; background: transparent;
  font-size: 24px; line-height: 1; color: #888; cursor: pointer;
}
.item-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 0; border-bottom: 1px solid #f2f2f4;
}
.input.inline { flex: 1; padding: 8px 10px; font-size: 13px; }
.btn-ghost.small {
  width: auto; padding: 6px 14px; font-size: 13px;
  margin: 8px 0 4px;
}
</style>
