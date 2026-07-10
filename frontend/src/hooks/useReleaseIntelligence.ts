import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { releaseIntelligenceApi } from '../api/releaseIntelligence'

export const RELEASE_INTEL_KEYS = {
  dashboard: (artistId?: string) => ['release-intel', 'dashboard', artistId] as const,
  calendar:  (artistId?: string, year?: number, month?: number) => ['release-intel', 'calendar', artistId, year, month] as const,
  detail:    (id: string) => ['release-intel', 'detail', id] as const,
  readiness: (id: string) => ['release-intel', 'readiness', id] as const,
  dsp:       (id: string) => ['release-intel', 'dsp', id] as const,
  campaigns: (id: string) => ['release-intel', 'campaigns', id] as const,
  alerts:    (id: string) => ['release-intel', 'alerts', id] as const,
  recs:      (id: string) => ['release-intel', 'recs', id] as const,
  summary:   () => ['release-intel', 'summary'] as const,
}

export function useReleaseDashboard(artistId?: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.dashboard(artistId),
    queryFn: () => releaseIntelligenceApi.getDashboard(artistId),
    staleTime: 2 * 60 * 1000,
  })
}

export function useReleaseCalendar(artistId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.calendar(artistId, year, month),
    queryFn: () => releaseIntelligenceApi.getCalendar(artistId, year, month),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReleaseDetail(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.detail(id),
    queryFn: () => releaseIntelligenceApi.getReleaseDetail(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useUpdateRelease(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => releaseIntelligenceApi.updateRelease(releaseId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.detail(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.readiness(releaseId) })
    },
  })
}

export function useDispatchReleaseAutomation(releaseId: string) {
  return useMutation({
    mutationFn: ({ category, body }: { category: string; body?: Record<string, unknown> }) =>
      releaseIntelligenceApi.dispatchAutomation(releaseId, category, body ?? {}),
  })
}

export function useReleaseReadiness(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.readiness(id),
    queryFn: () => releaseIntelligenceApi.getReadiness(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useDspStatuses(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.dsp(id),
    queryFn: () => releaseIntelligenceApi.getDspStatuses(id),
    enabled: !!id,
  })
}

export function useUpdateDspStatus(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, body }: { platform: string; body: Record<string, unknown> }) =>
      releaseIntelligenceApi.updateDspStatus(releaseId, platform, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.dsp(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.readiness(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.detail(releaseId) })
    },
  })
}

export function useReleaseCampaigns(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.campaigns(id),
    queryFn: () => releaseIntelligenceApi.getCampaigns(id),
    enabled: !!id,
  })
}

export function useCreateCampaign(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => releaseIntelligenceApi.createCampaign(releaseId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.campaigns(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.readiness(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.detail(releaseId) })
    },
  })
}

export function useUpdateCampaign(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ campaignId, body }: { campaignId: string; body: Record<string, unknown> }) =>
      releaseIntelligenceApi.updateCampaign(campaignId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.campaigns(releaseId) })
      qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.readiness(releaseId) })
    },
  })
}

export function useDeleteCampaign(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campaignId: string) => releaseIntelligenceApi.deleteCampaign(campaignId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.campaigns(releaseId) }),
  })
}

export function useReleaseAlerts(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.alerts(id),
    queryFn: () => releaseIntelligenceApi.getAlerts(id),
    enabled: !!id,
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useGenerateAlerts(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => releaseIntelligenceApi.generateAlerts(releaseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.alerts(releaseId) }),
  })
}

export function useResolveAlert(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alertId: string) => releaseIntelligenceApi.resolveAlert(alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.alerts(releaseId) }),
  })
}

export function useReleaseRecommendations(id: string) {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.recs(id),
    queryFn: () => releaseIntelligenceApi.getRecommendations(id),
    enabled: !!id,
  })
}

export function useGenerateRecommendations(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => releaseIntelligenceApi.generateRecs(releaseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.recs(releaseId) }),
  })
}

export function useActionRecommendation(releaseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recId: string) => releaseIntelligenceApi.actionRec(recId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RELEASE_INTEL_KEYS.recs(releaseId) }),
  })
}

export function useReleaseIntelligenceSummary() {
  return useQuery({
    queryKey: RELEASE_INTEL_KEYS.summary(),
    queryFn: () => releaseIntelligenceApi.getSummary(),
    staleTime: 2 * 60 * 1000,
  })
}
