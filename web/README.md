# 饮食决策 Agent · H5 Web 版

一个帮用户在 1 分钟内决定"下一餐吃什么"的 Web 应用。
Vue 3 + Vite 单页 + Vercel Serverless（`/api/agent`）+ Claude Messages API。

**在线体验：** 在 Vercel 部署后拿到的 `https://xxx.vercel.app` 就是可提交的作品链接，评委浏览器直接打开即可。

---

## 一、产品是什么

### 一句话
记住用户最近吃过什么、了解用户今天状态，并持续调整下一餐推荐的**饮食决策 Agent**。

### 核心主张
> 吃得开心，吃得放心，吃得省心。
> Enjoy Every Bite. Trust Every Choice. Skip the Stress.

不做严格节食、不粗暴地把食物分成"健康 / 不健康"，而是在 **安全、营养、口味、情绪、便利** 五个维度之间帮用户快速拍板。

### 首版核心闭环（本仓库已实现）
```
基础问卷 → 每日状态 → 上传餐照 → Agent 识别 → 用户确认 →
Agent 结合画像+状态 → 三选一推荐 → 用户选择 → 饭后反馈 → 更新日记与偏好
```

### 明确不做（第一版）
- 家庭健康管理、疾病治疗菜单、医学诊断
- 精确到卡路里个位数的营养估算
- 自动减重计划
- 大规模社交关系（`饭友` / `聚餐 Agent` 已在路线图里预留接入点）

---

## 二、页面清单

底部四个 Tab：`今日 | Agent | 日记 | 我的`。所有页面在 `web/src/views/` 下。

| 路由 | 文件 | 作用 |
| --- | --- | --- |
| `/onboarding/brand` | Brand.vue | 品牌介绍页，两个按钮：正式建档 / 先体验 |
| `/onboarding/basic` | Basic.vue | 基础信息：出生年份、身高体重、过敏、忌口、饮食类型 |
| `/onboarding/prefer` | Prefer.vue | 口味场景：菜系、辣度、用餐方式、单餐预算、喜好/不喜好 |
| `/today` | Today.vue | **今日 Tab**。问候语 + 每日动态提问（饥饿/心情/时间/场景/想吃）+ 快速入口 + 提醒 |
| `/agent` | Agent.vue | **Agent Tab**。类聊天窗口：拍照识别、追问、结果卡片 |
| `/agent/confirm` | Confirm.vue | 编辑识别到的菜品，确认后写入日记 |
| `/recommend` | RecommendList.vue | 三张推荐卡：今天最合适 / 最想吃 / 最省事 |
| `/recommend/detail` | RecommendDetail.vue | 单张卡详情 + 追问区（换主食/更辣/更便宜/教做法）+ "就吃这个" |
| `/recommend/feedback` | Feedback.vue | 饭后 4 项快评：满意度、饱腹感、感受、下次意愿 |
| `/diary` | Diary.vue | **日记 Tab**。按天分组、编辑/删除、周概览 |
| `/mine` | Mine.vue | **我的 Tab**。展示画像、Agent 接入状态、清空数据 |

未 `onboarded` 的用户任何路径都会被 `router.beforeEach` 拦到 `/onboarding/brand`。

---

## 三、目录结构

```
web/
├─ index.html                      入口 HTML
├─ package.json                    vue 3 / vue-router / vite
├─ vite.config.js
├─ vercel.json                     SPA 回退：所有非 /api 路由都指向 index.html
├─ .env.example                    环境变量样板
├─ api/
│  └─ agent.js                     Vercel Serverless Function（唯一后端）
└─ src/
   ├─ main.js                      挂载 App、注册 router、引入全局样式
   ├─ App.vue                      顶层容器 + <TabBar>
   ├─ router.js                    hash 路由 + 未 onboarded 拦截
   ├─ components/
   │  └─ TabBar.vue                今日/Agent/日记/我的
   ├─ services/
   │  ├─ agent.js                  统一 fetch → /api/agent；失败降级本地 mock
   │  └─ store.js                  localStorage 封装：画像/日记/今日/推荐/pending
   ├─ styles/
   │  └─ global.css                设计系统（.card / .tag / .btn-primary 等）
   └─ views/                       11 个页面组件（见上表）
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
│  ─ Claude 调用失败自动兜底 Mock，UI 永远不白屏        │
└──────────────────┬──────────────────────────────────┘
                   │  POST /v1/messages
                   │  (可通过 ANTHROPIC_BASE_URL 换成第三方代理)
                   ▼
┌─────────────────────────────────────────────────────┐
│  Claude Messages API                                 │
│  ─ 默认 claude-opus-4-7                              │
│  ─ Vision 模式：recognizeMeal 传 base64 图片          │
└─────────────────────────────────────────────────────┘
```

