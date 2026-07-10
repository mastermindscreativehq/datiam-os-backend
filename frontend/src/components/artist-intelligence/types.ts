// Types mirror the Artist Intelligence backend exactly (migration 0051,
// /api/artist-intelligence) — see backend/src/modules/artist-intelligence/*.
// Do not add fields here that the backend doesn't actually return.

import type { GroupedMusicLinks } from '../music-links/types'

export interface ArtistProfile {
  id: string
  stage_name: string
  legal_name: string | null
  bio: string | null
  genre: string | null
  genres: string[] | null
  country: string | null
  countries: string[] | null
  city: string | null
  region: string | null
  verified: boolean
  primary_color: string | null
  mood_profile: string | null
  profile_image: string | null
  social_links: Record<string, string> | null
  catalog_status: string | null
  is_active: boolean
  // Business metadata
  management_company: string | null
  management_contact_name: string | null
  management_contact_email: string | null
  management_contact_phone: string | null
  booking_agent: string | null
  booking_contact_email: string | null
  booking_contact_phone: string | null
  label_name: string | null
  publisher_name: string | null
  pro_affiliation: string | null
  press_contact_email: string | null
  // Distribution
  distributor_name: string | null
  distributor_artist_id: string | null
  primary_territory: string | null
  territories: string[] | null
  // Rights management
  ipi_number: string | null
  isni_code: string | null
  master_rights_owner: string | null
  publishing_rights_owner: string | null
  rights_notes: string | null
  created_at: string
  updated_at: string
}

export interface ArtistRelease {
  id: string
  release_title: string
  release_type: string
  music_status: string
  release_date: string | null
  cover_art_url: string | null
}

export interface ArtistIntelligenceSnapshot {
  profile: ArtistProfile
  links: GroupedMusicLinks
  releases: ArtistRelease[]
  stats: { song_count: number; release_count: number }
}

export const AUTOMATION_CATEGORIES = [
  'playlist_pitch',
  'sync_pitch',
  'dj_outreach',
  'blog_outreach',
  'social_scheduling',
  'analytics_updates',
  'campaign_creation',
] as const

export type AutomationCategory = typeof AUTOMATION_CATEGORIES[number]

export const AUTOMATION_CATEGORY_LABELS: Record<AutomationCategory, string> = {
  playlist_pitch: 'Playlist Pitching',
  sync_pitch: 'Sync Pitching',
  dj_outreach: 'DJ Outreach',
  blog_outreach: 'Blog Outreach',
  social_scheduling: 'Social Scheduling',
  analytics_updates: 'Analytics Update',
  campaign_creation: 'Campaign Creation',
}

export type ArtistIntelTabKey = 'overview' | 'platforms' | 'business' | 'distribution' | 'releases' | 'automation'

export interface ArtistIntelTab {
  key: ArtistIntelTabKey
  label: string
}

export const ARTIST_INTEL_TABS: ArtistIntelTab[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'platforms', label: 'Platforms & Links' },
  { key: 'business', label: 'Business & Rights' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'releases', label: 'Releases' },
  { key: 'automation', label: 'Automation' },
]
