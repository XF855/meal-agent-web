<template>
  <div>
    <div class="progress"><div class="progress-inner" style="width:33%"></div></div>
    <h1 class="title">基础信息</h1>
    <p class="subtitle">2 分钟内完成，只用于生成推荐，不会公开。</p>

    <div class="card">
      <div class="section-label">出生年份（用于切换成长 / 成人 / 活力模式）</div>
      <input class="input" type="number" placeholder="例如 1998" v-model="form.birthYear" />
    </div>

    <div class="card">
      <div class="section-label">身高 cm · 可选</div>
      <input class="input" type="number" placeholder="例如 170" v-model="form.height" />
      <div class="section-label">体重 kg · 可选</div>
      <input class="input" type="number" placeholder="例如 60" v-model="form.weight" />
    </div>

    <div class="card">
      <div class="section-label">食物过敏（硬性过滤）</div>
      <div class="row">
        <span v-for="o in allergyOptions" :key="o"
              class="tag" :class="{active: form.allergies.includes(o)}"
              @click="toggle('allergies', o)">{{ o }}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-label">明确忌口（宗教 / 医学 / 个人）</div>
      <div class="row">
        <span v-for="o in tabooOptions" :key="o"
              class="tag" :class="{active: form.taboos.includes(o)}"
              @click="toggle('taboos', o)">{{ o }}</span>
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
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, setProfile } from '../services/store.js'

const router = useRouter()
const form = reactive({
  birthYear: '', height: '', weight: '',
  allergies: [], taboos: [], diet: '普通'
})
const allergyOptions = ['花生', '坚果', '海鲜', '虾', '蟹', '牛奶', '鸡蛋', '大豆', '麸质', '芒果']
const tabooOptions = ['不吃猪肉', '不吃牛肉', '不吃动物内脏', '低钠', '低糖', '低脂', '低嘌呤']
const dietOptions = ['普通', '素食', '蛋奶素', '清真', '低碳水', '高蛋白']

onMounted(() => {
  const p = getProfile() || {}
  if (p.basic) Object.assign(form, p.basic)
})
function toggle(field, val) {
  const arr = form[field]
  const idx = arr.indexOf(val)
  if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
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
.progress { height: 4px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.progress-inner { height: 100%; background: #ff7043; }
</style>
