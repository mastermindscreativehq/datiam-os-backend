import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  generateCaptionSchema,
  generateHashtagsSchema,
  generateCtaSchema,
  generateCampaignBriefSchema,
  generateRetrospectiveSchema,
  generateTrendIdeaSchema,
  generateGrowthReportSchema,
  generateScheduleSchema,
  generateContentCalendarSchema,
  generateAudiencePersonaSchema,
  generateCollaborationPitchSchema,
  scoreContentBriefSchema,
  generateReleaseStrategySchema,
  enrichContentIdeaSchema,
} from './growth-ai.schema';
import * as ctrl from './growth-ai.controller';

const router = Router();

router.use(authenticate);

const canUse = requireRole('owner', 'admin', 'editor', 'team');

router.post('/caption',               canUse, validate(generateCaptionSchema),       ctrl.generateCaption);
router.post('/hashtags',              canUse, validate(generateHashtagsSchema),      ctrl.generateHashtags);
router.post('/cta',                   canUse, validate(generateCtaSchema),           ctrl.generateCta);
router.post('/campaign-brief',        canUse, validate(generateCampaignBriefSchema), ctrl.generateCampaignBrief);
router.post('/campaign-retrospective',canUse, validate(generateRetrospectiveSchema), ctrl.generateRetrospective);
router.post('/trend-content-idea',    canUse, validate(generateTrendIdeaSchema),     ctrl.generateTrendIdea);
router.post('/growth-report',         canUse, validate(generateGrowthReportSchema),  ctrl.generateGrowthReport);
router.post('/posting-schedule',      canUse, validate(generateScheduleSchema),      ctrl.generatePostingSchedule);
router.post('/content-calendar',      canUse, validate(generateContentCalendarSchema),      ctrl.generateContentCalendar);
router.post('/audience-persona',      canUse, validate(generateAudiencePersonaSchema),      ctrl.generateAudiencePersona);
router.post('/collaboration-pitch',   canUse, validate(generateCollaborationPitchSchema),   ctrl.generateCollaborationPitch);
router.post('/score-content',         canUse, validate(scoreContentBriefSchema),            ctrl.scoreContent);
router.post('/release-strategy',      canUse, validate(generateReleaseStrategySchema),      ctrl.generateReleaseStrategy);
router.post('/enrich-content',        canUse, validate(enrichContentIdeaSchema),            ctrl.enrichContent);

export default router;
