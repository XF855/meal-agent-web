# 饮食决策 Agent · H5 Web 版

Vue 3 + Vite 单页应用 + Vercel Serverless Function（`/api/agent`）。
一条链接可打开、可扫码、可分享，评委无需装微信、无需 AppID。

## 一分钟本地跑起来

```bash
cd D:\ClaudeCodeTrust\meal\web
npm install
npm run dev
```

浏览器打开 http://localhost:5173，走完 品牌介绍 → 基础信息 → 口味场景 → 今日 → Agent 上传照片 → 三选一 → 就吃这个 → 饭后反馈 → 日记。

本地开发时 `/api/agent` 需要跑起来才能得到真实 Claude 响应：
- 简单办法：什么都不做——`services/agent.js` 检测到 fetch 失败会自动走**本地 Mock**，UI 全部可用。
- 想联调真实后端：装 Vercel CLI，另开一个终端 `npx vercel dev`（会同时起前端和 `/api`）。

## 三步部署到 Vercel（约 5 分钟）

### 1. 推到 GitHub

```bash
cd D:\ClaudeCodeTrust\meal
git init
git add web/
git commit -m "meal-agent web mvp"
# 在 github.com 新建仓库 meal-agent-web（Public 或 Private 均可），拿到 SSH/HTTPS 地址
git remote add origin git@github.com:你的用户名/meal-agent-web.git
git branch -M main
git push -u origin main
```

### 2. Vercel 导入

1. 打开 https://vercel.com/new
2. 用 GitHub 授权，选择刚才那个仓库
3. **重要**：`Root Directory` 改为 `web`（因为项目在子目录里）
4. Framework Preset 会自动识别为 **Vite**，保持默认
5. **Environment Variables** 添加：

   | Name | Value |
   | --- | --- |
   | `ANTHROPIC_API_KEY` | `sk-ant-你的完整 Key` |
   | `ANTHROPIC_MODEL` | `claude-opus-4-7` |

6. 点 **Deploy**

30~60 秒后就会拿到 `https://meal-agent-web-xxx.vercel.app` 这个链接——**这就是你要提交的作品链接**。

### 3. 验证真实 Agent 已连通

浏览器打开链接 → 走到"三选一推荐"页 → 打开 DevTools → Network → 找 `/api/agent` 请求，Response 里应该看到 `"source": "claude"`。如果是 `"source": "mock"`，说明 Key 没生效——回 Vercel → Settings → Environment Variables 检查后 Redeploy。

## AI 是怎么接进来的

数据流：

```
用户操作
   │
   ▼
src/services/agent.js         ← 前端只 POST /api/agent
   │  fetch('/api/agent', {action, payload})
   ▼
api/agent.js (Vercel Serverless)
   │  1) 读 process.env.ANTHROPIC_API_KEY
   │  2) 有 Key → 调 https://api.anthropic.com/v1/messages
   │  3) 无 Key 或调用失败 → 返回内置 Mock
   ▼
Claude claude-opus-4-7
   │  返回 JSON: {picks:[...]} / {reply:"..."}
   ▼
前端渲染三选一 / 追问回复
```

**关键点：**

- Key **只**放在 Vercel 环境变量里，前端代码永远看不到——安全。
- 前端从来不直接调 Anthropic 域名，浏览器不会有 CORS 问题。
- Mock 兜底让 UI 永远可用，网络抖动、Key 用完、Claude 5xx 都不会白屏。
- 想换模型：改 `ANTHROPIC_MODEL` 环境变量为 `claude-haiku-4-5-20251001`（更快更便宜）或 `claude-sonnet-4-6`，Redeploy 即可，前端零改动。

## 想加"视觉识别"

`api/agent.js` 里的 `recognizeMeal` 目前返回占位——因为 Claude vision 需要传图片 base64、成本更高、也依赖你的 Key 有 vision 额度。要接：把前端 Agent.vue 里读到的 dataUrl 传进 payload，然后在后端拼一个 vision messages 请求（`content: [{type:"image", source:{type:"base64", ...}}, {type:"text", text:"识别菜品并返回 JSON"}]`）即可。

## 后续可以做但没做

- PWA（加 manifest.json + service worker）→ 手机加桌面图标
- 云端同步：把 `services/store.js` 里的 `localStorage` 换成 Vercel KV / Supabase
- 社交支线：`饭友` / `聚餐 Agent`，参照 `frame2.txt` 十七节
