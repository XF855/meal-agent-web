// localStorage 封装：画像、日记、今日状态、上次推荐
const K_PROFILE = 'meal_profile'
const K_DIARY = 'meal_diary'
const K_TODAY = 'meal_today_ctx'
const K_LAST_RECO = 'meal_last_reco'
const K_PENDING = 'meal_pending'  // 页面间临时数据（识别结果、当前选中的推荐卡）

function readJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch (e) { return fallback }
}
function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) {}
}

export function getProfile() { return readJSON(K_PROFILE, null) }
export function setProfile(p) { writeJSON(K_PROFILE, p) }

export function getDiary() { return readJSON(K_DIARY, []) }
export function appendDiary(entry) {
  const list = getDiary()
  list.unshift(Object.assign({ id: Date.now(), createdAt: Date.now() }, entry))
  writeJSON(K_DIARY, list)
  return list
}
export function updateDiary(id, patch) {
  const list = getDiary().map(x => x.id === id ? Object.assign({}, x, patch) : x)
  writeJSON(K_DIARY, list)
  return list
}
export function deleteDiary(id) {
  const list = getDiary().filter(x => x.id !== id)
  writeJSON(K_DIARY, list)
  return list
}

export function getTodayContext() { return readJSON(K_TODAY, null) }
export function setTodayContext(ctx) { writeJSON(K_TODAY, Object.assign({ savedAt: Date.now() }, ctx)) }

export function getLastReco() { return readJSON(K_LAST_RECO, null) }
export function setLastReco(r) { writeJSON(K_LAST_RECO, r) }

export function getPending(key) {
  const p = readJSON(K_PENDING, {})
  return p[key]
}
export function setPending(key, val) {
  const p = readJSON(K_PENDING, {})
  p[key] = val
  writeJSON(K_PENDING, p)
}

export function clearAll() {
  [K_PROFILE, K_DIARY, K_TODAY, K_LAST_RECO, K_PENDING].forEach(k => localStorage.removeItem(k))
}

// 收集最近使用过的外卖店铺，供推荐参考
export function getDeliveryStores(limit) {
  const map = {}
  getDiary().forEach(d => {
    const s = (d.deliveryStore || '').trim()
    if (!s) return
    if (!map[s]) map[s] = { name: s, count: 0, last: 0, dishes: [] }
    map[s].count += 1
    map[s].last = Math.max(map[s].last, d.createdAt || 0)
    ;(d.items || []).forEach(it => {
      if (it && it.name && !map[s].dishes.includes(it.name)) map[s].dishes.push(it.name)
    })
  })
  const arr = Object.values(map).sort((a, b) => b.count - a.count || b.last - a.last)
  return typeof limit === 'number' ? arr.slice(0, limit) : arr
}

// 画像导出为分享文本（Base64 JSON）
export function exportProfileText() {
  const payload = {
    v: 1,
    exportedAt: Date.now(),
    profile: getProfile()
  }
  const json = JSON.stringify(payload)
  // 使用 URL 安全 base64，方便通过短信/微信复制
  return 'MEAL1:' + btoa(unescape(encodeURIComponent(json)))
}

// 解码分享文本 → 画像对象；失败返回 null
export function decodeProfileText(text) {
  if (!text) return null
  const s = String(text).trim()
  const body = s.startsWith('MEAL1:') ? s.slice(6) : s
  try {
    const json = decodeURIComponent(escape(atob(body)))
    const obj = JSON.parse(json)
    if (obj && obj.profile) return obj.profile
    if (obj && obj.basic) return obj              // 兼容直接粘 JSON
  } catch (e) {
    try {
      const obj = JSON.parse(s)
      if (obj && (obj.basic || obj.prefer)) return obj
    } catch (e2) {}
  }
  return null
}

// 覆盖式导入本机画像
export function importProfile(profile) {
  if (!profile) return false
  setProfile(Object.assign({}, profile, { onboarded: true }))
  return true
}

export function deriveAgeMode(profile) {
  const by = (profile && profile.basic && profile.basic.birthYear) || (profile && profile.birthYear)
  if (!by) return 'adult'
  const age = new Date().getFullYear() - Number(by)
  if (age >= 10 && age <= 17) return 'growth'
  if (age >= 60) return 'senior'
  return 'adult'
}