### 4.2 为什么这样切

- **Key 只在后端**：H5 前端字节码人人可看，Key 必须放 Serverless 环境变量。
- **前端无跨域压力**：浏览器只请求同源 `/api/agent`，永远不出 Vercel 域，绕过 CORS。
- **Mock 兜底**：网络抖动、Key 用完、模型 5xx、代理挂了——`services/agent.js` 都能立刻回落到本地假数据，UI 不受影响；这是黑客松演示的救命稻草。
- **Serverless 无状态**：所有用户数据（画像、日记、今日状态）持久化在浏览器 `localStorage`，服务器不存任何 PII，评委每人一份互不干扰。

### 4.3 数据流（一次完整推荐）

```
用户在 Today 选 "帮我决定" 或 "换一批"
     │
RecommendList.vue  onMounted
     │  agent.recommend({
     │    profile:  getProfile(),        // 画像
     │    todayContext: getTodayContext(),// 今日状态
     │    recentDiary: getDiary().slice(0,6),
     │    ageMode: deriveAgeMode(profile)
     │  })
     ▼
services/agent.js  fetch('/api/agent', {action:'recommend', payload})
     ▼
api/agent.js       构造 Claude Messages 请求
     │  system:  "…安全过滤优先、必须三选一、返回严格 JSON…"
     │  user:    "schema: {picks:[…]}\n上下文: {画像+状态+近期饮食}"
     ▼
Claude 返回一段包含 JSON 的文本
     │  正则抽 JSON → JSON.parse → 校验 picks 是数组
     ▼
前端拿到 picks[]，渲染三张卡；写入 localStorage(lastReco)
     │
用户点某张卡进入详情 → 追问走 chat action，同一后端同一模型
     │
用户点"就吃这个" → appendDiary({awaitingFeedback: true, pick})
     │
饭后反馈页 → updateDiary(id, {feedback, awaitingFeedback: false})
```

---

## 五、推荐是怎么算出来的

**关键决策：本项目把"排序/评分"逻辑完全交给 Claude 处理，前端只做数据组装和结果渲染。** 好处是行为符合大模型的自然语言理解能力，硬编码几十个规则反而会限制它。风险是每次结果不完全可复现——这在饮食推荐里可以接受（人本来就不该每餐吃一样的）。

以下是 Prompt 里明确要求 Claude 遵循的规则，摘自 `api/agent.js`：

### 5.1 System Prompt（约束模型行为）
```
你是一个"饮食决策 Agent"。目标：在安全、营养、口味、情绪、便利之间，
帮用户在 1 分钟内决定"下一餐吃什么"。

必须遵守：
1. 先做安全过滤：过敏、明确忌口、年龄模式规则优先于任何评分。
2. 每次推荐固定给出三个具体选择：今天最合适 / 今天最想吃 / 今天最省事。
3. 用具体菜名、份量、做法或点单方式，不要笼统建议。
4. 输出必须是合法 JSON，字段严格按用户消息中的 schema。不要输出任何 JSON 以外的内容。
```

### 5.2 用户消息里塞进模型的完整上下文

