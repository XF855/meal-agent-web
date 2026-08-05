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
  if (/\/v1$/.test(base)) return base + '/messages'
  if (/\/messages$/.test(base)) return base
  return base + '/v1/messages'
}
const ANTHROPIC_URL = buildUrl()

const SYSTEM_PROMPT = `你是一个"饮食决策 Agent"。目标：在安全、营养、口味、情绪、便利之间，帮用户在 1 分钟内决定"下一餐吃什么"。

必须遵守：
1. 安全过滤优先：过敏、明确忌口、年龄模式规则先于任何评分。过敏原绝不出现在推荐里。
2. 单人推荐固定返回三张卡：今天最合适 / 今天最想吃 / 今天最省事。
3. 聚餐推荐固定返回三张卡：最适合所有人 / 最有趣 / 最方便，必须先取所有参与者共同的可吃菜系再做选择。
4. 菜名要具体，附大致份量、做法或点单方式。
5. 若提供了近期外卖店铺记录，可以直接推荐用户常吃店铺里的菜（记得写出店名）。
6. 若用户填了 refineHint（"更健康" / "更符合口味"），下一次推荐要显著向该方向靠拢。
7. 输出必须是合法 JSON，字段严格匹配用户消息中的 schema，不要输出 JSON 以外的任何字符。`

const MOCK = {
  recognizeMeal: {
    items: [
      { name: '米饭', portion: '一碗' },
      { name: '红烧鸡肉', portion: '一份' },
      { name: '炒青菜', portion: '一小份' }
    ]
  },
  recommend: {
    picks: [
      { key: 'balanced', title: '今天最合适', dish: '番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜', reason: '最近两餐蛋白质多为猪肉，这一餐换成虾和豆腐更丰富。', budget: '30~45 元', time: '25 分钟', allergens: ['虾', '大豆'], swaps: ['虾仁 ↔ 鸡胸肉'], howto: '外卖搜"豆腐煲"，或在家：热油下姜蒜，番茄炒软后加水、豆腐、虾仁煮 5 分钟。' },
      { key: 'crave', title: '今天最想吃', dish: '清汤麻辣烫（牛肉+豆腐+菌菇+粉）', reason: '照顾情绪与口味，保留辣味但少喝汤。', budget: '25~35 元', time: '15 分钟', allergens: ['大豆'], swaps: ['粉 ↔ 魔芋'], howto: '附近麻辣烫店或外卖任选，告知不要额外辣油。' },
      { key: 'easy', title: '今天最省事', dish: '海南鸡饭 + 一份青菜', reason: '出餐快、附近好找。', budget: '22~28 元', time: '10 分钟', allergens: [], swaps: ['青菜 ↔ 西兰花'], howto: '外卖直接下单，指定少油。' }
    ]
  },
  dailyNutrition: {
    items: [
      { name: '深色蔬菜', portion: '1~2 拳头', why: '连续两天蔬菜量偏少' },
      { name: '优质蛋白', portion: '一掌心', why: '最近以红肉为主，换个来源' },
      { name: '全谷主食', portion: '一拳头', why: '把精米白面替换一半' }
    ],
    summary: '整体饮食偏重，今天可以清淡一点。'
  },
  party: {
    picks: [
      { key: 'all', title: '最适合所有人', dish: '清汤 + 番茄双拼火锅', reason: '避开辣度冲突，素食和荤食都能点。', budget: '80~120 元/人', notes: '锅底一半清汤照顾不吃辣的一位。' },
      { key: 'fun', title: '最有趣', dish: '街头小吃拼盘', reason: '每人挑不同摊子，氛围轻松。', budget: '40~80 元/人', notes: '花生和海鲜过敏项注意避开。' },
      { key: 'easy', title: '最方便', dish: '连锁快餐 + 单点', reason: '出餐快、人均消费低。', budget: '35~55 元/人', notes: '各点各的，避开共享盘。' }
    ]
  },
  chat: { reply: '（Mock 回复）已按你的要求调整。接入真实 Key 后会得到具体分析。' }
}

async function callClaude(userJson, schemaHint, opts) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

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
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }]
  }
  const headers = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01'
  }
  if (AUTH_STYLE === 'bearer') headers['authorization'] = 'Bearer ' + key
  else headers['x-api-key'] = key

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST', headers, body: JSON.stringify(body)
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
      if (!imageDataUrl) return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recognizeMeal })
      try {
        const schema = '{items:[{name,portion}]}'
        const data = await callClaude(
          Object.assign({
            task: '识别照片中的菜品，只输出菜名和大致份量。不要输出可信度、不要输出提问。若不确定，宁可少列几项。',
            ...ctx
          }),
          schema,
          { imageDataUrl }
        )
        if (data && Array.isArray(data.items) && data.items.length) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) { console.error('recognizeMeal claude error:', e.message) }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recognizeMeal })
    }

    if (action === 'recommend') {
      try {
        const data = await callClaude(payload || {},
          '{picks:[{key,title,dish,reason,budget,time,allergens:[string],swaps:[string],howto}]}')
        if (data && Array.isArray(data.picks)) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) { console.error('recommend claude error:', e.message) }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.recommend })
    }

    if (action === 'dailyNutrition') {
      try {
        const data = await callClaude(
          Object.assign({
            task: '基于用户画像和最近餐食，指出今天需要补充或减少哪几类营养/食物，2~4 条即可，每条给出份量和一句原因。避免使用医疗诊断口吻。'
          }, payload || {}),
          '{items:[{name,portion,why}], summary:string}'
        )
        if (data && Array.isArray(data.items)) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) { console.error('dailyNutrition claude error:', e.message) }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.dailyNutrition })
    }

    if (action === 'party') {
      try {
        const data = await callClaude(
          Object.assign({
            task: '为多人聚餐生成三选一。先合并所有参与者画像：找出共同可吃的菜系；把任一人的过敏和忌口作为硬性排除；预算取多人平均。'
          }, payload || {}),
          '{picks:[{key,title,dish,reason,budget,notes}]}'
        )
        if (data && Array.isArray(data.picks)) {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) { console.error('party claude error:', e.message) }
      return res.status(200).json({ ok: true, source: 'mock', data: MOCK.party })
    }

    if (action === 'chat') {
      try {
        const data = await callClaude(payload || {}, '{reply:string}')
        if (data && typeof data.reply === 'string') {
          return res.status(200).json({ ok: true, source: 'claude', data })
        }
      } catch (e) { console.error('chat claude error:', e.message) }
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

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
  maxDuration: 30
}
