/**
 * RefundManagementPanel.jsx
 * Add inside AdminDashboard to manage refund requests.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function RefundManagementPanel() {
  const [refunds, setRefunds]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [note, setNote]             = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage]       = useState('')

  // ── Use correct token key ─────────────────────────────────────────────────
  const token   = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchRefunds() }, [])

  const fetchRefunds = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/donations/refund-requests`, { headers })
      setRefunds(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action) => {
    setProcessing(true)
    try {
      const { data } = await axios.post(
        `${API}/donations/${selected._id}/process-refund`,
        { action, note },
        { headers }
      )
      setMessage(data.message)
      setSelected(null)
      setNote('')
      fetchRefunds()
    } catch (e) {
      setMessage(e.response?.data?.message || 'Action failed.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Refund Requests</h2>
        <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
          {refunds.length} pending
        </span>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-blue-400">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
          No pending refund requests 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* List */}
          <div className="space-y-3">
            {refunds.map((r) => (
              <div key={r._id} onClick={() => setSelected(r)}
                className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                  selected?._id === r._id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'
                }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.campaign?.title || 'Campaign'}</p>
                    <p className="text-xs text-gray-400">{r.donor?.name} · {r.donor?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Requested: {new Date(r.refundRequestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 text-sm">₹{r.amount?.toLocaleString()}</p>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">UPI</span>
                  </div>
                </div>
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-700">"{r.refundReason}"</p>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-4">
              <h3 className="font-bold text-gray-800">Process Refund</h3>

              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Donor</span>
                  <span className="font-medium">{selected.donor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span>{selected.donor?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-red-600">₹{selected.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Campaign</span>
                  <span className="text-right max-w-[180px] truncate">{selected.campaign?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Donated on</span>
                  <span>{new Date(selected.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="font-mono text-xs truncate max-w-[160px]">{selected.razorpayPaymentId}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">Refund reason:</p>
                <p className="text-sm text-yellow-800">"{selected.refundReason}"</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the donor..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-300 resize-none" />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600">
                ℹ Approving will initiate a Stripe refund. The donor receives money in 5-7 business days.
              </div>

              <div className="flex gap-3">
                <button onClick={() => handleAction('reject')} disabled={processing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                  {processing ? '...' : '✕ Reject'}
                </button>
                <button onClick={() => handleAction('approve')} disabled={processing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                  {processing ? 'Processing...' : '✓ Approve Refund'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center min-h-[300px] text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-2">👆</p>
                <p className="text-sm">Select a refund request to process</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
