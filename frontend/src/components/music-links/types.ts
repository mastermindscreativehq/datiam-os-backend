// Types mirror the Music Links Hub backend exactly (migration 0051,
// /api/music-links) — see backend/src/modules/music-links/*. Do not add
// fields here that the backend doesn't actually return.

export const MUSIC_LINK_CATEGORIES = [
  'music_platform',
  'social_media',
  'smart_link',
  'pre_save',
  'business',
  'distribution',
  'other',
] as const

export type MusicLinkCategory = typeof MUSIC_LINK_CATEGORIES[number]

export const MUSIC_LINK_CATEGORY_LABELS: Record<MusicLinkCategory, string> = {
  music_platform: 'Music Platforms',
  social_media: 'Social Media',
  smart_link: 'Smart Links',
  pre_save: 'Pre-Save Links',
  business: 'Business',
  distribution: 'Distribution',
  other: 'Other',
}

export interface MusicLink {
  id: string
  artist_id: string | null
  release_id: string | null
  link_category: MusicLinkCategory
  platform: string
  url: string
  label: string | null
  is_primary: boolean
  is_active: boolean
  click_count: number
  territory: string | null
  display_order: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type GroupedMusicLinks = Record<MusicLinkCategory, MusicLink[]>
