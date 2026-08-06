const agent = require('../../../services/agent.js')
const store = require('../../../utils/store.js')

Page({
  data: { picks: [], loading: true, extraRequirement: '' },

  onLoad() { this._load() },

  async _load(extraRequirement) {
    this.setData({ loading: true })
    const app = getApp()
    const r = await agent.recommend({
      profile: app.globalData.profile || store.getProfile(),
      todayContext: store.getTodayContext(),
      recentDiary: store.getDiary().slice(0, 6),
      ageMode: app.globalData.ageMode,
      extraRequirement: extraRequirement || ''
    })
    if (r && r.ok) {
      const picks = (r.data && r.data.picks) || []
      this.setData({ picks, loading: false })
      store.setLastReco({ picks, at: Date.now() })
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: '推荐失败', icon: 'none' })
    }
  },

  onRefresh() { this._load() },

  onExtraInput(e) { this.setData({ extraRequirement: e.detail.value }) },

  onExtraConfirm() {
    const val = (this.data.extraRequirement || '').trim()
    if (!val) return
    this.setData({ extraRequirement: '' })
    this._load(val)
  },

  goDetail(e) {
    const idx = e.currentTarget.dataset.idx
    const pick = this.data.picks[idx]
    getApp().globalData._pendingPick = pick
    wx.navigateTo({ url: '/pages/recommend/detail/index' })
  }
})
