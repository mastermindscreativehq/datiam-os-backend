import { useEffect, useState, useCallback } from 'react'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import ErrorMessage from '../../components/ErrorMessage'
import Modal, { Field, Input, Textarea } from '../../components/Modal'
import Toast from '../../components/Toast'
import { growth, isCriticalError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

function normalise(raw: any): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw
  for (const key of ['data', 'items', 'results']) {
    if (Array.isArray(raw?.[key])) return raw[key]
  }
  return raw ? [raw] : []
}

const EMPTY_GROUP_FORM  = { name: '', description: '' }
const EMPTY_MEMBER_FORM = { fan_id: '', label: '' }

export default function GrowthCRM() {
  const { user } = useAuthStore()
  const canWrite = ['owner', 'admin', 'editor', 'team'].includes(user?.role ?? '')

  const [groups,         setGroups]         = useState<any>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [groupModal,     setGroupModal]     = useState(false)
  const [groupForm,      setGroupForm]      = useState(EMPTY_GROUP_FORM)
  const [submitting,     setSubmitting]     = useState(false)
  const [toast,          setToast]          = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedGroup,  setSelectedGroup]  = useState<Record<string, unknown> | null>(null)
  const [members,        setMembers]        = useState<any>(null)
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberModal,    setMemberModal]    = useState(false)
  const [memberForm,     setMemberForm]     = useState(EMPTY_MEMBER_FORM)
  const [addingMember,   setAddingMember]   = useState(false)

  const fetchGroups = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await growth.crm.groups()
      setGroups(res.data)
    } catch (err: any) {
      if (isCriticalError(err)) setError(err.response?.data?.message || 'Failed to load CRM groups')
      else setGroups([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const fetchMembers = async (groupId: string) => {
    setMembersLoading(true)
    try {
      const res = await growth.crm.members(groupId)
      setMembers(res.data)
    } catch { setMembers([]) }
    finally { setMembersLoading(false) }
  }

  const selectGroup = (row: Record<string, unknown>) => {
    setSelectedGroup(row)
    fetchMembers(String(row.id))
  }

  const handleCreateGroup = async () => {
    if (!groupForm.name) { setToast({ message: 'Name is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { name: groupForm.name.trim() }
      if (groupForm.description) body.description = groupForm.description.trim()
      await growth.crm.createGroup(body)
      setToast({ message: 'Group created', type: 'success' })
      setGroupModal(false); setGroupForm(EMPTY_GROUP_FORM); fetchGroups()
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create group', type: 'error' })
    } finally { setSubmitting(false) }
  }

  const handleAddMember = async () => {
    if (!selectedGroup || !memberForm.fan_id) { setToast({ message: 'Fan ID is required', type: 'error' }); return }
    setAddingMember(true)
    try {
      const body: Record<string, unknown> = { fan_id: memberForm.fan_id.trim() }
      if (memberForm.label) body.label = memberForm.label.trim()
      await growth.crm.addMember(String(selectedGroup.id), body)
      setToast({ message: 'Member added', type: 'success' })
      setMemberModal(false); setMemberForm(EMPTY_MEMBER_FORM)
      fetchMembers(String(selectedGroup.id))
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to add member', type: 'error' })
    } finally { setAddingMember(false) }
  }

  const setGF = (k: keyof typeof EMPTY_GROUP_FORM)  => (e: React.ChangeEvent<any>) => setGroupForm(f => ({ ...f, [k]: e.target.value }))
  const setMF = (k: keyof typeof EMPTY_MEMBER_FORM) => (e: React.ChangeEvent<any>) => setMemberForm(f => ({ ...f, [k]: e.target.value }))

  const groupItems  = normalise(groups)
  const memberItems = normalise(members)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-emerald-400 rounded-full" />
            <h1 className="text-xl font-bold font-mono text-emerald-400 tracking-[0.2em]">GROWTH CRM</h1>
          </div>
          <p className="text-gray-600 text-[11px] font-mono tracking-[0.2em] ml-4">GROWTH OS · FAN GROUPS &amp; SEGMENTS</p>
        </div>
        {canWrite && (
          <button onClick={() => { setGroupForm(EMPTY_GROUP_FORM); setGroupModal(true) }} className="text-[10px] font-mono tracking-widest px-4 py-1.5 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors">
            + CREATE GROUP
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-24"><LoadingSpinner text="LOADING GROUPS..." /></div>}
      {error && <ErrorMessage message={error} onRetry={fetchGroups} />}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Groups panel */}
          <div>
            <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em] mb-3">FAN GROUPS</div>
            {groupItems.length > 0 ? (
              <div className="space-y-2">
                {groupItems.map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => selectGroup(g)}
                    className={`w-full text-left p-4 border rounded transition-all duration-150 ${
                      selectedGroup?.id === g.id
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                        : 'border-[#00ff41]/10 text-gray-400 hover:border-emerald-400/20 hover:bg-emerald-400/5'
                    }`}
                  >
                    <div className="text-[11px] font-mono tracking-[0.15em] mb-1">{g.name}</div>
                    {g.description && <div className="text-[10px] font-mono text-gray-600 truncate">{g.description}</div>}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon="◈" title="No groups" message="No CRM groups created yet." color="cyan" />
            )}
          </div>

          {/* Members panel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono text-gray-600 tracking-[0.2em]">
                {selectedGroup ? `MEMBERS — ${String(selectedGroup.name ?? '').toUpperCase()}` : 'SELECT A GROUP'}
              </div>
              {selectedGroup && canWrite && (
                <button onClick={() => { setMemberForm(EMPTY_MEMBER_FORM); setMemberModal(true) }} className="text-[9px] font-mono tracking-widest px-3 py-1 border border-emerald-400/30 text-emerald-400/70 hover:bg-emerald-400/10 hover:text-emerald-400 rounded transition-colors">
                  + ADD MEMBER
                </button>
              )}
            </div>
            {!selectedGroup && (
              <div className="text-[10px] font-mono text-gray-700 py-12 text-center">SELECT A GROUP TO VIEW MEMBERS</div>
            )}
            {selectedGroup && membersLoading && (
              <div className="flex justify-center py-12"><LoadingSpinner text="LOADING..." /></div>
            )}
            {selectedGroup && !membersLoading && (
              memberItems.length > 0 ? (
                <DataTable data={memberItems} color="cyan" />
              ) : (
                <EmptyState icon="◈" title="No members" message="No members in this group yet." color="cyan" />
              )
            )}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={groupModal} onClose={() => !submitting && setGroupModal(false)} title="CREATE GROUP" subtitle="GROWTH CRM" color="cyan"
        footer={
          <>
            <button onClick={() => setGroupModal(false)} disabled={submitting} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleCreateGroup} disabled={submitting} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {submitting ? 'CREATING...' : 'CREATE GROUP'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Group Name" required><Input value={groupForm.name} onChange={setGF('name')} placeholder="Group name" autoFocus /></Field>
          <Field label="Description"><Textarea value={groupForm.description} onChange={setGF('description')} placeholder="Group description..." rows={3} /></Field>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={memberModal} onClose={() => !addingMember && setMemberModal(false)} title="ADD MEMBER" subtitle="GROWTH CRM" color="cyan"
        footer={
          <>
            <button onClick={() => setMemberModal(false)} disabled={addingMember} className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50">CANCEL</button>
            <button onClick={handleAddMember} disabled={addingMember} className="text-[10px] font-mono tracking-widest px-5 py-2 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50">
              {addingMember ? 'ADDING...' : 'ADD MEMBER'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Fan ID" required><Input value={memberForm.fan_id} onChange={setMF('fan_id')} placeholder="Fan UUID" autoFocus /></Field>
          <Field label="Label"><Input value={memberForm.label} onChange={setMF('label')} placeholder="Optional label (e.g. VIP)" /></Field>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
