<template>
  <div>
    <p class="subtitle">只有你确认后的数据才会写入日记与推荐系统。</p>

    <div class="card" v-if="imageSrc">
      <img :src="imageSrc" style="width:100%; border-radius: 10px;" />
    </div>

    <div class="card">
      <div class="section-label">识别到的菜品</div>
      <div v-for="(it, idx) in items" :key="idx" class="item-row">
        <input class="input inline" placeholder="菜名" v-model="it.name"/>
        <input class="input inline" placeholder="份量" v-model="it.portion"/>
        <button class="del" @click="items.splice(idx, 1)">删除</button>
      </div>
      <button class="btn-ghost" @click="addOne">＋ 加一个漏识别的食物</button>
    </div>

    <button class="btn-primary" @click="confirm">确认，并让 Agent 推荐下一餐</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPending, setPending, appendDiary } from '../services/store.js'

const router = useRouter()
const items = ref([])
const imageSrc = ref('')

onMounted(() => {
  const p = getPending('recognize') || {}
  items.value = (p.items || []).map(x => ({ ...x }))
  imageSrc.value = p.imageSrc || ''
})

function addOne() {
  items.value.push({ name: '', portion: '一份', method: '', confidence: 1 })
}
function guessMeal() {
  const h = new Date().getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '加餐'
  if (h < 21) return '晚餐'
  return '夜宵'
}
function confirm() {
  const valid = items.value.filter(x => (x.name || '').trim())
  if (valid.length === 0) { alert('至少确认一项'); return }
  appendDiary({ items: valid, imageSrc: imageSrc.value, confirmed: true, meal: guessMeal() })
  setPending('recognize', null)
  router.replace('/recommend')
}
</script>

<style scoped>
.item-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 0; border-bottom: 1px solid #f0f0f2;
}
.input.inline { flex: 1; padding: 8px 10px; font-size: 13px; }
.del { border: none; background: transparent; color: #ff5252; font-size: 12px; cursor: pointer; }
</style>
