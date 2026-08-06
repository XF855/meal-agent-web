<template>
  <div>
    <div class="card">
      <h2 class="title" style="font-size:17px;">当前模式</h2>
      <span class="tag active">{{ modeLabel }}</span>
    </div>

    <div class="card">
      <h2 class="title" style="font-size:17px;">饮食卡片</h2>
      <div class="row" v-if="profile?.basic">
        <span class="tag" v-if="profile.basic.birthYear">出生年 {{ profile.basic.birthYear }}</span>
        <span class="tag" v-if="profile.basic.diet">饮食 {{ profile.basic.diet }}</span>
        <span class="tag" v-for="a in profile.basic.allergies" :key="a">过敏 {{ a }}</span>
        <span class="tag" v-for="t in profile.basic.taboos" :key="t">忌口 {{ t }}</span>
        <span class="tag" v-for="h in (profile.basic.healthPrefs || [])" :key="h">健康 {{ h }}</span>
      </div>
      <div class="row" v-if="profile?.prefer" style="margin-top: 8px;">
        <span class="tag" v-for="c in profile.prefer.cuisines" :key="c">{{ c }}</span>
        <span class="tag" v-if="profile.prefer.budget">预算 {{ profile.prefer.budget }}</span>
      </div>
      <button class="btn-ghost slim" @click="$router.push('/onboarding/basic')">修改</button>
    </div>

    <!-- 画像分享 -->
    <div class="card">
      <h2 class="title" style="font-size:17px;">分享 / 导入画像</h2>
      <p class="subtitle">在"聚餐"里可以直接粘贴朋友分享的这段文本，无需重新填写。</p>

      <button class="btn-ghost slim" @click="showExport">导出我的画像</button>
      <textarea v-if="exportText" class="textarea" style="margin-top:8px;" readonly :value="exportText"></textarea>
      <button v-if="exportText" class="btn-ghost slim" @click="copyExport">复制</button>

      <div class="hr"></div>

      <div class="section-label">导入已有画像</div>
      <textarea class="textarea" placeholder="粘贴 MEAL1:... 或直接粘 JSON" v-model="importDraft"></textarea>
      <button class="btn-ghost slim" @click="doImport">导入</button>
    </div>

    <button class="btn-ghost danger-btn" @click="clear">清空本地数据</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getProfile, deriveAgeMode, clearAll,
  exportProfileText, decodeProfileText, importProfile
} from '../services/store.js'

const router = useRouter()
const profile = ref(null)
const modeLabel = ref('')
const exportText = ref('')
const importDraft = ref('')

onMounted(() => {
  profile.value = getProfile()
  const m = deriveAgeMode(profile.value)
  modeLabel.value = ({ growth: '成长模式', adult: '成人模式', senior: '活力模式' })[m]
})

function showExport() {
  exportText.value = exportProfileText()
}
function copyExport() {
  if (!exportText.value) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(exportText.value).then(
      () => alert('已复制'),
      () => fallbackCopy(exportText.value)
    )
  } else {
    fallbackCopy(exportText.value)
  }
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text; document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy'); alert('已复制') }
  catch (e) { alert('复制失败，请长按选择') }
  document.body.removeChild(ta)
}
function doImport() {
  const p = decodeProfileText(importDraft.value)
  if (!p) { alert('无法识别，请检查粘贴内容'); return }
  if (!confirm('导入会覆盖你现在的画像，确定？')) return
  importProfile(p)
  alert('已导入')
  window.location.reload()
}

function clear() {
  if (!confirm('会删除本地画像、日记与今日状态，且不可恢复。')) return
  clearAll()
  router.replace('/onboarding/brand')
}
</script>

<style scoped>
.btn-ghost.slim { padding: 12px 0; font-size: 13px; margin-top: 12px; }
.btn-ghost.danger-btn { color: #a04a3a; border-color: rgba(160,74,58,0.2); margin-top: 24px; }
</style>
