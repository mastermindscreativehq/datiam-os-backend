import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Modal, { Field, Input, Select, Textarea } from '../components/Modal'
import Toast from '../components/Toast'
import { automationRuns, isCriticalError } from '../api/client'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['automationRuns', 'automation_runs', 'runs', 'items', 'data']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

const STATUS_COLORS: Record<string, string> = {
  running:   'text-[#00d4ff]',
  completed: 'text-[#00ff41]',
  success:   'text-[#00ff41]',
  failed:    'text-red-400',
  pending:   'text-yellow-400',
  queued:    'text-orange-400',
}

const EMPTY_FORM = {
  workflow_name: '',
  source: 'manual' as 'backend' | 'n8n' | 'cron' | 'manual',
  status: 'success' as 'success' | 'failed' | 'running',
  payload: '',
  result: '',
}

export default function AutomationRuns() {
  const [data,       setData]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await automationRuns.list()
      setData(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to load automation runs')
      } else {
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    if (!form.workflow_name.trim()) { setToast({ message: 'Workflow name is required', type: 'error' }); return }

    let parsedPayload: Record<string, unknown> | undefined
    let parsedResult: Record<string, unknown> | undefined

    if (form.payload.trim()) {
      try { parsedPayload = JSON.parse(form.payload) }
      catch { setToast({ message: 'Payload must be valid JSON', type: 'error' }); return }
    }
    if (form.result.trim()) {
      try { parsedResult = JSON.parse(form.result) }
      catch { setToast({ message: 'Result must be valid JSON', type: 'error' }); return }
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        workflow_name: form.workflow_name.trim(),
        source:        form.source,
        status:        form.status,
      }
      if (parsedPayload) body.payload = parsedPayload
      if (parsedResult)  body.result  = parsedResult

      await automationRuns.create(body)
      setModalOpen(false)
      setToast({ message: 'Automation run logged successfully', type: 'success' })
      fetchData()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to log automation run', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const items = normalise(data)

  const statusCounts = items.reduce<Record<string, number>>((acc, item: any) => {
    const s = String(item.status ?? 'unknown').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-orange-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-orange-400 tracking-[0.2em]">
              AUTOMATION RUNS
            </h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">AUTOMATION EXECUTION LOG</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setModalOpen(true) }}
          className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-orange-400/40 text-orange-400 hover:bg-orange-400/10 rounded transition-colors"
        >
          + LOG RUN
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <LoadingSpinner text="LOADING AUTOMATION RUNS..." />
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className={`text-[10px] font-mono border border-current/25 rounded px-3 py-1 tracking-widest ${STATUS_COLORS[status] ?? 'text-gray-500'}`}
                >
                  {status.toUpperCase()} · {count}
                </div>
              ))}
            </div>
          )}

          {items.length > 0 ? (
            <DataTable data={items} color="green" />
          ) : (
            <EmptyState
              icon="◷"
              title="No automation runs yet"
              message="No workflow executions have been recorded."
              hint='Use the LOG RUN button above to manually record an automation run.'
              color="orange"
            />
          )}
        </div>
      )}

      {/* Log Automation Run Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="LOG AUTOMATION RUN"
        subtitle="RECORD WORKFLOW EXECUTION"
        color="orange"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="text-[10px] font-mono tracking-widest px-5 py-2 border border-orange-400/40 text-orange-400 hover:bg-orange-400/10 rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'SAVING...' : 'LOG RUN'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Workflow Name" required>
            <Input
              value={form.workflow_name}
              onChange={set('workflow_name')}
              placeholder="e.g. fan_sync, release_reminder"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Source">
              <Select value={form.source} onChange={set('source')}>
                <option value="manual">MANUAL</option>
                <option value="backend">BACKEND</option>
                <option value="n8n">N8N</option>
                <option value="cron">CRON</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                <option value="success">SUCCESS</option>
                <option value="running">RUNNING</option>
                <option value="failed">FAILED</option>
              </Select>
            </Field>
          </div>

          <Field label="Payload (JSON)" hint="Optional — input data passed to the workflow">
            <Textarea
              value={form.payload}
              onChange={set('payload')}
              placeholder='{"key": "value"}'
              rows={3}
              className="font-mono text-[11px]"
            />
          </Field>

          <Field label="Result (JSON)" hint="Optional — output or response from the workflow">
            <Textarea
              value={form.result}
              onChange={set('result')}
              placeholder='{"status": "ok", "processed": 0}'
              rows={3}
              className="font-mono text-[11px]"
            />
          </Field>
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