```jsonc
{
  "profile": {
    "basic": {
      "birthYear": 1998,
      "height": 170, "weight": 60,
      "allergies": ["虾", "花生"],
      "taboos": ["不吃动物内脏"],
      "diet": "普通"
    },
    "prefer": {
      "cuisines": ["川菜", "本帮菜"],
      "spicy": 2,                        // 0-3
      "scenes": ["外卖", "食堂"],
      "budget": "20~40 元",
      "favorites": "番茄鸡蛋",
      "dislikes": "香菜"
    }
  },
  "todayContext": {
    "hunger": "很饿",
    "mood": "疲惫",
    "time": "20 分钟",
    "scene": "外卖",
    "crave": "热汤"
  },
  "recentDiary": [
    { "meal": "午餐", "items": [{"name":"红烧肉饭","portion":"一份"}], "feedback": {...} },
    ...最近 6 条
  ],
  "ageMode": "adult"                     // growth / adult / senior
}
```

### 5.3 输出 Schema（模型必须严格返回）

```jsonc
{
  "picks": [
    {
      "key": "balanced",                // balanced / crave / easy
      "title": "今天最合适",
      "dish": "番茄虾仁豆腐煲 + 一拳米饭 + 一份青菜",
      "reason": "最近两餐蛋白质多为猪肉，这一餐换成虾和豆腐更丰富。",
      "budget": "30~45 元",
      "time": "25 分钟",
      "allergens": ["虾", "大豆"],
      "swaps": ["虾仁 ↔ 鸡胸肉"],
      "howto": "外卖搜'豆腐煲'，或在家：热油下姜蒜，番茄炒软后加水、豆腐、虾仁煮 5 分钟。"
    },
    { "key": "crave", "title": "今天最想吃", ... },
    { "key": "easy",  "title": "今天最省事", ... }
  ]
}
```

三张卡的分工（frame2 第十一节）：
- **今天最合适** — 优先近期饮食平衡与营养匹配
- **今天最想吃** — 优先照顾情绪 / 口味，允许轻微"放纵"但仍守安全线
- **今天最省事** — 优先时间、预算、可获取性

### 5.4 排序维度（写进 System Prompt 供模型参考）

| 维度 | 权重（初始规则） | 说明 |
| --- | --- | --- |
| **安全性** | 硬性规则 | 过敏、忌口、年龄模式违规 → 直接排除，不进入排序 |
| 偏好匹配 | 30% | 菜系、辣度、favorites/dislikes、真实历史选择 |
| 近期饮食平衡 | 25% | 蛋白质来源多样性、蔬菜频率、连续油炸/甜饮 |
| 场景可执行性 | 20% | 时间、预算、外卖/在家 |
| 当前状态 | 15% | 饥饿、心情、身体感受、当下想吃 |
| 食物多样性 | 10% | 避免最近 3 天菜品重复 |

（这些是"给模型参考"的策略，真正的加权由模型综合判断——不写在代码里。）

### 5.5 三种年龄模式

`services/store.js` 的 `deriveAgeMode(profile)`：

- `10-17` → **growth 成长模式**：不推快速减重，不用 BMI 直接评价，涉及体重时保守提示
- `18-59` → **adult 成人模式**：全功能
- `≥60` → **senior 活力模式**：偏软食、清淡不单调、蛋白质来源、操作简单

模式作为 `ageMode` 字段跟随每次 recommend 请求送进 Prompt。

### 5.6 视觉识别（`action: recognizeMeal`）

- 前端 `Agent.vue` 用 `<canvas>` 把用户选的图片压缩到长边 1024px、JPEG 82% 质量
- 转 base64 dataURL 塞进请求 body
- 后端识别到 `data:image/xxx;base64,...`，构造多模态 messages：
  ```jsonc
  {
    "role": "user",
    "content": [
      { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." } },
      { "type": "text",  "text":   "请严格返回 JSON... schema: {items:[{name,portion,method,confidence}], followUps:[]}" }
    ]
  }
  ```
- Vercel 路由配置：`sizeLimit: 5mb, maxDuration: 30` 应对图片体积和识别延迟
- **强制用户确认**（frame2 第九节第三部分要求）：识别结果先渲染到 Agent 聊天流的一张卡片，用户点"去确认"进入 `Confirm.vue` 才能修改并写入日记

### 5.7 追问（`action: chat`）

- 详情页四个快捷按钮：换主食 / 更辣 / 更便宜 / 教做法
- 聊天页自由文本
- Payload 里带 `history`（最近 8 条消息）+ `profile` + `todayContext`
- 模型返回 `{reply: string}`，前端把最后一条 loading 消息替换为回复

