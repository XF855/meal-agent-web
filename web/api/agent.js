// Vercel Serverless Function: /api/agent
// 环境变量：
//   ANTHROPIC_API_KEY        必填，Claude 密钥
//   ANTHROPIC_MODEL          可选，默认 claude-opus-4-7
//   ANTHROPIC_BASE_URL       可选，第三方代理（如 eazo）用这个替换官方地址
//   ANTHROPIC_AUTH_STYLE     可选，'x-api-key'（默认，官方）或 'bearer'（多数代理）
//   GOOGLE_PLACES_API_KEY    可选，启用后 recommend 会在场景=餐厅/食堂时拉附近餐厅
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
2. 区分三种约束的力度：
   - allergies（过敏）：硬性排除，绝不推荐。
   - taboos（忌口，如"不吃猪肉/不吃牛肉"）：硬性排除，绝不推荐。
   - healthPrefs（健康偏好，如"低钠/低糖/低脂/低嘌呤"）：软性倾向，向该方向靠拢即可，不必完全避开。
3. 单人推荐固定返回三张卡：今天最合适 / 今天最想吃 / 今天最省事。
4. 聚餐推荐固定返回三张卡：最适合所有人 / 最有趣 / 最方便，必须先取所有参与者共同的可吃菜系再做选择。聚餐中任一人的 allergies/taboos 都要硬性排除；healthPrefs 尽量兼顾。
5. 菜名要具体，附大致份量、做法或点单方式。
6. 若提供了近期外卖店铺记录（recentStores），可以直接推荐用户常吃店铺里的菜（记得写出店名）。
7. 若提供了附近餐厅列表（nearbyPlaces）且用户场景是"餐厅"或"食堂"：
   - 三张推荐卡里至少有两张要来自 nearbyPlaces。
   - dish 字段格式："餐厅名 · 具体菜品"。
   - reason 里必须提到评分（rating）和距离（distanceMeters），例如"评分 4.6 · 约 240m"。
   - 用餐厅的 primaryType 和 typicalDishes 判断该店可能提供什么菜；如果这家店的品类与用户过敏/忌口冲突，则跳过该店。
   - 优先高评分（>=4.3）且评价数不少的店（userRatingCount >= 40）；两者都满足时距离越近越优。
