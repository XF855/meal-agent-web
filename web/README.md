# 饮食决策 Agent · H5 Web 版

一个帮用户在 1 分钟内决定"下一餐吃什么"的 Web 应用。
Vue 3 + Vite 单页 + Vercel Serverless（`/api/agent`）+ Claude Messages API。

**在线体验：** 部署到 Vercel 后拿到的 `https://xxx.vercel.app` 就是可提交的作品链接，评委浏览器直接打开即可。

---

## 一、产品是什么

### 一句话
记住用户最近吃过什么、了解用户今天状态，并持续调整下一餐推荐的**饮食决策 Agent**。

### 核心主张
> 吃得开心，吃得放心，吃得省心。
> Enjoy Every Bite. Trust Every Choice. Skip the Stress.

不做严格节食、不粗暴地把食物分成"健康 / 不健康"，而是在 **安全、营养、口味、情绪、便利** 五个维度之间帮用户快速拍板。

### 首版核心闭环
```
基础问卷 → 每日状态（含个性化补充） → 拍照 → Agent 识别候选 → 用户确认/自填 →
Agent 结合画像+状态+近期饮食+外卖店铺 → 三选一推荐 →
用户「换一批（更健康/更符合口味）」精调 → 就吃这个 → 饭后反馈 → 更新日记
```

### 也支持
- **聚餐场景**：多人合并画像 → 生成三张聚餐方案（最适合所有人 / 最有趣 / 最方便）
- **画像分享**：一键导出为 `MEAL1:` 编码文本，朋友粘贴即可用你的偏好

### 明确不做（第一版）
- 家庭健康管理、疾病治疗菜单、医学诊断
- 精确到卡路里个位数的营养估算
- 自动减重计划

---

## 二、页面清单

底部四个 Tab：`今日 | 聚餐 | 日记 | 我的`（原"Agent"Tab 已合并进"今日"的拍照入口）。所有页面在 `web/src/views/` 下。

| 路由 | 文件 | 作用 |
| --- | --- | --- |
| `/onboarding/brand` | Brand.vue | 品牌介绍，正式建档 / 先体验 |
| `/onboarding/basic` | Basic.vue | 基础信息 + **可自定义添加**过敏原和忌口 |
| `/onboarding/prefer` | Prefer.vue | 口味场景：菜系、辣度、用餐方式、单餐预算 |
| `/today` | Today.vue | **今日 Tab**。今日营养建议卡 + 状态问答 + 个性化补充 + 拍照入口 + 帮我决定 |
| `/capture/confirm` | Confirm.vue | 拍照后确认：勾选正确候选或自填 + 餐次 + 外卖店铺 |
| `/recommend` | RecommendList.vue | 三张推荐卡 + "更健康/更符合口味/直接换一批"三档换 |
| `/recommend/detail` | RecommendDetail.vue | 单张卡详情 + 追问区 + "就吃这个" |
| `/recommend/feedback` | Feedback.vue | 饭后 4 项快评；"其他"选中时可写具体感受 |
| `/party` | Party.vue | **聚餐 Tab**。加人 → 逐位填画像 或 粘朋友导出的文本 → 生成三选一 |
| `/diary` | Diary.vue | **日记 Tab**。按天分组、编辑/删除、周概览 |
| `/mine` | Mine.vue | **我的 Tab**。画像 + 导出/导入 + 接入状态 + 清空 |

未 `onboarded` 的用户任何路径都会被 `router.beforeEach` 拦到 `/onboarding/brand`。

---

## 三、目录结构

```
web/
├─ index.html                      入口
├─ package.json                    vue 3 / vue-router / vite
├─ vite.config.js
├─ vercel.json                     SPA 回退：非 /api 都指向 index.html
├─ .env.example                    环境变量样板
├─ api/
│  └─ agent.js                     Vercel Serverless Function（唯一后端）
└─ src/
   ├─ main.js                      挂载 App、注册 router、引入全局样式
   ├─ App.vue                      顶层容器 + <TabBar>
   ├─ router.js                    hash 路由 + 未 onboarded 拦截
   ├─ components/TabBar.vue        今日/聚餐/日记/我的
   ├─ services/
   │  ├─ agent.js                  统一 fetch → /api/agent；失败降级本地 mock
   │  └─ store.js                  localStorage 封装 + 画像导出/导入 + 店铺聚合
   ├─ styles/global.css            iOS 风格设计系统
   └─ views/                       11 个页面（见上表）
```

