/**
 * CampaignVerificationPanel.jsx
 * Add this panel inside your AdminDashboard.jsx
 * Shows all pending campaigns with their uploaded documents for admin review.
 */

import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  verified:   'bg-green-100  text-green-700  border-green-200',
  rejected:   'bg-red-100    text-red-700    border-red-200',
  unverified: 'bg-gray-100   text-gray-600   border-gray-200',
}

const STATUS_ICONS = {
  pending:    '⏳',
  verified:   '✅',
  rejected:   '❌',
  unverified: '📄',
}

export default function CampaignVerificationPanel() {
  const [campaigns, setCampaigns]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)  // selected campaign for detail view
  const [filter, setFilter]             = useState('pending')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage]           = useState('')

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // ── Fetch campaigns ──────────────────────────────────────────────────────────
  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/campaign-verification/all?status=${filter}`, { headers })
      const data = await res.json()
      setCampaigns(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCampaigns() }, [filter])

  // ── Verify campaign ──────────────────────────────────────────────────────────
  const handleVerify = async (id) => {
    setActionLoading(true)
    try {
      const res  = await fetch(`${API}/campaign-verification/${id}/verify`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ note: 'All documents verified by admin.' }),
      })
      const data = await res.json()
      setMessage(data.message)
      fetchCampaigns()
      setSelected(null)
    } catch (e) { setMessage('Error verifying campaign.') }
    finally { setActionLoading(false) }
  }

  // ── Reject campaign ──────────────────────────────────────────────────────────
  const handleReject = async (id) => {
    if (!rejectReason.trim()) { setMessage('Please enter a rejection reason.'); return }
    setActionLoading(true)
    try {
      const res  = await fetch(`${API}/campaign-verification/${id}/reject`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ reason: rejectReason }),
      })
      const data = await res.json()
      setMessage(data.message)
      setRejectReason('')
      fetchCampaigns()
      setSelected(null)
    } catch (e) { setMessage('Error rejecting campaign.') }
    finally { setActionLoading(false) }
  }

  // ── Verify single document ───────────────────────────────────────────────────
  const handleDocAction = async (campaignId, docId, action, reason = '') => {
    setActionLoading(true)
    try {
      await fetch(`${API}/campaign-verification/${campaignId}/document/${docId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ action, reason }),
      })
      // Refresh selected campaign
      const res  = await fetch(`${API}/campaign-verification/${campaignId}`, { headers })
      const data = await res.json()
      setSelected(data.data)
      fetchCampaigns()
    } catch (e) { setMessage('Error updating document.') }
    finally { setActionLoading(false) }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Campaign Document Verification</h2>
        <div className="flex gap-2">
          {['pending', 'verified', 'rejected', 'unverified'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                filter === s ? STATUS_COLORS[s] : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>
              {STATUS_ICONS[s]} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Campaign List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
              No {filter} campaigns found.
            </div>
          ) : (
            campaigns.map(c => (
              <div key={c._id}
                onClick={() => setSelected(c)}
                className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                  selected?._id === c._id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.category} · by {c.creator?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">{c.creator?.email}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[c.verificationStatus]}`}>
                      {STATUS_ICONS[c.verificationStatus]} {c.verificationStatus}
                    </span>
                    <span className="text-xs text-gray-400">{c.documents?.length || 0} docs</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Campaign Detail / Document Review */}
        {selected ? (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            {/* Campaign info */}
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{selected.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.category} · ₹{selected.goal?.toLocaleString()} goal</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Creator: <strong>{selected.creator?.name}</strong> · {selected.creator?.email}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
              </div>

              {/* Documents */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Uploaded Documents ({selected.documents?.length || 0})
                </p>

                {!selected.documents?.length ? (
                  <div className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">
                    No documents uploaded for this campaign.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.documents.map((doc) => (
                      <div key={doc.docId} className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{doc.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[doc.status]}`}>
                              {STATUS_ICONS[doc.status]} {doc.status}
                            </span>
                          </div>
                          {/* View document */}
                          <a href={`http://localhost:5000${doc.url}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                            View Doc ↗
                          </a>
                        </div>

                        {/* Per-document actions */}
                        {doc.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleDocAction(selected._id, doc.docId, 'verified')}
                              disabled={actionLoading}
                              className="flex-1 text-xs bg-green-600 text-white py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                              ✓ Verify Doc
                            </button>
                            <button
                              onClick={() => handleDocAction(selected._id, doc.docId, 'rejected', 'Document rejected by admin.')}
                              disabled={actionLoading}
                              className="flex-1 text-xs bg-red-500 text-white py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50">
                              ✕ Reject Doc
                            </button>
                          </div>
                        )}

                        {doc.rejectedReason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {doc.rejectedReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overall campaign actions */}
              {selected.verificationStatus === 'pending' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Overall Campaign Decision
                  </p>

                  <button
                    onClick={() => handleVerify(selected._id)}
                    disabled={actionLoading}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 text-sm">
                    {actionLoading ? 'Processing...' : '✅ Verify Entire Campaign'}
                  </button>

                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter rejection reason (required)..."
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-300 resize-none"
                    />
                    <button
                      onClick={() => handleReject(selected._id)}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 text-sm">
                      {actionLoading ? 'Processing...' : '❌ Reject Campaign'}
                    </button>
                  </div>
                </div>
              )}

              {/* Show verification note */}
              {selected.verificationNote && (
                <div className={`text-sm px-4 py-3 rounded-xl border ${
                  selected.verificationStatus === 'verified' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <strong>Admin Note:</strong> {selected.verificationNote}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 min-h-[300px]">
            <div className="text-center">
              <p className="text-3xl mb-2">👆</p>
              <p className="text-sm">Select a campaign to review documents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
