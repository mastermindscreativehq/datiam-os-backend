import { useState, useEffect } from 'react'
import { artists as artistsApi, syncIntelligence as syncApi, commercialIntelligence as ciApi } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import CommercialPlacementPotential from '../components/commercial-intelligence/CommercialPlacementPotential'
import WhyEngine from '../components/commercial-intelligence/WhyEngine'
import ExecutiveSyncAssessment from '../components/commercial-intelligence/ExecutiveSyncAssessment'
import MarketAlignmentCard from '../components/commercial-intelligence/MarketAlignmentCard'
import RevenueForecast from '../components/commercial-intelligence/RevenueForecast'
import ComparableArtists from '../components/commercial-intelligence/ComparableArtists'
import SyncRiskAssessment from '../components/commercial-intelligence/SyncRiskAssessment'
import DecisionEngine from '../components/commercial-intelligence/DecisionEngine'
import DatiamVerdict from '../components/commercial-intelligence/DatiamVerdict'
import SyncReadinessScores from '../components/commercial-intelligence/SyncReadinessScores'
import MarketHeatmap from '../components/commercial-intelligence/MarketHeatmap'
import RevenueTierForecast from '../components/commercial-intelligence/RevenueTierForecast'
import ProspectDiscoveryTable from '../components/commercial-intelligence/ProspectDiscoveryTable'
import VerdictV2Card from '../components/commercial-intelligence/VerdictV2Card'
import ExecutiveReportV2 from '../components/commercial-intelligence/ExecutiveReportV2'

interface Artist { id: string; stage_name: string }

interface SyncRecord {
  id: string
  upload_id: string
  file_name?: string
  overallSyncScore: number | null
  topCategories: string[] | null
}

interface CommercialReport {
  uploadId: string
  fileName: string | null
  overallSyncScore: number
  generatedAt: string
  whyScores: any[]
  executiveSyncAssessment: any
  commercialPlacementPotential: any
  marketAlignment: any[]
  revenueForecast: any[]
  comparableArtists: any[]
  syncRiskAssessment: any
  decisionEngine: any
  datiamVerdict: any
  // V2
  syncReadinessScores: any
  marketMatches: any[]
  revenueTierForecast: any
  prospectDiscovery: any
  executiveReportV2: any
}

const TABS = [
  { key: 'overview',   label: 'Overview' },
  { key: 'readiness',  label: 'Sync Readiness' },
  { key: 'markets',    label: 'Market Match' },
  { key: 'revenue',    label: 'Revenue Forecast' },
  { key: 'prospects',  label: 'Prospects' },
  { key: 'executive',  label: 'Executive Report' },
  { key: 'why',        label: 'Why Engine' },
  { key: 'risk',       label: 'Risk Panel' },
  { key: 'artists',    label: 'Artists' },
  { key: 'actions',    label: 'Actions' },
]

function ScoreKpi({ label, value, unit = '', color = 'text-cyan-400' }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
      <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}{unit}</div>
    </div>
  )
}