---

## 四、系统架构

### 4.1 三层结构

```
┌─────────────────────────────────────────────────────┐
│  前端 (静态 SPA, 部署在 Vercel Edge Network)          │
│  Vue 3 + vue-router + localStorage                  │
│  ─ 只做 UI + 本地状态；一切"智能"都通过 fetch 请求后端│
└──────────────────┬──────────────────────────────────┘
                   │  POST /api/agent
                   │  { action, payload }
                   ▼
┌─────────────────────────────────────────────────────┐
│  Serverless Function (Node runtime, /api/agent.js)   │
│  ─ 唯一入口，按 action 路由                          │
│  ─ 持有 ANTHROPIC_API_KEY（前端永远看不到）           │
│  ─ 支持 x-api-key / Bearer 两种鉴权、自定义 BASE_URL │
│  ─ 所有 action 失败自动兜底 Mock，UI 永远不白屏       │
└──────────────────┬──────────────────────────────────┘
                   │  POST /v1/messages
                   ▼
┌─────────────────────────────────────────────────────┐
│  Claude Messages API                                 │
│  ─ 默认 claude-opus-4-7                              │
│  ─ Vision 模式：recognizeMeal 传 base64 图片          │
└─────────────────────────────────────────────────────┘
```

### 4.2 六个 action

| action | 触发页面 | 输入 payload 关键字段 | 输出 schema |
| --- | --- | --- | --- |
| `recognizeMeal` | Today 拍照 | `imageDataUrl, profile, recentStores` | `{items:[{name,portion}]}` |
| `recommend` | RecommendList | `profile, todayContext, recentDiary, ageMode, recentStores, refineHint, previousPicks` | `{picks:[{key,title,dish,reason,budget,time,allergens,swaps,howto}]}` |
| `dailyNutrition` | Today 首屏 | `profile, ageMode, recentDiary, todayContext` | `{items:[{name,portion,why}], summary}` |
| `party` | Party 生成方案 | `members[], party{scene,budget}` | `{picks:[{key,title,dish,reason,budget,notes}]}` |
| `chat` | RecommendDetail 追问 | `userText, profile, todayContext, history` | `{reply: string}` |
| （未定义） | — | — | 后端返 `400 unknown_action` |

### 4.3 为什么这样切

- **Key 只在后端**：H5 前端字节码人人可看，Key 必须放 Serverless 环境变量
- **前端无跨域压力**：浏览器只请求同源 `/api/agent`，永远不出 Vercel 域
- **Mock 兜底**：网络抖动、Key 用完、代理挂了都能降级为 Mock，UI 不受影响
- **Serverless 无状态**：所有用户数据（画像、日记、今日状态）持久化在浏览器 `localStorage`，服务器不存任何 PII，评委每人一份互不干扰

### 4.4 一次完整推荐的数据流

```
用户在 Today 选 "帮我决定" 或 RecommendList "更健康"
     │
RecommendList.vue.load(refineHint)
     │  agent.recommend({
     │    profile, todayContext,
     │    recentDiary: getDiary().slice(0,6),
     │    ageMode: deriveAgeMode(profile),
     │    recentStores: getDeliveryStores(5),
     │    refineHint,               // 'healthier' | 'tastier' | null
     │    previousPicks             // 供模型避重
     │  })
     ▼
services/agent.js.fetch('/api/agent', ...)
     ▼
api/agent.js  组装 Claude Messages 请求：
     │  system: SYSTEM_PROMPT
     │  user:   "schema: {picks:[…]}\n上下文: {画像+状态+日记+refineHint...}"
     ▼
Claude 返回文本 → 正则抽 JSON → parse → 校验 picks 是数组
     ▼
前端渲染三张卡；写 lastReco(picks, refineHint)
     │
点某张卡 → RecommendDetail：追问走 chat action
     │
点"就吃这个" → appendDiary({awaitingFeedback: true, pick})
     │
饭后反馈 → updateDiary(id, {feedback: {score,fullness,feel,customFeel,willAgain}, awaitingFeedback:false})
```

---

## 五、推荐是怎么算出来的

**关键决策：排序逻辑完全交给 Claude 处理，前端只做数据组装。** 好处是行为符合大模型的自然语言理解能力；风险是每次结果不完全可复现——这在饮食推荐里可以接受。

