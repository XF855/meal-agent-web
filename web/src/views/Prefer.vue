<template>
  <div>
    <div class="progress"><div class="progress-inner" style="width:66%"></div></div>
    <h1 class="title">口味与场景</h1>
    <p class="subtitle">这些只影响排序，不作医疗结论。</p>

    <div class="card">
      <div class="section-label">喜欢的菜系（可多选）</div>
      <div class="row">
        <span v-for="o in cuisineOptions" :key="o"
              class="tag" :class="{active: form.cuisines.includes(o)}"
              @click="toggle('cuisines', o)">{{ o }}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-label">辣度偏好</div>
      <div class="row">
        <span v-for="o in spicyOptions" :key="o.value"
              class="tag" :class="{active: form.spicy === o.value}"
              @click="form.spicy = o.value">{{ o.label }}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-label">日常用餐方式</div>
      <div class="row">
        <span v-for="o in sceneOptions" :key="o"
              class="tag" :class="{active: form.scenes.includes(o)}"
              @click="toggle('scenes', o)">{{ o }}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-label">单餐预算</div>
      <div class="row">
        <span v-for="o in budgetOptions" :key="o"
              class="tag" :class="{active: form.budget === o}"
              @click="form.budget = o">{{ o }}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-label">最喜欢的食物 · 可选</div>
      <input class="input" placeholder="例如：番茄鸡蛋、麻辣烫" v-model="form.favorites"/>
      <div class="section-label">不喜欢的食物 · 可选</div>
      <input class="input" placeholder="例如：香菜、动物内脏" v-model="form.dislikes"/>
    </div>

    <button class="btn-primary" @click="finish">完成，开始使用</button>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, setProfile } from '../services/store.js'

const router = useRouter()
const form = reactive({
  cuisines: [], spicy: 1, scenes: [], budget: '20~40 元',
  favorites: '', dislikes: ''
})
const cuisineOptions = ['川菜', '粤菜', '湘菜', '本帮菜', '杭帮菜', '西北', '东北', '日料', '韩料', '东南亚', '西餐', '快餐']
const spicyOptions = [
  { value: 0, label: '不吃辣' }, { value: 1, label: '微辣' },
  { value: 2, label: '中辣' }, { value: 3, label: '重辣' }
]
const sceneOptions = ['自己做饭', '食堂', '外卖', '餐厅']
const budgetOptions = ['≤ 20 元', '20~40 元', '40~80 元', '≥ 80 元']

onMounted(() => {
  const p = getProfile() || {}
  if (p.prefer) Object.assign(form, p.prefer)
})
function toggle(field, val) {
  const arr = form[field]
  const idx = arr.indexOf(val)
  if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
}
function finish() {
  const p = getProfile() || {}
  p.prefer = { ...form }
  p.onboarded = true
  setProfile(p)
  router.replace('/today')
}
</script>

<style scoped>
.progress { height: 4px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.progress-inner { height: 100%; background: #ff7043; }
</style>