8. 若用户填了 refineHint（"更健康" / "更符合口味"），下一次推荐要显著向该方向靠拢。
9. 输出必须是合法 JSON，字段严格匹配用户消息中的 schema，不要输出 JSON 以外的任何字符。`

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
    text:
      `只输出一个合法 JSON 对象，不要任何解释、Markdown、代码块围栏。\n` +
      `字段 schema：${schemaHint}\n\n` +
      `上下文数据：\n${JSON.stringify(userJson)}`
  })

  const body = {
    model: MODEL,
    max_tokens: 1500,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userContent },
      // 用 assistant prefill 强制 JSON 起手，规避模型说人话
      { role: 'assistant', content: '{' }
    ]
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
  let text = (data && data.content && data.content[0] && data.content[0].text) || ''
  // 因为我们用 assistant prefill 塞了个开头的 '{'，把它补回来
  if (text && !text.trimStart().startsWith('{')) text = '{' + text
  // 抓第一个到最后一个花括号之间的最大 JSON 片段
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first < 0 || last <= first) throw new Error('claude_no_json')
  const jsonStr = text.slice(first, last + 1)
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error('claude_bad_json: ' + e.message)
  }
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
      const enriched = slimRecommendPayload(payload || {})
      const scene = enriched.todayContext && enriched.todayContext.scene
      const loc = (payload && payload.location) || null
      console.log('[recommend] scene=%s hasLoc=%s hasPlacesKey=%s',
        scene, !!(loc && loc.lat && loc.lng), !!process.env.GOOGLE_PLACES_API_KEY)
      if (loc && loc.lat && loc.lng && (scene === '餐厅' || scene === '食堂')) {
        try {
          const places = await fetchNearbyRestaurants(loc, scene)
          console.log('[recommend] nearby places returned:', places.length)
          if (places && places.length) {
            // 只保留 Claude 真正会用的字段，减少 token
            enriched.nearbyPlaces = places.slice(0, 6).map(p => ({
              name: p.name,
              primaryType: p.primaryType,
              rating: p.rating,
              userRatingCount: p.userRatingCount,
              priceLevel: p.priceLevel,
              distanceMeters: p.distanceMeters,
              typicalDishes: p.typicalDishes
            }))
          }
        } catch (e) {
          console.error('places api error:', e.message)
        }
      } else {
        console.log('[recommend] skipping places (scene not restaurant/canteen or no location)')
      }
      try {
        const data = await callClaude(enriched,
          '{picks:[{key,title,dish,reason,budget,time,allergens:[string],swaps:[string],howto}]}')
        if (data && Array.isArray(data.picks)) {
          return res.status(200).json({
            ok: true, source: 'claude', data,
            meta: { nearbyPlacesCount: (enriched.nearbyPlaces || []).length }
          })
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

// 精简 recommend payload：只保留 Claude 真正需要的字段，缩短 tokens 和响应时间
function slimRecommendPayload(p) {
  const out = {}
  if (p.profile) {
    const b = p.profile.basic || {}
    const pr = p.profile.prefer || {}
    out.profile = {
      basic: {
        birthYear: b.birthYear,
        diet: b.diet,
        allergies: b.allergies || [],
        taboos: b.taboos || [],
        healthPrefs: b.healthPrefs || []
      },
      prefer: {
        cuisines: pr.cuisines || [],
        spicy: pr.spicy,
        budget: pr.budget,
        favorites: pr.favorites,
        dislikes: pr.dislikes,
        scenes: pr.scenes || []
      }
    }
  }
  if (p.todayContext) {
    const t = p.todayContext
    out.todayContext = {
      hunger: t.hunger, mood: t.mood, time: t.time,
      scene: t.scene, crave: t.crave, personalNote: t.personalNote
    }
  }
  if (Array.isArray(p.recentDiary)) {
    // 只保留最近 5 顿的关键字段
    out.recentDiary = p.recentDiary.slice(0, 5).map(d => ({
      meal: d.meal,
      items: (d.items || []).map(i => ({ name: i.name, portion: i.portion })),
      deliveryStore: d.deliveryStore,
      feedback: d.feedback ? { score: d.feedback.score, feel: d.feedback.feel } : undefined
    }))
  }
  if (Array.isArray(p.recentStores)) {
    out.recentStores = p.recentStores.slice(0, 4).map(s => ({
      name: s.name, count: s.count, dishes: (s.dishes || []).slice(0, 4)
    }))
  }
  if (p.ageMode) out.ageMode = p.ageMode
  if (p.refineHint) out.refineHint = p.refineHint
  if (Array.isArray(p.previousPicks)) {
    out.previousPicks = p.previousPicks.slice(0, 3).map(x => ({ key: x.key, dish: x.dish }))
  }
  return out
}

// ---------------- Google Places (New) ----------------
// 文档：https://developers.google.com/maps/documentation/places/web-service/nearby-search
// 注意用的是 v1 endpoint（新版），FieldMask 精确挑字段控成本
async function fetchNearbyRestaurants(loc, scene) {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return []

  const radius = scene === '食堂' ? 500 : 1200  // 食堂通常在很近的范围内
  const body = {
    includedTypes: ['restaurant', 'cafe', 'meal_takeaway', 'bakery'],
    maxResultCount: 15,
    locationRestriction: {
      circle: {
        center: { latitude: loc.lat, longitude: loc.lng },
        radius
      }
    },
    rankPreference: 'POPULARITY',
    languageCode: 'zh-CN'
  }
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.primaryType',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.location',
    'places.formattedAddress',
    'places.currentOpeningHours.openNow'
  ].join(',')

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('places_http_' + res.status + ' ' + text.slice(0, 200))
  }
  const data = await res.json()
  const places = (data && data.places) || []

  return places
    .filter(p => p && p.location && p.displayName)
    .map(p => {
      const dm = haversineMeters(loc.lat, loc.lng, p.location.latitude, p.location.longitude)
      return {
        name: (p.displayName && p.displayName.text) || '',
        primaryType: p.primaryType || (p.types && p.types[0]) || '',
        types: (p.types || []).slice(0, 4),
        rating: p.rating || null,
        userRatingCount: p.userRatingCount || 0,
        priceLevel: p.priceLevel || null,       // PRICE_LEVEL_INEXPENSIVE / MODERATE / EXPENSIVE / VERY_EXPENSIVE
        openNow: !!(p.currentOpeningHours && p.currentOpeningHours.openNow),
        address: p.formattedAddress || '',
        distanceMeters: Math.round(dm),
        typicalDishes: dishHintByType(p.primaryType || (p.types && p.types[0]) || '')
      }
    })
    // 过滤掉评分过低或几乎没评分的
    .filter(p => (p.rating || 0) >= 3.8 && p.userRatingCount >= 15)
    // 排序：先按评分再按距离
    .sort((a, b) => (b.rating - a.rating) || (a.distanceMeters - b.distanceMeters))
    .slice(0, 8)
}

// primary type → 该店大概会有的菜品线索，帮 Claude 判断
function dishHintByType(type) {
  const t = (type || '').toLowerCase()
  const hints = {
    chinese_restaurant: ['家常菜', '面条', '盖饭'],
    japanese_restaurant: ['寿司', '拉面', '定食'],
    korean_restaurant: ['石锅拌饭', '烤肉', '部队锅'],
    italian_restaurant: ['意面', '披萨', '沙拉'],
    thai_restaurant: ['冬阴功', '咖喱', '芒果糯米饭'],
    indian_restaurant: ['咖喱', '烤饼', '香饭'],
    mexican_restaurant: ['塔可', '卷饼', '玉米片'],
    american_restaurant: ['汉堡', '牛排', '沙拉'],
    seafood_restaurant: ['海鲜', '鱼汤'],
    steak_house: ['牛排'],
    sushi_restaurant: ['寿司', '刺身'],
    ramen_restaurant: ['拉面'],
    fast_food_restaurant: ['汉堡', '炸鸡', '薯条'],
    hamburger_restaurant: ['汉堡'],
    pizza_restaurant: ['披萨'],
    cafe: ['咖啡', '三明治', '轻食'],
    bakery: ['面包', '甜点'],
    meal_takeaway: ['盖饭', '面条', '快餐'],
    vegetarian_restaurant: ['素菜', '沙拉']
  }
  return hints[t] || []
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
// ---------------- /Google Places ----------------

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
  maxDuration: 60
}
