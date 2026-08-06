// 本地 Mock：未接入真实 Agent 前，UI 与流程完全可用
// 所有函数返回 Promise<{ok:true, data:...}>

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// 图片识别：伪装成检测到几个菜品
async function recognizeMeal(_imagePath) {
  await delay(700)
  return {
    ok: true,
    data: {
      items: [
        { name: '米饭', portion: '一碗', method: '蒸', confidence: 0.92 },
        { name: '红烧鸡肉', portion: '一份', method: '红烧', confidence: 0.86 },
        { name: '炒青菜', portion: '一小份', method: '清炒', confidence: 0.81 },
        { name: '奶茶', portion: '中杯', method: '饮品', confidence: 0.74 }
      ],
      followUps: [
        '米饭大约是半碗还是一碗？',
        '奶茶是全糖、半糖还是无糖？',
        '鸡肉是否带皮？'
      ]
    }
  }
}

// 三选一推荐：根据画像 + 今日上下文，返回三张固定卡片
async function recommend({ profile, todayContext, extraRequirement }) {
  await delay(600)
  const spicyOk = !profile || (profile.spicy || 0) >= 2
  const extraNote = extraRequirement ? `（已根据"${extraRequirement}"调整）` : ''
  return {
    ok: true,
    data: {
      picks: [
        {
          key: 'balanced',
          title: '今天最合适',
          dish: '番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜',
          reason: '最近两餐蛋白质多为猪肉，这一餐换成虾和豆腐更丰富。' + extraNote,
          budget: '30~45 元',
          time: '25 分钟',
          allergens: ['虾', '大豆'],
          swaps: ['虾仁 ↔ 鸡胸肉', '豆腐 ↔ 蛋'],
          howto: '外卖搜"豆腐煲"，或在家：热油下姜蒜，番茄炒软，加水、豆腐、虾仁煮 5 分钟。'
        },
        {
          key: 'crave',
          title: '今天最想吃',
          dish: spicyOk ? '清汤麻辣烫（牛肉+豆腐+菌菇+粉）' : '照烧鸡饭 + 半份沙拉',
          reason: (spicyOk ? '你今天想吃辣，保留辣味但建议少喝汤。' : '偏温和口味，兼顾满足感与蔬菜。') + extraNote,
          budget: '25~35 元',
          time: '15 分钟',
          allergens: spicyOk ? ['大豆'] : ['鸡蛋'],
          swaps: spicyOk ? ['粉 ↔ 魔芋'] : ['米饭 ↔ 糙米饭'],
          howto: '附近麻辣烫或外卖任选，注意告知不要额外辣油。'
        },
        {
          key: 'easy',
          title: '今天最省事',
          dish: '海南鸡饭 + 一份青菜',
          reason: '出餐快、附近好找，符合你只有 20 分钟的条件。' + extraNote,
          budget: '22~28 元',
          time: '10 分钟',
          allergens: [],
          swaps: ['青菜 ↔ 西兰花'],
          howto: '外卖直接下单，指定少油。'
        }
      ]
    }
  }
}

// 追问：将用户问题拼进 mock 答复
async function chat({ history, userText }) {
  await delay(400)
  const last = (history && history[history.length - 1]) || {}
  const dish = last.dish || '当前推荐'
  return {
    ok: true,
    data: {
      reply: `关于「${dish}」——${userText}。我按你的要求微调了份量与做法（Mock 回复，接入真实 Agent 后由模型给出）。`
    }
  }
}

module.exports = { recognizeMeal, recommend, chat }
