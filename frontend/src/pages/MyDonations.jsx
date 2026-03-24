/**
 * pages/MyDonations.jsx
 * Shows user's donation history with refund request option.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_CONFIG = {
  created:          { label: 'Pending',          color: 'bg-gray-100 text-gray-600'     },
  paid:             { label: 'Paid',              color: 'bg-green-100 text-green-700'   },
  failed:           { label: 'Failed',            color: 'bg-red-100 text-red-600'       },
  refund_requested: { label: 'Refund Requested',  color: 'bg-yellow-100 text-yellow-700' },
  refunded:         { label: 'Refunded',          color: 'bg-blue-100 text-blue-700'     },
  refund_rejected:  { label: 'Refund Rejected',   color: 'bg-red-100 text-red-600'       },
}

export default function MyDonations() {
  const [donations, setDonations]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [refundModal, setRefundModal]   = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [message, setMessage]           = useState('')

  // ── Use correct token key ─────────────────────────────────────────────────
  const token   = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchDonations() }, [])

  const fetchDonations = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/donations/my`, { headers })
      setDonations(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) return
    setSubmitting(true)
    try {
      await axios.post(
        `${API}/donations/${refundModal._id}/refund-request`,
        { reason: refundReason },
        { headers }
      )
      setMessage('Refund request submitted successfully!')
      setRefundModal(null)
      setRefundReason('')
      fetchDonations()
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to submit refund request.')
    } finally {
      setSubmitting(false)
    }
  }

  const canRequestRefund = (donation) => {
    if (donation.status !== 'paid') return false
    if (donation.paymentMethod !== 'upi') return false
    const days = (Date.now() - new Date(donation.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return days <= 7
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Donations</h1>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl mb-4">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-blue-400">✕</button>
        </div>
      )}

      {donations.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">💜</p>
          <p>You haven't made any donations yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((d) => {
            const status = STATUS_CONFIG[d.status] || STATUS_CONFIG.created
            return (
              <div key={d._id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {d.campaign?.title || 'Unknown Campaign'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(d.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">
                      ₹{d.amount?.toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Payment method badge */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                    💳 UPI / Card
                  </span>
                  {d.message && (
                    <p className="text-xs text-gray-400 italic truncate max-w-xs">"{d.message}"</p>
                  )}
                </div>

                {/* Refund status info */}
                {d.status === 'refund_requested' && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                    ⏳ Refund requested on {new Date(d.refundRequestedAt).toLocaleDateString()}
                    <br />Reason: {d.refundReason}
                  </div>
                )}
                {d.status === 'refunded' && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                    ✓ Refunded on {new Date(d.refundProcessedAt).toLocaleDateString()}
                    {d.refundNote && <><br />Note: {d.refundNote}</>}
                  </div>
                )}
                {d.status === 'refund_rejected' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                    ✕ Refund rejected: {d.refundNote || 'No reason provided'}
                  </div>
                )}

                {/* Refund button */}
                {canRequestRefund(d) && (
                  <button onClick={() => setRefundModal(d)}
                    className="mt-3 text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    Request Refund
                  </button>
                )}
                {d.paymentMethod === 'upi' && d.status === 'paid' && !canRequestRefund(d) && (
                  <p className="mt-2 text-xs text-gray-400">Refund window expired (7 days)</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Request Refund</h3>

            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Campaign</span>
                <span className="font-medium text-right max-w-[200px] truncate">{refundModal.campaign?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-medium text-red-600">₹{refundModal.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Donated on</span>
                <span>{new Date(refundModal.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for refund <span className="text-red-500">*</span>
              </label>
              <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please explain why you want a refund..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-300 resize-none" />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠ Refunds are processed within 2-3 business days after admin review.
              Refunds are only available within 7 days of donation.
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setRefundModal(null); setRefundReason('') }}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleRefundRequest} disabled={submitting || !refundReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
