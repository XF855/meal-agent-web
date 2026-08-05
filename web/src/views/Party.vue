<template>
  <div>
    <h1 class="title">聚餐决定</h1>
    <p class="subtitle">加入所有参与者，Agent 会合并大家的口味、避开每个人的过敏和忌口。</p>

    <!-- 参与者列表 -->
    <div class="card" v-for="(m, idx) in members" :key="m.id">
      <div class="head">
        <div class="member-name">
          <span class="badge" v-if="m.isMe">我</span>
          <input class="input inline" v-model="m.name" placeholder="参与者昵称"/>
        </div>
        <button class="act danger" v-if="!m.isMe" @click="removeMember(idx)">删除</button>
      </div>

      <div class="section-label">这位朋友的画像</div>
      <div class="row">
        <span v-for="c in m.cuisines" :key="c" class="tag active" @click="removeTag(m, 'cuisines', c)">
          {{ c }} ×
        </span>
        <span v-for="c in cuisineOptions" :key="'ck-'+c"
              v-show="!m.cuisines.includes(c)"
              class="tag" @click="addTag(m, 'cuisines', c)">{{ c }}</span>
      </div>

      <div class="section-label">辣度</div>
      <div class="row">
        <span v-for="s in spicyOptions" :key="s.v" class="tag"
              :class="{active: m.spicy === s.v}" @click="m.spicy = s.v">{{ s.label }}</span>
      </div>

      <div class="section-label">过敏（硬性排除）</div>
      <div class="row">
        <span v-for="a in m.allergies" :key="a" class="tag active danger-tag" @click="removeTag(m, 'allergies', a)">
          {{ a }} ×
        </span>
      </div>
      <div class="add-row">
        <input class="input" placeholder="例如：花生，回车添加" v-model="m._allergyDraft"
               @keyup.enter="pushDraft(m, 'allergies', '_allergyDraft')"/>
        <button class="add-btn" @click="pushDraft(m, 'allergies', '_allergyDraft')">添加</button>
      </div>

      <div class="section-label">忌口</div>
      <div class="row">
        <span v-for="a in m.taboos" :key="a" class="tag active" @click="removeTag(m, 'taboos', a)">
          {{ a }} ×
        </span>
      </div>
      <div class="add-row">
        <input class="input" placeholder="例如：不吃牛肉，回车添加" v-model="m._tabooDraft"
               @keyup.enter="pushDraft(m, 'taboos', '_tabooDraft')"/>
        <button class="add-btn" @click="pushDraft(m, 'taboos', '_tabooDraft')">添加</button>
      </div>

      <div class="section-label">导入朋友分享的画像文本</div>
      <div class="add-row">
        <input class="input" placeholder="粘贴 MEAL1:... 或直接粘 JSON" v-model="m._importDraft"/>
        <button class="add-btn" @click="importFor(m)">导入</button>
      </div>
    </div>

    <button class="btn-ghost" @click="addMember">＋ 加一位朋友</button>

    <div class="card">
      <div class="section-label">聚餐场景</div>
      <div class="row">
        <span v-for="o in ['餐厅','外卖凑单','食堂','家里做']" :key="o" class="tag"
              :class="{active: party.scene === o}" @click="party.scene = o">{{ o }}</span>
      </div>
      <div class="section-label">人均预算</div>
      <div class="row">
        <span v-for="o in ['≤ 40 元','40~80 元','80~150 元','≥ 150 元']" :key="o" class="tag"
              :class="{active: party.budget === o}" @click="party.budget = o">{{ o }}</span>
      </div>
    </div>

    <button class="btn-primary" :disabled="running" @click="generate">
      {{ running ? '正在生成…' : '生成聚餐方案' }}
    </button>

    <div class="card" v-for="p in picks" :key="p.key">
      <div class="pick-title">{{ p.title }}</div>
      <div class="pick-dish">{{ p.dish }}</div>
      <div class="row">
        <span class="tag active">{{ p.budget }}</span>
      </div>
      <p class="pick-reason">{{ p.reason }}</p>
      <p class="pick-notes" v-if="p.notes">备注：{{ p.notes }}</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { getProfile, decodeProfileText } from '../services/store.js'
import { party as callParty } from '../services/agent.js'

const cuisineOptions = ['川菜', '粤菜', '湘菜', '本帮菜', '杭帮菜', '西北', '东北', '日料', '韩料', '东南亚', '西餐', '快餐']
const spicyOptions = [
  { v: 0, label: '不吃辣' }, { v: 1, label: '微辣' },
  { v: 2, label: '中辣' }, { v: 3, label: '重辣' }
]