### 5.1 System Prompt（约束模型行为）
摘自 `api/agent.js`：
```
你是一个"饮食决策 Agent"。目标：在安全、营养、口味、情绪、便利之间，
帮用户在 1 分钟内决定"下一餐吃什么"。

必须遵守：
1. 安全过滤优先：过敏、明确忌口、年龄模式规则先于任何评分。过敏原绝不出现在推荐里。
2. 单人推荐固定返回三张卡：今天最合适 / 今天最想吃 / 今天最省事。
3. 聚餐推荐固定返回三张卡：最适合所有人 / 最有趣 / 最方便，必须先取所有参与者共同的可吃菜系再做选择。
4. 菜名要具体，附大致份量、做法或点单方式。
5. 若提供了近期外卖店铺记录，可以直接推荐用户常吃店铺里的菜（记得写出店名）。
6. 若用户填了 refineHint（"更健康" / "更符合口味"），下一次推荐要显著向该方向靠拢。
7. 输出必须是合法 JSON，字段严格匹配用户消息中的 schema，不要输出 JSON 以外的任何字符。
```

### 5.2 用户消息里塞进模型的完整上下文

```jsonc
{
  "profile": {
    "basic": {
      "birthYear": 1998, "height": 170, "weight": 60,
      "allergies": ["虾", "花生", "藜麦"],       // 预设 + 用户自填
      "taboos":    ["不吃动物内脏", "低钠"],
      "diet": "普通"
    },
    "prefer": {
      "cuisines": ["川菜", "本帮菜"],
      "spicy": 2, "scenes": ["外卖", "食堂"],
      "budget": "20~40 元",
      "favorites": "番茄鸡蛋", "dislikes": "香菜"
    }
  },
  "todayContext": {
    "hunger": "很饿", "mood": "疲惫",
    "time": "20 分钟", "scene": "外卖", "crave": "热汤",
    "personalNote": "今天不想吃米饭，想吃茄子"    // 用户自由文本
  },
  "recentDiary": [
    { "meal": "午餐", "items": [{"name":"红烧肉饭","portion":"一份"}],
      "deliveryStore": "xx轻食",                 // 外卖时才有
      "feedback": {"score":4,"feel":"其他","customFeel":"吃完有点反酸"} },
    ...最近 6 条
  ],
  "recentStores": [
    { "name": "xx轻食", "count": 3, "last": 1720000000000, "dishes": ["…"] }
  ],
  "refineHint": "healthier",                      // 或 "tastier" 或 null
  "previousPicks": [ ...上一批推荐，避免推重 ],
  "ageMode": "adult"
}
```

### 5.3 输出 Schema（模型必须严格返回）

```jsonc
{
  "picks": [
    {
      "key": "balanced", "title": "今天最合适",
      "dish": "番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜",
      "reason": "最近两餐蛋白质多为猪肉，这一餐换成虾和豆腐更丰富。",
      "budget": "30~45 元", "time": "25 分钟",
      "allergens": ["虾", "大豆"], "swaps": ["虾仁 ↔ 鸡胸肉"],
      "howto": "外卖搜'豆腐煲'……"
    },
    { "key": "crave", "title": "今天最想吃", ... },
    { "key": "easy",  "title": "今天最省事", ... }
  ]
}
```

三张卡分工：
- **今天最合适** — 优先近期饮食平衡与营养匹配
- **今天最想吃** — 优先照顾情绪 / 口味，允许轻微"放纵"但守安全线
- **今天最省事** — 优先时间、预算、可获取性

### 5.4 排序维度（写进 System Prompt 供模型参考）

| 维度 | 权重 | 说明 |
| --- | --- | --- |
| **安全性** | 硬性规则 | 过敏、忌口、年龄模式违规 → 直接排除 |
| 偏好匹配 | 30% | 菜系、辣度、favorites/dislikes、历史选择 |
| 近期饮食平衡 | 25% | 蛋白质多样性、蔬菜频率、油炸/甜饮 |
| 场景可执行性 | 20% | 时间、预算、外卖/在家 |
| 当前状态 | 15% | 饥饿、心情、身体感受、当下想吃、`personalNote` |
| 食物多样性 | 10% | 避免与最近 3 天菜品重复；避免与 `previousPicks` 高度重复 |

