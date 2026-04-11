/**
 * components/RefundManagementPanel.jsx
 * Admin panel: view, approve, and reject donor refund requests.
 *
 * Usage: <RefundManagementPanel />
 * Expects admin token in localStorage under key 'token' or 'admin_token'.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getToken = () => localStorage.getItem('token') || localStorage.getItem('admin_token')

export default function RefundManagementPanel() {
  const [refunds, setRefunds]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [note, setNote]             = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast]           = useState(null) // { msg, type: 'success'|'error' }

  useEffect(() => { fetchRefunds() }, [])

  const fetchRefunds = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/donations/refund-requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setRefunds(data.data || [])
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load refund requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const handleAction = async (action) => {
    if (!selected) return

    if (action === 'reject' && !note.trim()) {
      showToast('Please provide a reason for rejection', 'error')
      return
    }

    setProcessing(true)
    try {
      const { data } = await axios.post(
        `${API}/donations/${selected._id}/process-refund`,
        { action, note: note.trim() },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      showToast(data.message || (action === 'approve' ? 'Refund approved' : 'Refund rejected'), 'success')
      setSelected(null)
      setNote('')
      fetchRefunds()
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to process refund', 'error')
    } finally {
      setProcessing(false)
    }
  }

  // Campaign.deadline is a unix timestamp
  const isCampaignExpired = (deadline) => deadline && deadline < Math.floor(Date.now() / 1000)

  const toastClasses = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    info:    'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Refund Requests</h2>
        <div className="flex items-center gap-2">
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
            {refunds.length} pending
          </span>
          <button
            onClick={fetchRefunds}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`border text-sm px-4 py-3 rounded-xl flex items-center justify-between ${toastClasses[toast.type]}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-3 text-sm">Loading refund requests...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-gray-400 text-sm">No pending refund requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── List ── */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {refunds.map((r) => (
              <div
                key={r._id}
                onClick={() => { setSelected(r); setNote('') }}
                className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                  selected?._id === r._id
                    ? 'border-purple-400 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">
                      {r.campaign?.title || 'Campaign'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.donor?.name} · {r.donor?.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Requested: {new Date(r.refundRequestedAt).toLocaleDateString('en-IN')}
                    </p>
                    {isCampaignExpired(r.campaign?.deadline) && (
                      <span className="inline-block mt-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        Campaign Expired
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold text-red-600 text-sm">₹{r.amount?.toLocaleString('en-IN')}</p>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">UPI</span>
                  </div>
                </div>
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-700 line-clamp-2">"{r.refundReason}"</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Detail / action panel ── */}
          {selected ? (
            <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-4 sticky top-4 self-start">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Process Refund</h3>
                <button
                  onClick={() => { setSelected(null); setNote('') }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕ Close
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                {[
                  ['Donor',          selected.donor?.name],
                  ['Email',          selected.donor?.email],
                  ['Amount',         `₹${selected.amount?.toLocaleString('en-IN')}`],
                  ['Campaign',       selected.campaign?.title],
                  ['Donated on',     new Date(selected.createdAt).toLocaleDateString('en-IN')],
                  ['Payment ID',     selected.razorpayPaymentId || selected.razorpayOrderId || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-right truncate max-w-[200px] font-medium">{value}</span>
                  </div>
                ))}
                {selected.campaign?.deadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Campaign</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isCampaignExpired(selected.campaign.deadline)
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {isCampaignExpired(selected.campaign.deadline) ? 'Expired' : 'Active'}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">Refund reason:</p>
                <p className="text-sm text-yellow-800">"{selected.refundReason}"</p>
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin note{' '}
                  <span className="text-red-500 font-normal">(required for rejection)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note — this will be included in the email to the donor..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none"
                />
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600 space-y-1">
                <p>ℹ️ <strong>Approve:</strong> Initiates Stripe refund + sends approval email to donor</p>
                <p>ℹ️ <strong>Reject:</strong> Sends rejection email with your note to donor</p>
                <p>💰 Money returns to donor's account in 5-7 business days</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('reject')}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? '...' : '✕ Reject'}
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Processing...' : '✓ Approve Refund'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center min-h-[400px] text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-3">👆</p>
                <p className="text-sm font-medium">Select a request to process</p>
                <p className="text-xs mt-1">Click any item on the left</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
