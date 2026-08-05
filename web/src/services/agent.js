// 前端 Agent 入口：POST /api/agent
// 后端未配置 KEY 时会自动返回 mock，前端不需要感知

async function invoke(action, payload) {
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, payload })
    })
    if (!res.ok) throw new Error('http_' + res.status)
    const data = await res.json()
    return data
  } catch (e) {
    console.warn('[agent] request failed, use local mock:', e)
    return localMock(action)
  }
}

function localMock(action) {
  if (action === 'recognizeMeal') {
    return {
      ok: true, source: 'local-mock',
      data: {
        items: [
          { name: '米饭', portion: '一碗', method: '蒸', confidence: 0.9 },
          { name: '红烧鸡肉', portion: '一份', method: '红烧', confidence: 0.85 },
          { name: '炒青菜', portion: '一小份', method: '清炒', confidence: 0.8 }
        ],
        followUps: ['米饭大约多少？', '鸡肉是否带皮？', '有没有喝饮料？']
      }
    }
  }
  if (action === 'recommend') {
    return {
      ok: true, source: 'local-mock',
      data: {
        picks: [
          { key: 'balanced', title: '今天最合适', dish: '番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜', reason: '蛋白质与蔬菜平衡。', budget: '30~45 元', time: '25 分钟', allergens: ['虾', '大豆'], swaps: [], howto: '外卖搜"豆腐煲"。' },
          { key: 'crave', title: '今天最想吃', dish: '清汤麻辣烫', reason: '兼顾情绪与口味。', budget: '25~35 元', time: '15 分钟', allergens: [], swaps: [], howto: '附近店或外卖。' },
          { key: 'easy', title: '今天最省事', dish: '海南鸡饭', reason: '出餐快、附近好找。', budget: '22~28 元', time: '10 分钟', allergens: [], swaps: [], howto: '外卖直接下单。' }
        ]
      }
    }
  }
  return { ok: true, source: 'local-mock', data: { reply: '（离线 Mock 回复）已按你的要求调整。' } }
}

export const recognizeMeal = (payload) => invoke('recognizeMeal', payload)
export const recommend = (payload) => invoke('recommend', payload)
export const chat = (payload) => invoke('chat', payload)