（这些是"给模型参考"的策略，真正的加权由模型综合判断。）

### 5.5 三种年龄模式

`services/store.js` 的 `deriveAgeMode(profile)`：

- `10-17` → **growth 成长模式**：不推快速减重、不用 BMI 直接评价
- `18-59` → **adult 成人模式**：全功能
- `≥60` → **senior 活力模式**：偏软食、清淡不单调、蛋白质来源、操作简单

模式作为 `ageMode` 字段跟随每次 recommend / dailyNutrition 请求送进 Prompt。

### 5.6 视觉识别（`action: recognizeMeal`）

- 前端 `Today.vue` 用 `<canvas>` 把用户选的图片压缩到长边 1024px、JPEG 82% 质量
- 转 base64 dataURL 塞进请求 body
- 后端识别到 `data:image/xxx;base64,...`，构造多模态 messages：
  ```jsonc
  {
    "role": "user",
    "content": [
      { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." } },
      { "type": "text",  "text":   "…schema: {items:[{name,portion}]}" }
    ]
  }
  ```
- **不返回可信度、不追问**：识别结果只输出菜名 + 份量。用户在 `Confirm.vue` 里勾选正确候选或自填，永远不会自动把 Agent 猜测写进日记。
- Vercel 路由配置 `sizeLimit: 5mb, maxDuration: 30` 应对图片体积和识别延迟

### 5.7 外卖店铺记忆

- `Confirm.vue` 有可选的"外卖店铺名"字段，填了就会写进日记条目的 `deliveryStore` 字段
- `services/store.js` 的 `getDeliveryStores(limit)` 会遍历日记，聚合出 `{name, count, last, dishes:[]}`
- 每次 `recommend` / `recognizeMeal` 请求把 `recentStores` 塞进 payload
- Prompt 明确允许模型基于用户常吃店铺直接推荐带店名的菜

### 5.8 换一批的三个方向

`RecommendList.vue` 底部三个按钮传不同的 `refineHint`：

| 按钮 | refineHint | Prompt 里的含义 |
| --- | --- | --- |
| 🥗 想更健康的 | `'healthier'` | 显著提升"近期饮食平衡"权重，减少油炸/精制主食 |
| 😋 更符合口味的 | `'tastier'` | 显著提升"偏好匹配"权重，允许更多用户 favorites |
| ↻ 直接换一批 | `null` | 只避免与 `previousPicks` 重复，其他不变 |

模型看到 `refineHint === 'healthier'` 时会向健康方向倾斜；看到 `null` 时只做常规多样性去重。

### 5.9 追问（`action: chat`）

- 详情页四个快捷按钮：换主食 / 更辣 / 更便宜 / 教做法
- Payload 里带 `history`（最近 8 条消息）+ `profile` + `todayContext`
- 模型返回 `{reply: string}`

---

## 六、Prompt 工程要点

### 6.1 为什么要求"严格 JSON"

Claude 默认会用自然语言，若不做约束就会返回"我给你推荐三种选择：1. …"这种散文。做法：
1. System Prompt 明写"必须返回合法 JSON、不要输出任何 JSON 以外的内容"
2. User Message 里把 schema 显式写出来（`{picks:[{key,title,...}]}`）
3. 后端做兜底解析：`text.match(/\{[\s\S]*\}/)` 抓第一个花括号块再 `JSON.parse`；抓不到就抛 `claude_no_json`，落入 catch → 返 mock

### 6.2 System Prompt 里刻意省掉了什么

- **没有硬编码菜谱库**——依赖模型自身的世界知识生成菜名和做法，MVP 阶段够用
- **没有加"你是营养师"人设**——因为产品不做医疗诊断
- **没有 few-shot 示例**——想让模型每次输出更"新鲜"

### 6.3 想改 Prompt 从哪里下手
- `api/agent.js` 顶部的 `SYSTEM_PROMPT` 常量
- `callClaude(userJson, schemaHint, opts)` 里 user message 的模板字符串
- 需要新的 action，就在 `handler` 里加一段 `if (action === 'xxx') { ... }`，schema 描述得越清晰模型越听话

---

## 七、状态与数据存储

**除了环境变量，服务端不持久化任何东西。** 所有用户数据都在浏览器 `localStorage` 里：

