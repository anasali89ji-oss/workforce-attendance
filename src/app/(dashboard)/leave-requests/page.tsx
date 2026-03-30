'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface LeaveReq { id: string; start_date: string; end_date: string; days_count: number; reason?: string; status: string; created_at: string; rejection_reason?: string; employee?: { first_name: string; last_name: string; avatar_url?: string }; leave_type?: { name: string; color: string } }
interface LeaveType { id: string; name: string; code: string; color: string; days_per_year: number }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all'|'pending'|'approved'|'rejected'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    const [reqRes, typeRes] = await Promise.all([
      fetch('/api/leave-requests'),
      fetch('/api/leave-requests/types'),
    ])
    const reqJson = await reqRes.json()
    const typeJson = await typeRes.json()
    if (reqJson.data) setRequests(reqJson.data)
    if (typeJson.data) { setLeaveTypes(typeJson.data); if (typeJson.data[0]) setForm(f => ({ ...f, leave_type_id: typeJson.data[0].id })) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = requests.filter(r => tab === 'all' || r.status === tab)

  const apply = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) { toast.error('Fill all required fields'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error); return }
      toast.success('Leave request submitted!')
      setShowForm(false)
      setForm(f => ({ ...f, start_date: '', end_date: '', reason: '' }))
      await load()
    } finally { setSubmitting(false) }
  }

  const action = async (id: string, act: string, extra?: Record<string, string>) => {
    const res = await fetch('/api/leave-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: act, ...extra }) })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`Request ${act}d`)
    setRejectingId(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all text-sm">
          + Apply for Leave
        </button>
      </div>

      {/* Apply form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">New Leave Request</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))}>
                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.days_per_year} days/yr)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={apply} disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm">{submitting ? 'Submitting...' : 'Submit Request'}</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['all','pending','approved','rejected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3.5 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              {t} {t !== 'all' && <span className="ml-1 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{requests.filter(r => r.status === t).length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No {tab === 'all' ? '' : tab} leave requests</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(req => (
              <div key={req.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                      {req.employee?.first_name?.[0]}{req.employee?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {req.employee?.first_name} {req.employee?.last_name}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: req.leave_type?.color + '20', color: req.leave_type?.color }}>
                          {req.leave_type?.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()} · {req.days_count} day{req.days_count !== 1 ? 's' : ''}
                      </div>
                      {req.reason && <div className="text-xs text-gray-400 mt-1">"{req.reason}"</div>}
                      {req.rejection_reason && <div className="text-xs text-red-500 mt-1">Rejected: {req.rejection_reason}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[req.status]}`}>{req.status}</span>
                    {req.status === 'pending' && (
                      <>
                        <button onClick={() => action(req.id, 'approve')} className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-all">Approve</button>
                        <button onClick={() => setRejectingId(req.id)} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-all">Reject</button>
                      </>
                    )}
                  </div>
                </div>
                {rejectingId === req.id && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <button onClick={() => action(req.id, 'reject', { rejection_reason: rejectReason })} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg">Confirm</button>
                    <button onClick={() => setRejectingId(null)} className="px-3 py-1.5 border border-gray-300 text-xs rounded-lg">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