export default function CommercialIntelligence() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState('')
  const [records, setRecords] = useState<SyncRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<SyncRecord | null>(null)
  const [report, setReport] = useState<CommercialReport | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    artistsApi.list().then(r => {
      const list: Artist[] = r.data?.data ?? r.data ?? []
      setArtists(list)
      if (list.length > 0) setSelectedArtist(list[0].id)
    }).catch(() => setError('Failed to load artists'))
  }, [])

  useEffect(() => {
    if (!selectedArtist) return
    setLoading(true)
    setReport(null)
    setSelectedRecord(null)
    syncApi.byArtist(selectedArtist)
      .then(r => {
        const list: SyncRecord[] = r.data?.data ?? []
        setRecords(list)
        if (list.length > 0) setSelectedRecord(list[0])
      })
      .catch(() => setError('Failed to load sync records'))
      .finally(() => setLoading(false))
  }, [selectedArtist])

  useEffect(() => {
    if (!selectedRecord) return
    setReportLoading(true)
    setReport(null)
    ciApi.get(selectedRecord.upload_id)
      .then(r => setReport(r.data?.data ?? null))
      .catch(err => {
        const msg = err.response?.data?.error ?? 'Failed to generate commercial intelligence report'
        setError(msg)
      })
      .finally(() => setReportLoading(false))
  }, [selectedRecord])

  const trackName = selectedRecord?.file_name
    ?? (selectedRecord ? `Track ${selectedRecord.upload_id.slice(0, 8)}…` : '—')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Music Intelligence
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            Sync Readiness · Market Matching · Revenue Forecast · Prospect Discovery · DATIAM Verdict™
          </p>
        </div>
        <select
          value={selectedArtist}
          onChange={e => setSelectedArtist(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
        >
          {artists.map(a => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-500 text-xs mt-1 underline">Dismiss</button>
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">◈</div>
          <p className="text-lg font-mono">No sync analyses found.</p>
          <p className="text-sm mt-2">Upload a track → Run Audio DNA → Run Sync Intelligence to generate music intelligence.</p>
        </div>
      )}

      {records.length > 0 && (
        <div className="grid grid-cols-12 gap-6">
          {/* Track selector */}
          <div className="col-span-3 space-y-2">
            <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest px-1 mb-3">
              Select Track
            </div>
            {records.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRecord(r)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedRecord?.id === r.id
                    ? 'bg-cyan-900/20 border-cyan-600/50 shadow-[0_0_10px_rgba(6,182,212,0.08)]'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-200 text-xs font-medium truncate">
                    {r.file_name ?? r.upload_id.slice(0, 10) + '…'}
                  </span>
                  <span className={`text-xs font-bold font-mono ml-2 flex-shrink-0 ${(r.overallSyncScore ?? 0) >= 65 ? 'text-cyan-400' : (r.overallSyncScore ?? 0) >= 45 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {r.overallSyncScore?.toFixed(0) ?? '—'}
                  </span>
                </div>
                <div className="text-gray-600 text-[10px] mt-1 font-mono truncate">
                  {(r.topCategories ?? []).slice(0, 2).map(c => c.replace(/_/g, ' ')).join(' · ')}
                </div>
              </button>
            ))}
          </div>

          {/* Main panel */}
          <div className="col-span-9">
            {reportLoading && (
              <div className="flex items-center justify-center py-20 bg-gray-900/30 rounded-xl border border-gray-800">
                <div className="text-center">
                  <LoadingSpinner />
                  <p className="text-gray-500 text-xs font-mono mt-4 tracking-widest">
                    GENERATING MUSIC INTELLIGENCE…
                  </p>
                </div>
              </div>
            )}

            {!reportLoading && !report && selectedRecord && (
              <div className="flex items-center justify-center py-20 bg-gray-900/30 rounded-xl border border-gray-800">
                <p className="text-gray-500 text-sm font-mono">Select a track to generate intelligence report</p>
              </div>
            )}

            {!reportLoading && report && (
              <div className="space-y-5">
                {/* Track header + KPI bar */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Analyzing Track</div>
                      <h2 className="text-lg font-bold text-white">{report.fileName ?? trackName}</h2>
                    </div>
                    <div className="text-[10px] font-mono text-gray-600">
                      Generated {new Date(report.generatedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* KPI bar */}
                  <div className="grid grid-cols-5 gap-2">
                    <ScoreKpi label="Sync Score" value={report.overallSyncScore.toFixed(0)} />
                    <ScoreKpi
                      label="Readiness"
                      value={report.syncReadinessScores?.overallReadiness ?? '—'}
                      color={report.syncReadinessScores?.overallReadiness >= 65 ? 'text-green-400' : 'text-yellow-400'}
                    />
                    <ScoreKpi
                      label="Top Market"
                      value={`${report.marketMatches?.[0]?.matchScore ?? '—'}%`}
                      color="text-purple-400"
                    />
                    <ScoreKpi
                      label="Outlook"
                      value={report.datiamVerdict?.commercialOutlook ?? '—'}
                      color={
                        report.datiamVerdict?.commercialOutlook === 'Exceptional' ? 'text-cyan-400' :
                        report.datiamVerdict?.commercialOutlook === 'Strong' ? 'text-green-400' :
                        report.datiamVerdict?.commercialOutlook === 'Moderate' ? 'text-yellow-400' :
                        'text-orange-400'
                      }
                    />
                    <ScoreKpi
                      label="Confidence"
                      value={`${report.datiamVerdict?.confidenceScore ?? '—'}%`}
                      color="text-gray-300"
                    />
                  </div>

                  {/* Placement potential always visible */}
                  <CommercialPlacementPotential
                    score={report.commercialPlacementPotential.score}
                    classification={report.commercialPlacementPotential.classification}
                    description={report.commercialPlacementPotential.description}
                    colorKey={report.commercialPlacementPotential.colorKey}
                  />
                </div>

                {/* Tab navigation */}
                <div className="border-b border-gray-800">
                  <div className="flex gap-1 overflow-x-auto pb-px">
                    {TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-shrink-0 px-3 py-2 text-[10px] font-mono tracking-wider border-b-2 transition-colors ${
                          activeTab === tab.key
                            ? 'border-cyan-500 text-cyan-400'
                            : 'border-transparent text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {tab.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div className="min-h-[400px]">

                  {activeTab === 'overview' && (
                    <div className="space-y-5">
                      <DatiamVerdict
                        commercialOutlook={report.datiamVerdict.commercialOutlook}
                        bestOpportunity={report.datiamVerdict.bestOpportunity}
                        bestRevenuePath={report.datiamVerdict.bestRevenuePath}
                        bestAudience={report.datiamVerdict.bestAudience}
                        syncReadiness={report.datiamVerdict.syncReadiness}
                        recommendation={report.datiamVerdict.recommendation}
                        executiveSummary={report.datiamVerdict.executiveSummary}
                        confidenceScore={report.datiamVerdict.confidenceScore}
                      />
                      {report.datiamVerdict?.strengthFactors && (
                        <VerdictV2Card
                          strengthFactors={report.datiamVerdict.strengthFactors}
                          riskFactors={report.datiamVerdict.riskFactors}
                          recommendedActions={report.datiamVerdict.recommendedActions}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'readiness' && report.syncReadinessScores && (
                    <SyncReadinessScores scores={report.syncReadinessScores} />
                  )}

                  {activeTab === 'markets' && (
                    <div className="space-y-5">
                      {report.marketMatches?.length > 0 && (
                        <MarketHeatmap matches={report.marketMatches} />
                      )}
                      <div className="border-t border-gray-800 pt-5">
                        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-3">Legacy Market Alignment</div>
                        <MarketAlignmentCard alignments={report.marketAlignment} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'revenue' && (
                    <div className="space-y-5">
                      {report.revenueTierForecast && (
                        <RevenueTierForecast forecast={report.revenueTierForecast} />
                      )}
                      <div className="border-t border-gray-800 pt-5">
                        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-3">Category Revenue Breakdown</div>
                        <RevenueForecast forecasts={report.revenueForecast} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'prospects' && report.prospectDiscovery && (
                    <ProspectDiscoveryTable prospects={report.prospectDiscovery} />
                  )}

                  {activeTab === 'executive' && (
                    <div className="space-y-5">
                      {report.executiveReportV2 && (
                        <ExecutiveReportV2 report={report.executiveReportV2} />
                      )}
                      <div className="border-t border-gray-800 pt-5">
                        <ExecutiveSyncAssessment
                          headline={report.executiveSyncAssessment.headline}
                          body={report.executiveSyncAssessment.body}
                          primaryOpportunities={report.executiveSyncAssessment.primaryOpportunities}
                          supervisorVerdict={report.executiveSyncAssessment.supervisorVerdict}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'why' && (
                    <WhyEngine whyScores={report.whyScores} />
                  )}

                  {activeTab === 'risk' && (
                    <SyncRiskAssessment
                      overallRisk={report.syncRiskAssessment.overallRisk}
                      riskScore={report.syncRiskAssessment.riskScore}
                      factors={report.syncRiskAssessment.factors}
                      recommendation={report.syncRiskAssessment.recommendation}
                    />
                  )}

                  {activeTab === 'artists' && (
                    <ComparableArtists artists={report.comparableArtists} />
                  )}

                  {activeTab === 'actions' && (
                    <DecisionEngine
                      actions={report.decisionEngine.actions}
                      primaryFocus={report.decisionEngine.primaryFocus}
                      strategyType={report.decisionEngine.strategyType}
                    />
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
