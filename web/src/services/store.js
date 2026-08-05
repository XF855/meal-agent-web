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

export function deriveAgeMode(profile) {
  const by = (profile && profile.basic && profile.basic.birthYear) || (profile && profile.birthYear)
  if (!by) return 'adult'
  const age = new Date().getFullYear() - Number(by)
  if (age >= 10 && age <= 17) return 'growth'
  if (age >= 60) return 'senior'
  return 'adult'
}
