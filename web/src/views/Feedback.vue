<template>
  <div>
    <h1 class="title">饭后反馈</h1>
    <p class="subtitle">吃完再回来花 10 秒告诉我，下次推荐会更准。</p>

    <div class="card">
      <div class="section-label">满意度</div>
      <div class="row">
        <span v-for="n in [1,2,3,4,5]" :key="n" class="tag"
              :class="{active: fb.score === n}" @click="fb.score = n">{{ n }} 分</span>
      </div>

      <div class="section-label">饱腹感</div>
      <div class="row">
        <span v-for="o in ['不够','刚好','太多']" :key="o" class="tag"
              :class="{active: fb.fullness === o}" @click="fb.fullness = o">{{ o }}</span>
      </div>

      <div class="section-label">饭后感受</div>
      <div class="row">
        <span v-for="o in feelOptions" :key="o" class="tag"
              :class="{active: fb.feel === o}" @click="fb.feel = o">{{ o }}</span>
      </div>
      <textarea v-if="fb.feel === '其他'" class="textarea" style="margin-top:8px;"
                placeholder="说说饭后的具体感受，例如：喉咙有点干、胃有点反酸…"
                v-model="fb.customFeel"></textarea>

      <div class="section-label">下次还愿意吃吗</div>
      <div class="row">
        <span v-for="o in ['愿意','不确定','不愿意']" :key="o" class="tag"
              :class="{active: fb.willAgain === o}" @click="fb.willAgain = o">{{ o }}</span>
      </div>
    </div>

    <button class="btn-primary" @click="submit">提交</button>
    <button class="btn-ghost" @click="$router.replace('/today')">先跳过</button>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getDiary, updateDiary } from '../services/store.js'

const router = useRouter()
const feelOptions = ['舒服', '偏腻', '胀', '困', '其他']
const fb = reactive({ score: 4, fullness: '刚好', feel: '舒服', customFeel: '', willAgain: '愿意' })

function submit() {
  const target = getDiary().find(d => d.awaitingFeedback)
  const payload = { ...fb }
  if (payload.feel !== '其他') payload.customFeel = ''
  if (target) updateDiary(target.id, { awaitingFeedback: false, feedback: payload })
  alert('已记录，谢谢反馈')
  router.replace('/today')
}
</script>
