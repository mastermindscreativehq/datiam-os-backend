import { z } from 'zod';

const dspEnum = z.enum(['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'tidal', 'deezer', 'other']);

export const createIdentifierSchema = z.object({
  song_id: z.string().uuid().optional(),
  release_id: z.string().uuid().optional(),
  identifier_type: z.enum(['isrc', 'upc', 'iswc', 'catalog_number']),
  value: z.string().min(1),
  assigned_by: z.string().optional(),
});

export const createDeliverySchema = z.object({
  release_id: z.string().uuid(),
  song_id: z.string().uuid().optional(),
  dsp: dspEnum,
  format: z.string().optional(),
  external_id: z.string().optional(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['pending', 'delivered', 'failed', 'taken_down', 'redelivering']),
});

export const addTerritorySchema = z.object({
  delivery_id: z.string().uuid(),
  territory_code: z.string().length(2),
  status: z.enum(['available', 'unavailable', 'pending']).default('pending'),
});

export const updateTerritoryStatusSchema = z.object({
  status: z.enum(['available', 'unavailable', 'pending']),
});

export const requestTakedownSchema = z.object({
  delivery_id: z.string().uuid(),
  reason: z.string().optional(),
});

export const updateTakedownStatusSchema = z.object({
  status: z.enum(['requested', 'in_progress', 'completed', 'failed']),
});

export const upsertHealthSchema = z.object({
  release_id: z.string().uuid(),
  overall_status: z.enum(['healthy', 'degraded', 'failing']),
  details: z.record(z.unknown()).optional(),
});

export const logDeliveryEventSchema = z.object({
  delivery_id: z.string().uuid(),
  event_type: z.string().min(1),
  message: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type CreateIdentifierInput = z.infer<typeof createIdentifierSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type AddTerritoryInput = z.infer<typeof addTerritorySchema>;
export type UpdateTerritoryStatusInput = z.infer<typeof updateTerritoryStatusSchema>;
export type RequestTakedownInput = z.infer<typeof requestTakedownSchema>;
export type UpdateTakedownStatusInput = z.infer<typeof updateTakedownStatusSchema>;
export type UpsertHealthInput = z.infer<typeof upsertHealthSchema>;
export type LogDeliveryEventInput = z.infer<typeof logDeliveryEventSchema>;
