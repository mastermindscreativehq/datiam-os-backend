import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
})
import Login from './pages/Login'
import ProtectedLayout from './layouts/ProtectedLayout'
import Dashboard from './pages/Dashboard'
import Artists from './pages/Artists'
import FanIntelligence from './pages/FanIntelligence'
import Catalog from './pages/Catalog'
import Releases from './pages/Releases'
import SyncPitches from './pages/SyncPitches'
import RoyaltySources from './pages/RoyaltySources'
import ContentIdeas from './pages/ContentIdeas'
import AutomationRuns from './pages/AutomationRuns'
import Activity from './pages/Activity'
import MusicIntelligence from './pages/MusicIntelligence'
import SonicWorld from './pages/SonicWorld'
import SonicMemory from './pages/SonicMemory'
import SonicDirector from './pages/SonicDirector'
import SonicExecution from './pages/SonicExecution'
import AudioUpload from './pages/AudioUpload'
import AudioDNA from './pages/AudioDNA'
import MoodAnalysis from './pages/MoodAnalysis'
import GenreIntelligence from './pages/GenreIntelligence'
import SyncIntelligence from './pages/SyncIntelligence'
import PlacementOpportunities from './pages/PlacementOpportunities'
import SuitabilityMatrix from './pages/SuitabilityMatrix'
import CommercialIntelligence from './pages/CommercialIntelligence'
import AdminDiagnostics from './pages/AdminDiagnostics'
import OutreachCampaigns from './pages/OutreachCampaigns'
import ReplyIntelligence from './pages/ReplyIntelligence'
import MeetingIntelligence from './pages/MeetingIntelligence'
import DealIntelligence from './pages/DealIntelligence'
import ContractIntelligence from './pages/ContractIntelligence'
import PaymentIntelligence from './pages/PaymentIntelligence'
import MissionControl from './pages/MissionControl'
import ReleaseIntelligence from './pages/ReleaseIntelligence'
import AutomationDashboard from './pages/AutomationDashboard'
import CatalogArtists from './pages/catalog/CatalogArtists'
import CatalogArtistDetail from './pages/catalog/CatalogArtistDetail'
import CatalogSongs from './pages/catalog/CatalogSongs'
import CatalogSongDetail from './pages/catalog/CatalogSongDetail'
import CatalogReleases from './pages/catalog/CatalogReleases'
import CatalogReleaseDetail from './pages/catalog/CatalogReleaseDetail'
import GrowthHub from './pages/growth/GrowthHub'
import GrowthContent from './pages/growth/GrowthContent'
import GrowthCampaigns from './pages/growth/GrowthCampaigns'
import GrowthSocial from './pages/growth/GrowthSocial'
import GrowthPublishing from './pages/growth/GrowthPublishing'
import GrowthAnalytics from './pages/growth/GrowthAnalytics'
import GrowthTrends from './pages/growth/GrowthTrends'
import GrowthCRM from './pages/growth/GrowthCRM'
import GrowthAI from './pages/growth/GrowthAI'
import GrowthNotifications from './pages/growth/GrowthNotifications'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/mission-control" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="mission-control" element={<MissionControl />} />
          <Route path="artists" element={<Artists />} />
          <Route path="fan-intelligence" element={<FanIntelligence />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="releases" element={<Releases />} />
          <Route path="sync-pitches" element={<SyncPitches />} />
          <Route path="royalty-sources" element={<RoyaltySources />} />
          <Route path="content-ideas" element={<ContentIdeas />} />
          <Route path="automation-runs" element={<AutomationRuns />} />
          <Route path="activity" element={<Activity />} />
          <Route path="music-intelligence" element={<MusicIntelligence />} />
          <Route path="sonic-world" element={<SonicWorld />} />
          <Route path="sonic-memory" element={<SonicMemory />} />
          <Route path="sonic-director" element={<SonicDirector />} />
          <Route path="sonic-execution" element={<SonicExecution />} />
          <Route path="audio-upload" element={<AudioUpload />} />
          {/* DATIAM Intelligence Phase 1 */}
          <Route path="audio-dna" element={<AudioDNA />} />
          <Route path="mood-analysis" element={<MoodAnalysis />} />
          <Route path="genre-intelligence" element={<GenreIntelligence />} />
          <Route path="sync-intelligence" element={<SyncIntelligence />} />
          <Route path="placement-opportunities" element={<PlacementOpportunities />} />
          <Route path="suitability-matrix" element={<SuitabilityMatrix />} />
          {/* DATIAM OS v4 — Commercial Intelligence Engine */}
          <Route path="commercial-intelligence" element={<CommercialIntelligence />} />
          {/* System */}
          <Route path="admin/diagnostics" element={<AdminDiagnostics />} />
          {/* DATIAM Intelligence Engines */}
          <Route path="outreach" element={<OutreachCampaigns />} />
          <Route path="reply-intelligence" element={<ReplyIntelligence />} />
          <Route path="meeting-intelligence" element={<MeetingIntelligence />} />
          <Route path="deal-intelligence" element={<DealIntelligence />} />
          <Route path="contract-intelligence" element={<ContractIntelligence />} />
          <Route path="payment-intelligence" element={<PaymentIntelligence />} />
          <Route path="release-intelligence" element={<ReleaseIntelligence />} />
          <Route path="release-intelligence/:id" element={<ReleaseIntelligence />} />
          {/* DATIAM Automation Layer */}
          <Route path="automation" element={<AutomationDashboard />} />
          {/* DATIAM Artist & Catalog Engine */}
          <Route path="catalog/artists" element={<CatalogArtists />} />
          <Route path="catalog/artists/:id" element={<CatalogArtistDetail />} />
          <Route path="catalog/songs" element={<CatalogSongs />} />
          <Route path="catalog/songs/:id" element={<CatalogSongDetail />} />
          <Route path="catalog/releases" element={<CatalogReleases />} />
          <Route path="catalog/releases/:id" element={<CatalogReleaseDetail />} />
          {/* DATIAM Growth OS */}
          <Route path="growth" element={<GrowthHub />} />
          <Route path="growth/content" element={<GrowthContent />} />
          <Route path="growth/campaigns" element={<GrowthCampaigns />} />
          <Route path="growth/social" element={<GrowthSocial />} />
          <Route path="growth/publishing" element={<GrowthPublishing />} />
          <Route path="growth/analytics" element={<GrowthAnalytics />} />
          <Route path="growth/trends" element={<GrowthTrends />} />
          <Route path="growth/crm" element={<GrowthCRM />} />
          <Route path="growth/ai" element={<GrowthAI />} />
          <Route path="growth/notifications" element={<GrowthNotifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/mission-control" replace />} />
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
