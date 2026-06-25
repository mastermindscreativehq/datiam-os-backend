import { apiClient } from './client'

export const catalog = {
  // Artists
  artists: {
    list: (params?: any) => apiClient.get('/catalog/artists', { params }),
    get: (id: string) => apiClient.get(`/catalog/artists/${id}`),
    create: (data: any) => apiClient.post('/catalog/artists', data),
    update: (id: string, data: any) => apiClient.patch(`/catalog/artists/${id}`, data),
    delete: (id: string) => apiClient.delete(`/catalog/artists/${id}`),
    stats: (id: string) => apiClient.get(`/catalog/artists/${id}/stats`),
    songs: (id: string) => apiClient.get(`/catalog/artists/${id}/songs`),
    releases: (id: string) => apiClient.get(`/catalog/artists/${id}/releases`),
  },
  // Songs
  songs: {
    list: (params?: any) => apiClient.get('/catalog/songs', { params }),
    get: (id: string) => apiClient.get(`/catalog/songs/${id}`),
    create: (data: any) => apiClient.post('/catalog/songs', data),
    update: (id: string, data: any) => apiClient.patch(`/catalog/songs/${id}`, data),
    delete: (id: string) => apiClient.delete(`/catalog/songs/${id}`),
    assets: (id: string) => apiClient.get(`/catalog/songs/${id}/assets`),
    addAsset: (id: string, data: any) => apiClient.post(`/catalog/songs/${id}/assets`, data),
    credits: (id: string) => apiClient.get(`/catalog/songs/${id}/credits`),
    addCredit: (id: string, data: any) => apiClient.post(`/catalog/songs/${id}/credits`, data),
    updateCredit: (id: string, creditId: string, data: any) => apiClient.patch(`/catalog/songs/${id}/credits/${creditId}`, data),
    deleteCredit: (id: string, creditId: string) => apiClient.delete(`/catalog/songs/${id}/credits/${creditId}`),
    documents: (id: string) => apiClient.get(`/catalog/songs/${id}/documents`),
    addDocument: (id: string, data: any) => apiClient.post(`/catalog/songs/${id}/documents`, data),
    identifiers: (id: string) => apiClient.get(`/catalog/songs/${id}/identifiers`),
    addIdentifier: (id: string, data: any) => apiClient.post(`/catalog/songs/${id}/identifiers`, data),
  },
  // Releases
  releases: {
    list: (params?: any) => apiClient.get('/catalog/releases', { params }),
    get: (id: string) => apiClient.get(`/catalog/releases/${id}`),
    create: (data: any) => apiClient.post('/catalog/releases', data),
    update: (id: string, data: any) => apiClient.patch(`/catalog/releases/${id}`, data),
    delete: (id: string) => apiClient.delete(`/catalog/releases/${id}`),
    tracks: (id: string) => apiClient.get(`/catalog/releases/${id}/tracks`),
    addTrack: (id: string, data: any) => apiClient.post(`/catalog/releases/${id}/tracks`, data),
    removeTrack: (id: string, trackId: string) => apiClient.delete(`/catalog/releases/${id}/tracks/${trackId}`),
    artwork: (id: string) => apiClient.get(`/catalog/releases/${id}/artwork`),
    addArtwork: (id: string, data: any) => apiClient.post(`/catalog/releases/${id}/artwork`, data),
    deleteArtwork: (id: string, artworkId: string) => apiClient.delete(`/catalog/releases/${id}/artwork/${artworkId}`),
    identifiers: (id: string) => apiClient.get(`/catalog/releases/${id}/identifiers`),
    addIdentifier: (id: string, data: any) => apiClient.post(`/catalog/releases/${id}/identifiers`, data),
  },
  // Global
  search: (q: string) => apiClient.get('/catalog/search', { params: { q } }),
  stats: () => apiClient.get('/catalog/stats'),
  missing: () => apiClient.get('/catalog/missing'),
}