| Key | 内容 | 写入点 |
| --- | --- | --- |
| `meal_profile` | 长期画像 `{basic, prefer, onboarded}`；`basic.allergies` / `basic.taboos` 支持任意用户自填项 | Basic/Prefer 页；Mine 页导入 |
| `meal_diary` | 日记数组，倒序 `[{id, createdAt, meal, items[], imageSrc, deliveryStore, feedback:{score,fullness,feel,customFeel,willAgain}, awaitingFeedback}]` | Confirm/Detail 确认 + Feedback 反馈 |
| `meal_today_ctx` | 今日状态 `{hunger, mood, time, scene, crave, personalNote, savedAt}` | Today 页选按钮或填备注 |
| `meal_last_reco` | 上次推荐 `{picks, refineHint, at}` | RecommendList 拉取后 |
| `meal_pending` | 页面间临时数据（识别结果、当前卡片） | Today → Confirm、List → Detail |

### 7.1 画像导出/导入格式

`store.js` 提供 `exportProfileText()` / `decodeProfileText(text)` / `importProfile(p)`：

```
MEAL1:eyJ2IjoxLCJleHBvcnRlZEF0IjoxNzIwMDAwMDAwMDAwLCJwcm9maWxlIjp7ImJhc2ljIjp7...
```

- `MEAL1:` 版本前缀 + UTF-8 安全的 Base64(JSON)
- Base64 里明文是 `{v:1, exportedAt, profile:{basic, prefer, ...}}`
- 兼容直接粘 JSON 或 `{basic, prefer}` 片段

好处：一段短文本可通过微信/短信/邮件直接发朋友；聚餐页粘贴就能读到别人的偏好，无需登录任何账号。

### 7.2 换设备同步

localStorage 天然不跨设备。想跨设备只需改 `store.js` 的 5 个 getter/setter 换成 Vercel KV / Supabase 调用，业务代码零改动。

---

## 八、安全 & 隐私原则

以下几条是**产品红线**，改代码时不要越过：

- **过敏和明确忌口是硬性过滤**，绝不参与"评分加权"——安全优先于口味
- **不作医疗诊断**：遇到用户描述严重症状，应引导专业医疗，不给"治病食谱"
- **未成年人保护**：`growth` 模式不推快速减重、不用 BMI 评价、涉及体重管理时给谨慎提示
- **导出画像时可控**：`exportProfileText()` 序列化的是完整画像；如果将来做"最小公开卡"，应额外提供一个只含 `diet / cuisines / budget / allergies` 的子集函数
- **不用用户健康数据训练公共模型**：Prompt 里的画像只用于当次推荐，Serverless 请求结束即抛弃

---

## 九、UI 风格

全局样式统一为**iOS 系统风格**（见 `src/styles/global.css`）：

- 系统字体栈：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", ...`
- 卡片：白面 `#ffffff` + 12px 圆角，去除粗阴影
- 强调色：**system blue `#007aff`**（原橙色 `#ff7043` 已弃用）
- 底色：`#f2f2f7`（iOS 系统灰）
- TabBar：毛玻璃 `backdrop-filter: blur(20px)`
- 分割线：0.5px `rgba(60,60,67,0.14)`
- 危险色：`#ff3b30`
- 输入框：`.input` / `.textarea` 用 `#f2f2f7` 灰底、无边框、focus 时 `#e9e9ee`

想改主题色，全局搜 `#007aff` 替换即可（约 15 处）。

---

## 十、部署与运维

### 10.1 部署到 Vercel（5 分钟）

```bash
cd D:/ClaudeCodeTrust/meal
git init && git add web/ && git commit -m "meal-agent web mvp"
# 在 github.com 新建 meal-agent-web 空仓库
git remote add origin https://github.com/<your>/meal-agent-web.git
git branch -M main && git push -u origin main
```

打开 https://vercel.com/new → Import 该仓库 → **Root Directory 改为 `web`** → 加环境变量 → Deploy。

### 10.2 环境变量

| Key | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | 必填 | 无 | Claude 密钥；不填自动走 mock |
| `ANTHROPIC_MODEL` | 可选 | `claude-opus-4-7` | 也可 `claude-sonnet-4-6` / `claude-haiku-4-5-20251001` |
| `ANTHROPIC_BASE_URL` | 可选 | `https://api.anthropic.com` | 第三方代理（eazo 等） |
| `ANTHROPIC_AUTH_STYLE` | 可选 | `x-api-key` | 代理若要 Bearer 就填 `bearer` |

