<template>
  <div>
    <div class="progress"><div class="progress-inner" style="width:33%"></div></div>
    <h1 class="title">基础信息</h1>
    <p class="subtitle">2 分钟内完成，只用于生成推荐，不会公开。</p>

    <div class="card">
      <div class="section-label">出生年份</div>
      <input class="input" type="number" placeholder="例如 1998" v-model="form.birthYear" />
    </div>

    <div class="card">
      <div class="section-label">身高 cm · 可选</div>
      <input class="input" type="number" placeholder="例如 170" v-model="form.height" />
      <div class="section-label">体重 kg · 可选</div>
      <input class="input" type="number" placeholder="例如 60" v-model="form.weight" />
    </div>

    <div class="card">
      <div class="section-label">食物过敏</div>
      <div class="row">
        <span v-for="o in allergyOptions" :key="o"
              class="tag" :class="{active: form.allergies.includes(o)}"
              @click="toggle('allergies', o)">{{ o }}</span>
        <span v-for="c in customAllergies" :key="'c-'+c"
              class="tag active" @click="removeCustom('allergies', c)">
          {{ c }} ×
        </span>
      </div>
      <div class="add-row">
        <input class="input" placeholder="其他过敏原，回车添加"
               v-model="allergyDraft" @keyup.enter="addCustom('allergies')"/>
        <button class="add-btn" @click="addCustom('allergies')">添加</button>
      </div>
    </div>

    <div class="card">
      <div class="section-label">明确忌口</div>
      <div class="row">
        <span v-for="o in tabooOptions" :key="o"
              class="tag" :class="{active: form.taboos.includes(o)}"
              @click="toggle('taboos', o)">{{ o }}</span>
        <span v-for="c in customTaboos" :key="'ct-'+c"
              class="tag active" @click="removeCustom('taboos', c)">
          {{ c }} ×
        </span>
      </div>
      <div class="add-row">
        <input class="input" placeholder="其他忌口，回车添加"
               v-model="tabooDraft" @keyup.enter="addCustom('taboos')"/>
        <button class="add-btn" @click="addCustom('taboos')">添加</button>
      </div>
    </div>

    <div class="card">
      <div class="section-label">健康偏好</div>
      <div class="row">
        <span v-for="o in healthPrefOptions" :key="o"
              class="tag" :class="{active: form.healthPrefs.includes(o)}"
              @click="toggle('healthPrefs', o)">{{ o }}</span>
        <span v-for="c in customHealthPrefs" :key="'h-'+c"
              class="tag active" @click="removeCustom('healthPrefs', c)">
          {{ c }} ×
        </span>
      </div>
      <div class="add-row">
        <input class="input" placeholder="其他健康偏好，回车添加"
               v-model="healthDraft" @keyup.enter="addCustom('healthPrefs')"/>
        <button class="add-btn" @click="addCustom('healthPrefs')">添加</button>
      </div>
    </div>

    <div class="card">
      <div class="section-label">饮食类型</div>
      <div class="row">
        <span v-for="o in dietOptions" :key="o"
              class="tag" :class="{active: form.diet === o}"
              @click="form.diet = o">{{ o }}</span>
      </div>
    </div>

    <button class="btn-primary" @click="next">下一步：口味与场景</button>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, setProfile } from '../services/store.js'

const router = useRouter()
const form = reactive({
  birthYear: '', height: '', weight: '',
  allergies: [], taboos: [], healthPrefs: [], diet: '普通'
})
const allergyOptions = ['花生', '坚果', '海鲜', '虾', '蟹', '牛奶', '鸡蛋', '大豆', '麸质', '芒果']
const tabooOptions = ['不吃猪肉', '不吃牛肉', '不吃动物内脏', '不吃羊肉', '不吃海鲜']
const healthPrefOptions = ['低钠', '低糖', '低脂', '低嘌呤', '控碳水', '多蔬菜', '多蛋白']
const dietOptions = ['普通', '素食', '蛋奶素', '清真', '低碳水', '高蛋白']

const allergyDraft = ref('')
const tabooDraft = ref('')
const healthDraft = ref('')

// 自定义项 = 已选中但不在预设里的
const customAllergies = computed(() => form.allergies.filter(x => !allergyOptions.includes(x)))
const customTaboos = computed(() => form.taboos.filter(x => !tabooOptions.includes(x)))
const customHealthPrefs = computed(() => form.healthPrefs.filter(x => !healthPrefOptions.includes(x)))

onMounted(() => {
  const p = getProfile() || {}
  if (p.basic) {
    Object.assign(form, p.basic)
    if (!Array.isArray(form.healthPrefs)) form.healthPrefs = []
    // 老数据兼容：把之前放在 taboos 里的健康偏好迁到 healthPrefs
    const migrateFrom = ['低钠', '低糖', '低脂', '低嘌呤']
    const moved = []
    form.taboos = (form.taboos || []).filter(t => {
      if (migrateFrom.includes(t)) { moved.push(t); return false }
      return true
    })
    moved.forEach(m => { if (!form.healthPrefs.includes(m)) form.healthPrefs.push(m) })
  }
})
function toggle(field, val) {
  const arr = form[field]
  const idx = arr.indexOf(val)
  if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
}
function addCustom(field) {
  const draftRef = field === 'allergies' ? allergyDraft
                 : field === 'taboos' ? tabooDraft
                 : healthDraft
  const v = (draftRef.value || '').trim()
  if (!v) return
  if (!form[field].includes(v)) form[field].push(v)
  draftRef.value = ''
}
function removeCustom(field, v) {
  const idx = form[field].indexOf(v)
  if (idx >= 0) form[field].splice(idx, 1)
}
function next() {
  if (!form.birthYear) { alert('请填写出生年份'); return }
  const p = getProfile() || {}
  p.basic = { ...form }
  setProfile(p)
  router.push('/onboarding/prefer')
}
</script>

<style scoped>
.progress { height: 1px; background: rgba(74,52,40,0.10); overflow: hidden; margin-bottom: 20px; }
.progress-inner { height: 100%; background: #c46a3a; }
.input[type="number"]::-webkit-outer-spin-button,
.input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
.add-row { display: flex; gap: 8px; margin-top: 12px; }
.add-row .input { flex: 1; }
.add-btn {
  background: transparent; border: 1px solid rgba(74,52,40,0.10);
  color: #2a1e17; font-size: 13px;
  padding: 0 16px; border-radius: 999px; cursor: pointer;
}
</style>
