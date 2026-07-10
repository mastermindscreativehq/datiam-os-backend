import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

const api = axios.create({ baseURL: `${BASE}/release-intelligence` })
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('datiam_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) window.location.href = '/login'
  return Promise.reject(err)
})

export const releaseIntelligenceApi = {
  getDashboard:     (artistId?: string) =>
    api.get('/dashboard', { params: artistId ? { artist_id: artistId } : {} }).then(r => r.data.data),
  getCalendar:      (artistId?: string, year?: number, month?: number) =>
    api.get('/calendar', { params: { artist_id: artistId, year, month } }).then(r => r.data.data),
  getReleaseDetail: (id: string) => api.get(`/${id}`).then(r => r.data.data),
  updateRelease:    (id: string, body: Record<string, unknown>) => api.patch(`/${id}`, body).then(r => r.data.data),
  dispatchAutomation: (id: string, category: string, body: Record<string, unknown> = {}) =>
    api.post(`/${id}/automation/${category}`, body).then(r => r.data.data),
  getReadiness:     (id: string) => api.get(`/${id}/readiness`).then(r => r.data.data),
  getDspStatuses:   (id: string) => api.get(`/${id}/dsp-status`).then(r => r.data.data),
  updateDspStatus:  (id: string, platform: string, body: Record<string, unknown>) =>
    api.patch(`/${id}/dsp-status/${platform}`, body).then(r => r.data.data),
  getCampaigns:     (id: string) => api.get(`/${id}/campaigns`).then(r => r.data.data),
  createCampaign:   (id: string, body: Record<string, unknown>) =>
    api.post(`/${id}/campaigns`, body).then(r => r.data.data),
  updateCampaign:   (campaignId: string, body: Record<string, unknown>) =>
    api.patch(`/campaigns/${campaignId}`, body).then(r => r.data.data),
  deleteCampaign:   (campaignId: string) => api.delete(`/campaigns/${campaignId}`).then(r => r.data.data),
  getAlerts:        (id: string, includeResolved = false) =>
    api.get(`/${id}/alerts`, { params: { include_resolved: includeResolved } }).then(r => r.data.data),
  generateAlerts:   (id: string) => api.post(`/${id}/alerts/generate`).then(r => r.data.data),
  resolveAlert:     (alertId: string) => api.patch(`/alerts/${alertId}/resolve`).then(r => r.data.data),
  getRecommendations: (id: string) => api.get(`/${id}/recommendations`).then(r => r.data.data),
  generateRecs:     (id: string) => api.post(`/${id}/recommendations/generate`).then(r => r.data.data),
  actionRec:        (recId: string) => api.patch(`/recommendations/${recId}/action`).then(r => r.data.data),
  getSummary:       () => api.get('/summary').then(r => r.data.data),
}