---

## 六、Prompt 工程要点（想改动前必读）

### 6.1 为什么要求"严格 JSON"

Claude 默认会用自然语言，若不做约束就会返回"我给你推荐三种选择：1. …"这种散文。做法：
1. System Prompt 明写"必须返回合法 JSON、不要输出任何 JSON 以外的内容"。
2. User Message 里把 schema 显式写出来（`{picks:[{key,title,...}]}`）。
3. 后端做兜底解析：`text.match(/\{[\s\S]*\}/)` 抓第一个花括号块再 `JSON.parse`；抓不到就抛 `claude_no_json`，落入 catch → 返 mock，不让 UI 崩。

### 6.2 System Prompt 里刻意省掉了什么

- **没有硬编码菜谱库**——依赖模型自身的世界知识生成菜名和做法，MVP 阶段够用，未来可加菜品库（frame2 二十节第 4 层"营养和菜品知识层"）后再切换
- **没有加"你是营养师"人设**——因为产品不做医疗诊断，人设可能诱发过度自信的营养声明
- **没有 few-shot 示例**——想让模型每次输出更"新鲜"；如果发现三张卡固定往某种口味偏，可以考虑加 2-3 个 few-shot 平衡

### 6.3 想改 Prompt 从哪里下手
- `api/agent.js` 顶部的 `SYSTEM_PROMPT` 常量
- `callClaude(userJson, schemaHint, opts)` 里 user message 的模板字符串
- 想让某个 action 用不同 system，可以给 `callClaude` 加参数分开

---

## 七、状态与数据存储

**除了环境变量，服务端不持久化任何东西。** 所有用户数据都在浏览器 `localStorage` 里：

| Key | 内容 | 写入点 |
| --- | --- | --- |
| `meal_profile` | 长期画像 `{basic, prefer, onboarded, skipped}` | Basic/Prefer 页 |
| `meal_diary` | 日记数组，倒序 `[{id, createdAt, meal, items[], imageSrc, feedback, awaitingFeedback}]` | Confirm/Detail 确认 + Feedback 反馈 |
| `meal_today_ctx` | 今日状态 `{hunger, mood, time, scene, crave, savedAt}` | Today 页选按钮时 |
| `meal_last_reco` | 上次推荐结果 | RecommendList 拉取后 |
| `meal_pending` | 页面间临时数据（识别结果、当前卡片） | Agent → Confirm、List → Detail |

好处：数据不出用户设备，天然隐私安全；坏处：换设备不同步，清缓存丢失。将来接 Vercel KV / Supabase 时只需改 `services/store.js` 的 5 个 getter/setter，业务代码零改动。

---

## 八、安全 & 隐私原则（源自 frame2 第八层）

以下几条是**产品红线**，改代码时不要越过：

- **过敏和明确忌口是硬性过滤**，绝不参与"评分加权"——安全优先于口味
- **不作医疗诊断**：遇到用户描述严重症状，应引导专业医疗，不给"治病食谱"
- **未成年人保护**：`growth` 模式不推快速减重、不用 BMI 评价、涉及体重管理时给谨慎提示
- **社交与健康数据隔离**：如果将来加饭友 / 聚餐 Agent，公开饮食卡片**只能**含 `basic.diet` / `prefer.cuisines` / `prefer.budget` / 需要公开的过敏原；身高体重、疾病记录、月经、饭后感受**永远**不公开
- **不用用户健康数据训练公共模型**：Prompt 里的画像只用于当次推荐，Serverless 请求结束即抛弃

---

## 九、部署与运维

### 9.1 部署到 Vercel（5 分钟）

```bash
# 1. 推到 GitHub
cd D:/ClaudeCodeTrust/meal
git init && git add web/ && git commit -m "meal-agent web mvp"
# 在 github.com 新建 meal-agent-web 空仓库
git remote add origin https://github.com/<your>/meal-agent-web.git
git branch -M main && git push -u origin main
```

打开 https://vercel.com/new → Import 该仓库 → **Root Directory 改为 `web`** → 加环境变量（下节）→ Deploy。

