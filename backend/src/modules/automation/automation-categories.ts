// Shared automation category map — used by artist-intelligence and
// release-intelligence's manual "POST /:id/automation/:category" dispatch
// endpoints to validate the requested category and resolve it to the event
// name that dispatchEvent() fans out through workflow_registry.

export const AUTOMATION_CATEGORIES = [
  'playlist_pitch',
  'sync_pitch',
  'dj_outreach',
  'blog_outreach',
  'social_scheduling',
  'analytics_updates',
  'campaign_creation',
] as const;

export type AutomationCategory = typeof AUTOMATION_CATEGORIES[number];

export const isAutomationCategory = (value: string): value is AutomationCategory =>
  (AUTOMATION_CATEGORIES as readonly string[]).includes(value);

// campaign_creation reuses the pre-existing Growth OS `campaign.created` event
// verbatim (growth-campaign-events already subscribes) — no new registry row.
export const AUTOMATION_CATEGORY_EVENTS: Record<AutomationCategory, string> = {
  playlist_pitch:     'automation.playlist_pitch.requested',
  sync_pitch:          'automation.sync_pitch.requested',
  dj_outreach:         'automation.dj_outreach.requested',
  blog_outreach:       'automation.blog_outreach.requested',
  social_scheduling:   'automation.social_scheduling.requested',
  analytics_updates:   'automation.analytics_updates.requested',
  campaign_creation:   'campaign.created',
};
