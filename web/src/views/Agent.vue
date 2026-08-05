<template>
  <div class="agent-page">
    <div class="chat">
      <p class="hint" v-if="messages.length === 0">
        上传最近吃过的几顿饭，我先了解你的口味再帮你决定下一餐。
      </p>

      <div v-for="m in messages" :key="m.id"
           class="row-msg" :class="{ 'row-user': m.role === 'user' }">
        <div class="msg" :class="m.role === 'user' ? 'msg-user' : 'msg-agent'">
          <template v-if="m.type === 'text'">{{ m.text }}</template>
          <img v-else-if="m.type === 'image'" :src="m.src" class="thumb"/>
          <template v-else-if="m.type === 'recognize'">
            <div style="margin-bottom:6px;">识别到这顿饭包含：</div>
            <div v-for="it in m.items" :key="it.name" class="line">
              · {{ it.name }}（{{ it.portion }} · 可信度 {{ it.confidence }}）
            </div>
            <button class="btn-ghost mini" @click="goConfirm(m)">去确认</button>
          </template>
        </div>
      </div>
    </div>

    <div class="bar">
      <label class="bar-ghost">
        📷
        <input type="file" accept="image/*" capture="environment"
               @change="onPickFile" hidden />
      </label>
      <input class="bar-input" placeholder="继续追问，例如：我不想吃米饭"
             v-model="input" @keyup.enter="send"/>
      <button class="bar-btn" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as agent from '../services/agent.js'
import { getProfile, getTodayContext, setPending } from '../services/store.js'

const router = useRouter()
const messages = ref([])
const input = ref('')
let seq = 0
const mid = () => ++seq + '_' + Date.now()

onMounted(() => {
  messages.value.push({
    id: mid(), role: 'agent', type: 'text',
    text: '你好，我是你的饮食决策 Agent。可以先上传最近一到两顿饭的照片，我识别后再帮你决定下一餐。'
  })
})

function onPickFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => recognize(reader.result, file)
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function recognize(dataUrl, file) {
  messages.value.push({ id: mid(), role: 'user', type: 'image', src: dataUrl })
  messages.value.push({ id: mid(), role: 'agent', type: 'text', text: '识别中，请稍候…' })
  const r = await agent.recognizeMeal({ imageName: file.name, imageSize: file.size })
  const last = messages.value[messages.value.length - 1]
  if (r && r.ok) {
    Object.assign(last, {
      role: 'agent', type: 'recognize',
      items: r.data.items, imageSrc: dataUrl
    })
  } else {
    Object.assign(last, { type: 'text', text: '识别失败，请再试一次。' })
  }
}

function goConfirm(m) {
  setPending('recognize', { items: m.items, imageSrc: m.imageSrc })
  router.push('/agent/confirm')
}

async function send() {
  const text = (input.value || '').trim()
  if (!text) return
  messages.value.push({ id: mid(), role: 'user', type: 'text', text })
  input.value = ''
  messages.value.push({ id: mid(), role: 'agent', type: 'text', text: '思考中…' })
  const r = await agent.chat({
    userText: text,
    profile: getProfile(),
    todayContext: getTodayContext(),
    history: messages.value.filter(x => x.type === 'text').slice(-8).map(x => ({ role: x.role, text: x.text }))
  })
  const last = messages.value[messages.value.length - 1]
  last.text = (r && r.data && r.data.reply) || '（无回复）'
}
</script>

<style scoped>
.agent-page { padding-bottom: 140px; }
.chat { display: flex; flex-direction: column; }
.hint { color: #888; font-size: 12px; text-align: center; margin: 8px 0; }
.row-msg { display: flex; margin-bottom: 10px; }
.row-user { justify-content: flex-end; }
.msg {
  max-width: 78%; padding: 10px 14px;
  border-radius: 14px; font-size: 14px;
  line-height: 1.5; word-break: break-word;
}
.msg-agent { background: #fff; color: #222; }
.msg-user { background: #ff7043; color: #fff; }
.thumb { width: 140px; height: 140px; object-fit: cover; border-radius: 10px; display: block; }
.line { font-size: 13px; margin: 2px 0; }
.btn-ghost.mini {
  margin-top: 8px; width: auto; padding: 6px 14px; font-size: 13px;
  border-radius: 16px;
}

.bar {
  position: fixed; left: 0; right: 0; bottom: 60px;
  background: #fff; padding: 10px 14px;
  display: flex; align-items: center; gap: 8px;
  border-top: 1px solid #eee;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0));
}
.bar-input {
  flex: 1; background: #f2f2f4; border: none;
  border-radius: 20px; padding: 10px 14px;
  font-size: 14px; outline: none;
}
.bar-btn {
  background: #ff7043; color: #fff; border: none;
  border-radius: 20px; padding: 8px 16px; font-size: 13px; cursor: pointer;
}
.bar-ghost {
  border: 1px solid #ff7043; color: #ff7043;
  border-radius: 20px; padding: 6px 12px; font-size: 13px; cursor: pointer;
  background: #fff;
}
</style>