**加完变量必须 Deployments → Redeploy（取消 Use existing Build Cache）**，旧部署不会自动读到新变量。

### 10.3 判断 Agent 是否真接上

打开线上链接 → 走到"三选一推荐" → F12 Network → 找 `/api/agent` 请求 → Response：
- `"source": "claude"` → 真的接上
- `"source": "mock"` → Claude 调用失败被 catch 兜底；去 Vercel → Logs 看 `xxx claude error:`
- 请求 5xx / red / `"source": "local-mock"` → 请求根本没到后端

### 10.4 常见错误对应

| 日志 | 原因 | 修法 |
| --- | --- | --- |
| `claude_http_401 invalid x-api-key` | Key 错 / 前后空格 / 代理需要 Bearer | 重新粘 Key，或 `ANTHROPIC_AUTH_STYLE=bearer` |
| `claude_http_400 model not found` | 模型名代理不支持 | 换 `ANTHROPIC_MODEL` |
| `claude_http_429` | 限流 / 额度用完 | 等一会儿；或换模型；或充值 |
| `claude_no_json` | 模型返回无 JSON | 通常 Prompt 里 schema 讲不清；改 System Prompt |
| `claude_http_400 ... invalid content` | 当前模型不接受 vision | 识别用的模型换成 sonnet 或 opus |

### 10.5 迭代流程

改代码 → `git push` → Vercel 自动 build（主分支进 Production，其它分支出 Preview URL） → 30~60 秒生效。环境变量改动例外，必须手动 Redeploy。

---

## 十一、路线图

**已完成（本 repo）**
- 首次注册流（品牌 + 基础 + 口味）
- 三种年龄模式
- 过敏原和忌口**自定义添加**（不再局限预设选项）
- 每日动态提问 + **个性化补充**（自由文本）
- **今日营养建议卡**（dailyNutrition action）
- 拍照上传 + Claude vision 识别（不显示可信度、用户主动确认）
- **外卖店铺跟踪**（Confirm 填店名，推荐时供模型参考）
- 三选一推荐 + **换一批带 refineHint**（更健康/更符合口味/直接换）
- 推荐详情 + 追问
- 饭后反馈 + "**其他"可填自定义感受**
- 饮食日记（编辑 / 删除 / 周概览）
- **画像导出/导入**（`MEAL1:` 编码文本）
- **聚餐 Agent**（合并多人画像 → 三选一）
- **iOS 极简 UI**（system blue、SF font、毛玻璃 TabBar）

**未做，但预留了接入点**
- 菜品知识库（`api/agent.js` 里 System Prompt 添加"从库中选菜"的约束即可）
- 附近餐厅（Google Places / Foursquare API）
- 云端多设备同步（换 `store.js`）
- PWA（`public/manifest.json` + service worker）

---

## 十二、本地开发

```bash
cd web
npm install
npm run dev              # http://localhost:5173，Agent 走本地 mock
# 想联调 Serverless：
npm i -g vercel
vercel dev               # 同时起前端 + /api，需要本地 .env.local
```

生产构建：`npm run build` → 输出到 `dist/`。

---

## 十三、术语速查

- **闭环** = 首版核心用户流程：拍照→识别→确认→推荐→选择→反馈
- **画像** = 长期不变的用户信息（`meal_profile`）
- **今日状态** = 当天动态问答收集的临时数据（`meal_today_ctx`）
- **personalNote** = 用户在 Today 页填的自由文本（如"今天不想吃米饭"）
- **年龄模式** = 由出生年份推导出的推荐策略档位（growth / adult / senior）
- **三选一** = 每次推荐必须返回的三张卡（balanced / crave / easy；聚餐则是 all / fun / easy）
- **refineHint** = 用户点"更健康/更符合口味"时传给模型的方向提示
- **recentStores** = 从日记聚合出的常吃外卖店铺列表
- **Mock 兜底** = Claude 不可用时后端返回的固定假数据，保证 UI 不白屏

---

_如果你是被交接进这个项目的下一位工程师或者一个刚被换上来的 AI Agent：先看这个 README，再看 `api/agent.js`（后端逻辑全在这一个文件里），最后看 `views/RecommendList.vue` + `views/Today.vue`（前端主线两页）。理解这三处就能开始改。_
