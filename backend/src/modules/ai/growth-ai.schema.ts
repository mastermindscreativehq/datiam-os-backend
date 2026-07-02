import { z } from 'zod';

export const generateCaptionSchema = z.object({
  content_id: z.string().uuid(),
  platform_slug: z.string().min(1),
});

export const generateHashtagsSchema = z.object({
  content_id: z.string().uuid(),
  platform_slug: z.string().min(1),
});

export const generateCtaSchema = z.object({
  content_id: z.string().uuid(),
  platform_slug: z.string().min(1),
  goal: z.string().min(1),
});

export const generateCampaignBriefSchema = z.object({
  campaign_id: z.string().uuid(),
  artist_id: z.string().uuid(),
});

export const generateRetrospectiveSchema = z.object({
  campaign_id: z.string().uuid(),
});

export const generateTrendIdeaSchema = z.object({
  trend_id: z.string().uuid(),
  artist_id: z.string().uuid(),
});

export const generateGrowthReportSchema = z.object({
  artist_id: z.string().uuid(),
  period: z.string().min(1),
});

export const generateScheduleSchema = z.object({
  artist_id: z.string().uuid(),
  platform_slug: z.string().min(1),
});

export const generateContentCalendarSchema = z.object({
  artist_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  days: z.number().int().min(7).max(30).default(14),
  platforms: z.array(z.string().min(1)).min(1).max(6),
});

export const generateAudiencePersonaSchema = z.object({
  artist_id: z.string().uuid(),
});

export const generateCollaborationPitchSchema = z.object({
  artist_id: z.string().uuid(),
  contact_id: z.string().uuid(),
});

export const scoreContentBriefSchema = z.object({
  content_id: z.string().uuid(),
});

export const generateReleaseStrategySchema = z.object({
  campaign_id: z.string().uuid(),
});

export const enrichContentIdeaSchema = z.object({
  content_id: z.string().uuid(),
  platform_slug: z.string().min(1),
});
