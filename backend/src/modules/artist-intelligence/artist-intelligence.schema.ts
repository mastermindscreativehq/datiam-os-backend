import { z } from 'zod';
import { AUTOMATION_CATEGORIES } from '../automation/automation-categories';

// ── shared field groups ───────────────────────────────────────────────────────

const identityFields = {
  stage_name: z.string().min(1),
  legal_name: z.string().optional(),
  bio: z.string().optional(),
  genre: z.string().optional(),
  genres: z.array(z.string()).optional(),
  country: z.string().optional(),
  countries: z.array(z.string()).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  verified: z.boolean().optional(),
  primary_color: z.string().optional(),
  mood_profile: z.string().optional(),
  profile_image: z.string().url().optional().or(z.literal('')),
  social_links: z.record(z.string()).optional(),
  catalog_status: z.enum(['active', 'inactive', 'archived']).optional(),
  is_active: z.boolean().optional(),
};

const businessFields = {
  management_company: z.string().optional(),
  management_contact_name: z.string().optional(),
  management_contact_email: z.string().email().optional().or(z.literal('')),
  management_contact_phone: z.string().optional(),
  booking_agent: z.string().optional(),
  booking_contact_email: z.string().email().optional().or(z.literal('')),
  booking_contact_phone: z.string().optional(),
  label_name: z.string().optional(),
  publisher_name: z.string().optional(),
  pro_affiliation: z.string().optional(),
  press_contact_email: z.string().email().optional().or(z.literal('')),
};

const distributionFields = {
  distributor_name: z.string().optional(),
  distributor_artist_id: z.string().optional(),
  primary_territory: z.string().optional(),
  territories: z.array(z.string()).optional(),
};

const rightsFields = {
  ipi_number: z.string().optional(),
  isni_code: z.string().optional(),
  master_rights_owner: z.string().optional(),
  publishing_rights_owner: z.string().optional(),
  rights_notes: z.string().optional(),
};

// ── schemas ───────────────────────────────────────────────────────────────────

export const createArtistIntelligenceSchema = z.object({
  ...identityFields,
  ...businessFields,
  ...distributionFields,
  ...rightsFields,
});

export const updateArtistIntelligenceSchema = createArtistIntelligenceSchema
  .partial()
  .extend({ stage_name: z.string().min(1).optional() });

export const dispatchArtistAutomationSchema = z.object({
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const artistAutomationCategoryParam = z.enum(AUTOMATION_CATEGORIES);

export type CreateArtistIntelligenceInput = z.infer<typeof createArtistIntelligenceSchema>;
export type UpdateArtistIntelligenceInput = z.infer<typeof updateArtistIntelligenceSchema>;
export type DispatchArtistAutomationInput = z.infer<typeof dispatchArtistAutomationSchema>;
