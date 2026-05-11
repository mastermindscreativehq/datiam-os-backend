import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="artists" element={<Artists />} />
          <Route path="fan-intelligence" element={<FanIntelligence />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="releases" element={<Releases />} />
          <Route path="sync-pitches" element={<SyncPitches />} />
          <Route path="royalty-sources" element={<RoyaltySources />} />
          <Route path="content-ideas" element={<ContentIdeas />} />
          <Route path="automation-runs" element={<AutomationRuns />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