const members = ref([])
const party = reactive({ scene: '餐厅', budget: '40~80 元' })
const picks = ref([])
const running = ref(false)

let idSeq = 0
function newMember(base) {
  return {
    id: ++idSeq,
    isMe: !!(base && base.isMe),
    name: (base && base.name) || '朋友 ' + idSeq,
    cuisines: (base && base.cuisines) || [],
    spicy: (base && base.spicy) != null ? base.spicy : 1,
    allergies: (base && base.allergies) || [],
    taboos: (base && base.taboos) || [],
    _allergyDraft: '', _tabooDraft: '', _importDraft: ''
  }
}

onMounted(() => {
  const my = getProfile() || {}
  members.value.push(newMember({
    isMe: true,
    name: '我',
    cuisines: (my.prefer && my.prefer.cuisines) || [],
    spicy: (my.prefer && my.prefer.spicy) != null ? my.prefer.spicy : 1,
    allergies: (my.basic && my.basic.allergies) || [],
    taboos: (my.basic && my.basic.taboos) || []
  }))
  members.value.push(newMember({}))  // 默认加一位待填的朋友
})

function addMember() { members.value.push(newMember({})) }
function removeMember(idx) { members.value.splice(idx, 1) }
function addTag(m, field, v) { if (!m[field].includes(v)) m[field].push(v) }
function removeTag(m, field, v) {
  const i = m[field].indexOf(v); if (i >= 0) m[field].splice(i, 1)
}
function pushDraft(m, field, key) {
  const v = (m[key] || '').trim(); if (!v) return
  if (!m[field].includes(v)) m[field].push(v)
  m[key] = ''
}
function importFor(m) {
  const p = decodeProfileText(m._importDraft || '')
  if (!p) { alert('无法识别画像文本'); return }
  const basic = p.basic || {}
  const prefer = p.prefer || {}
  m.cuisines = prefer.cuisines || []
  m.spicy = prefer.spicy != null ? prefer.spicy : 1
  m.allergies = basic.allergies || []
  m.taboos = basic.taboos || []
  m._importDraft = ''
  alert('已导入。核对信息后再生成方案。')
}

async function generate() {
  running.value = true
  picks.value = []
  const payload = {
    members: members.value.map(m => ({
      name: m.name, isMe: m.isMe,
      cuisines: m.cuisines, spicy: m.spicy,
      allergies: m.allergies, taboos: m.taboos
    })),
    party: { ...party }
  }
  const r = await callParty(payload)
  running.value = false
  if (r && r.ok) picks.value = r.data.picks || []
  else alert('生成失败，请稍后再试')
}
</script>

<style scoped>
.head { display: flex; align-items: center; margin-bottom: 10px; gap: 10px; }
.member-name { display: flex; align-items: center; gap: 10px; flex: 1; }
.badge {
  background: transparent; color: #111;
  border: 1px solid rgba(0,0,0,0.08);
  font-size: 11px; letter-spacing: 0.06em;
  padding: 2px 10px; border-radius: 999px;
}
.input.inline { flex: 1; padding: 10px 12px; font-size: 15px; background: transparent; }
.input.inline:focus { background: #f7f7f7; }
.act {
  background: transparent; border: 1px solid rgba(0,0,0,0.08);
  color: #666; padding: 4px 12px; font-size: 12px;
  border-radius: 999px; cursor: pointer;
}
.act.danger { color: #8a3d34; border-color: rgba(138,61,52,0.2); }
.add-row { display: flex; gap: 8px; margin-top: 12px; }
.add-row .input { flex: 1; }
.add-btn {
  background: transparent; border: 1px solid rgba(0,0,0,0.08);
  color: #111; font-size: 13px;
  padding: 0 18px; border-radius: 999px; cursor: pointer;
}
.pick-title {
  color: #8a8a8a; font-size: 12px;
  font-weight: 400; letter-spacing: 0.1em;
  text-transform: uppercase; margin-bottom: 12px;
}
.pick-dish {
  font-size: 24px; font-weight: 300; color: #111;
  letter-spacing: -0.01em; line-height: 1.3;
  margin-bottom: 16px;
}
.pick-reason { color: #444; font-size: 14px; line-height: 1.7; margin: 10px 0; }
.pick-notes { color: #8a8a8a; font-size: 13px; margin: 10px 0 0; font-style: italic; }
.danger-tag { border-color: rgba(0,0,0,0.08); color: #8a3d34; }
</style>