### 9.2 环境变量

| Key | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | 必填 | 无 | Claude 密钥；不填自动走 mock，UI 仍可用 |
| `ANTHROPIC_MODEL` | 可选 | `claude-opus-4-7` | 也可 `claude-sonnet-4-6` / `claude-haiku-4-5-20251001` |
| `ANTHROPIC_BASE_URL` | 可选 | `https://api.anthropic.com` | 第三方代理（如 eazo）填这里 |
| `ANTHROPIC_AUTH_STYLE` | 可选 | `x-api-key` | 代理若要 Bearer 就填 `bearer` |

**加完变量必须去 Deployments 手动 Redeploy 一次**（记得取消勾 Use existing Build Cache），旧部署不会自动读到新变量。

### 9.3 判断 Agent 是否真接上

打开线上链接 → 走到"三选一推荐" → F12 Network → 找 `/api/agent` 请求 → Response：
- `"source": "claude"` → 真的接上了
- `"source": "mock"` → Claude 调用失败被 catch 兜底了；去 Vercel → Logs 看 `recommend claude error: ...` 那行
- 请求 5xx / red / `"source": "local-mock"` → 请求根本没到后端，前端 fetch 就失败

### 9.4 常见错误对应

| 日志 | 原因 | 修法 |
| --- | --- | --- |
| `claude_http_401 invalid x-api-key` | Key 错 / 前后有空格 / 代理需要 Bearer | 重新粘 Key，或把 `ANTHROPIC_AUTH_STYLE=bearer` |
| `claude_http_400 model not found` | 模型名代理不支持 | 换 `ANTHROPIC_MODEL` 到代理文档列出的 ID |
| `claude_http_429` | 限流 / 额度用完 | 等一会儿；或换模型；或充值 |
| `claude_no_json` | 模型返回没 JSON | 通常是 Prompt 里 schema 讲不清；改 System Prompt 加强 |
| `claude_http_400 ... invalid content` | 当前模型不接受 vision | 识别用的模型换成 sonnet 或 opus |

### 9.5 迭代流程

改代码 → `git push` → Vercel 自动 build 部署（主分支进 Production，其它分支出 Preview URL） → 30~60 秒生效，链接不变。环境变量改动例外，必须手动 Redeploy。

---

## 十、路线图

**已完成（本 repo）**
- 首次注册流（品牌 + 基础 + 口味）
- 三种年龄模式
- 每日动态提问
- 拍照上传 + Claude vision 识别
- 识别结果用户确认
- 三选一推荐（安全优先 + 五维排序）
- 推荐详情 + 追问
- 饭后反馈
- 饮食日记（编辑 / 删除 / 周概览）

**未做，但预留了接入点**
- 菜品知识库（`api/agent.js` 里 System Prompt 添加"从库中选菜"的约束即可）
- 附近餐厅（Google Places / Foursquare API）
- 云端多设备同步（换 `store.js`）
- 饭友 / 聚餐 Agent（新增 `views/social/*` + `action: partyRecommend`）
- PWA（`public/manifest.json` + service worker）

---

## 十一、本地开发

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

## 十二、术语速查

- **闭环** = 首版核心用户流程：拍照→识别→确认→推荐→选择→反馈
- **画像** = 长期不变的用户信息（`meal_profile`）
- **今日状态** = 当天动态问答收集的临时数据（`meal_today_ctx`）
- **年龄模式** = 由出生年份推导出的推荐策略档位（growth / adult / senior）
- **三选一** = 每次推荐必须返回的三张卡（balanced / crave / easy）
- **Mock 兜底** = Claude 不可用时后端返回的固定假数据，保证 UI 不白屏
- **frame2 / frame3** = 项目根目录下的产品需求文档，本 README 的很多规则源自其中

---

_如果你是被交接进这个项目的下一位工程师或者一个刚被换上来的 AI Agent：先看这个 README，再看 `api/agent.js`（后端逻辑全在这一个文件里），最后看 `views/RecommendList.vue` + `views/Agent.vue`（前端主线两页）。理解这三处就能开始改。_
