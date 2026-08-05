// Vercel Serverless Function: /api/agent
// 环境变量：
//   ANTHROPIC_API_KEY   必填，你的密钥
//   ANTHROPIC_MODEL     可选，默认 claude-opus-4-7
//   ANTHROPIC_BASE_URL  可选，第三方代理（如 eazo）用这个替换官方地址
//                       例：https://api.eazo.io  或  https://api.eazo.io/v1
//   ANTHROPIC_AUTH_STYLE 可选，'x-api-key'（默认，官方）或 'bearer'（多数代理）
// 未配置 KEY 时自动降级为 Mock，前端行为不受影响

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7'
const AUTH_STYLE = (process.env.ANTHROPIC_AUTH_STYLE || 'x-api-key').toLowerCase()

function buildUrl() {
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
  // 如果用户已经填了带 /v1 的路径，直接拼 /messages；否则补 /v1/messages
  if (/\/v1$/.test(base)) return base + '/messages'
  if (/\/messages$/.test(base)) return base
  return base + '/v1/messages'
}
const ANTHROPIC_URL = buildUrl()

const SYSTEM_PROMPT = `你是一个"饮食决策 Agent"。目标：在安全、营养、口味、情绪、便利之间，帮用户在 1 分钟内决定"下一餐吃什么"。

必须遵守：
1. 先做安全过滤：过敏、明确忌口、年龄模式规则优先于任何评分。
2. 每次推荐固定给出三个具体选择：今天最合适 / 今天最想吃 / 今天最省事。
3. 用具体菜名、份量、做法或点单方式，不要笼统建议。
4. 输出必须是合法 JSON，字段严格按用户消息中的 schema。不要输出任何 JSON 以外的内容。`

const MOCK = {
  recognizeMeal: {
    items: [
      { name: '米饭', portion: '一碗', method: '蒸', confidence: 0.92 },
      { name: '红烧鸡肉', portion: '一份', method: '红烧', confidence: 0.86 },
      { name: '炒青菜', portion: '一小份', method: '清炒', confidence: 0.81 }
    ],
    followUps: ['米饭大约是半碗还是一碗？', '鸡肉是否带皮？', '有没有喝饮料？']
  },
  recommend: {
    picks: [
      { key: 'balanced', title: '今天最合适', dish: '番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜', reason: '最近两餐蛋白质多为猪肉，这一餐换成虾和豆腐更丰富。', budget: '30~45 元', time: '25 分钟', allergens: ['虾', '大豆'], swaps: ['虾仁 ↔ 鸡胸肉'], howto: '外卖搜"豆腐煲"，或在家：热油下姜蒜，番茄炒软后加水、豆腐、虾仁煮 5 分钟。' },
      { key: 'crave', title: '今天最想吃', dish: '清汤麻辣烫（牛肉+豆腐+菌菇+粉）', reason: '照顾情绪与口味，保留辣味但少喝汤。', budget: '25~35 元', time: '15 分钟', allergens: ['大豆'], swaps: ['粉 ↔ 魔芋'], howto: '附近麻辣烫店或外卖任选，告知不要额外辣油。' },
      { key: 'easy', title: '今天最省事', dish: '海南鸡饭 + 一份青菜', reason: '出餐快、附近好找，符合只有 20 分钟的条件。', budget: '22~28 元', time: '10 分钟', allergens: [], swaps: ['青菜 ↔ 西兰花'], howto: '外卖直接下单，指定少油。' }
    ]
  },
  chat: { reply: '（Mock 回复）已按你的要求调整。接入真实 Key 后会得到具体分析。' }
}

async function callClaude(userJson, schemaHint, opts) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  // opts.imageDataUrl 存在时启用 vision，走多模态 content
  const userContent = []
  if (opts && opts.imageDataUrl) {
    const m = String(opts.imageDataUrl).match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/)
    if (m) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: m[1], data: m[2] }
      })
    }
  }
  userContent.push({
    type: 'text',
    text: `请严格返回 JSON，字段 schema：${schemaHint}\n\n上下文数据：\n${JSON.stringify(userJson)}`
  })

  const body = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }]
  }
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01'
  }
  if (AUTH_STYLE === 'bearer') {
    headers['authorization'] = 'Bearer ' + key
  } else {
    headers['x-api-key'] = key
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('claude_http_' + res.status + ' ' + text.slice(0, 200))
  }
  const data = await res.json()
  const text = (data && data.content && data.content[0] && data.content[0].text) || ''
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('claude_no_json')
  return JSON.parse(m[0])
}

export default async function handler(req, res) {
  // CORS：Vercel 同域可省略，跨域联调时打开
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method_not_allowed' }); return }

  try {
    const body = await readBody(req)
    const { action, payload } = body || {}

    if (action === 'recognizeMeal') {
      const { imageDataUrl, ...ctx } = payload || {}
      if (!imageDataUrl) {
        return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recognizeMeal })
      }
      try {
        const schema = '{items:[{name,portion,method,confidence}], followUps:[string]}'
        const data = await callClaude(
          Object.assign({ task: '识别照片中的菜品，给出菜名、大致份量、烹饪方式、可信度 0-1，并列出 2-3 个需要用户确认的问题', ...ctx }),
          schema,
          { imageDataUrl }
        )
        if (data && Array.isArray(data.items) && data.items.length) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) {
        console.error('recognizeMeal claude error:', e.message)
      }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recognizeMeal })
    }

    if (action === 'recommend') {
      try {
        const data = await callClaude(payload || {}, '{picks:[{key,title,dish,reason,budget,time,allergens:[string],swaps:[string],howto}]}')
        if (data && Array.isArray(data.picks)) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) {
        console.error('recommend claude error:', e.message)
      }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recommend })
    }

    if (action === 'chat') {
      try {
        const data = await callClaude(payload || {}, '{reply:string}')
        if (data && typeof data.reply === 'string') {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) {
        console.error('chat claude error:', e.message)
      }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.chat })
    }

    return res.status(400).json({ ok: false, error: 'unknown_action' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e) })
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body)
    let raw = ''
    req.on('data', c => raw += c)
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// 允许上传较大 base64 图片，并给识别留够超时时间
export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
  maxDuration: 30
}
