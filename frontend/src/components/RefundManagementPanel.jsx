/**
 * components/RefundManagementPanel.jsx
 * Admin panel: view, approve, and reject donor refund requests.
 * Fully responsive — stacks to single column on mobile.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getToken = () => localStorage.getItem('token') || localStorage.getItem('admin_token')

export default function RefundManagementPanel() {
  const [refunds,    setRefunds]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [note,       setNote]       = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast,      setToast]      = useState(null)

  useEffect(() => { fetchRefunds() }, [])

  const fetchRefunds = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/donations/refund-requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      setRefunds(data.data || [])
    } catch(e) {
      showToast(e.response?.data?.message || 'Failed to load refund requests', 'error')
    } finally { setLoading(false) }
  }

  const showToast = (msg, type = 'success') => {
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
      showToast(data.message || (action === 'approve' ? 'Refund approved ✓' : 'Refund rejected'), 'success')
      setSelected(null); setNote('')
      fetchRefunds()
    } catch(e) {
      showToast(e.response?.data?.message || 'Failed to process refund', 'error')
    } finally { setProcessing(false) }
  }

  const isCampaignExpired = (deadline) => deadline && deadline < Math.floor(Date.now() / 1000)

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

  return (
    <>
      <style>{`
        .rmp { font-family: 'Poppins', system-ui, sans-serif; }

        /* Header */
        .rmp-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.5rem; flex-wrap: wrap; gap: 10px;
        }
        .rmp-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          color: #111827; margin: 0;
        }
        .rmp-badge {
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
          font-size: 0.75rem; font-weight: 700; padding: 4px 12px;
          border-radius: 999px; display: flex; align-items: center; gap: 6px;
        }
        .rmp-refresh {
          background: none; border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 6px 12px; cursor: pointer; font-family: 'Poppins',sans-serif;
          font-size: 0.78rem; color: #6b7280; transition: all 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .rmp-refresh:hover { background: #f9fafb; color: #374151; }

        /* Toast */
        .rmp-toast {
          padding: 10px 14px; border-radius: 12px; margin-bottom: 1.25rem;
          font-size: 0.875rem; display: flex; align-items: center;
          justify-content: space-between; gap: 10px;
          animation: rmp-fade 0.3s ease;
        }
        .rmp-toast-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #065f46; }
        .rmp-toast-error   { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        @keyframes rmp-fade { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        /* Two-column layout */
        .rmp-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 900px) {
          .rmp-layout { grid-template-columns: 1fr 1fr; }
        }

        /* List panel */
        .rmp-list {
          display: flex; flex-direction: column; gap: 0.875rem;
          max-height: 620px; overflow-y: auto;
          padding-right: 2px;
        }
        .rmp-list::-webkit-scrollbar { width: 4px; }
        .rmp-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

        /* Refund item card */
        .rmp-item {
          border: 2px solid #f3f4f6;
          border-radius: 14px;
          padding: 1rem 1.125rem;
          cursor: pointer;
          transition: all 0.18s;
          background: #fff;
        }
        .rmp-item:hover { border-color: #ddd6fe; box-shadow: 0 2px 10px rgba(124,58,237,0.08); }
        .rmp-item-active { border-color: #7c3aed !important; background: #faf5ff !important; }

        .rmp-item-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px; margin-bottom: 0.625rem;
        }
        .rmp-item-title {
          font-weight: 600; color: #111827; font-size: 0.9rem;
          margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; max-width: 200px;
        }
        .rmp-item-meta { font-size: 0.75rem; color: #9ca3af; margin: 0; }
        .rmp-item-amount {
          font-weight: 800; color: #dc2626; font-size: 1rem;
          white-space: nowrap; flex-shrink: 0;
        }

        .rmp-expired-badge {
          display: inline-block; font-size: 0.67rem; font-weight: 700;
          background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
          padding: 1px 8px; border-radius: 999px; margin-top: 4px;
        }

        .rmp-reason-box {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 8px; padding: 8px 12px;
          font-size: 0.78rem; color: #78350f;
          margin-top: 0.5rem;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        /* Detail / process panel */
        .rmp-detail {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: calc(var(--navbar-h, 60px) + 1rem);
          max-height: 80dvh;
          overflow-y: auto;
        }

        .rmp-detail-header {
          padding: 1.125rem 1.375rem;
          border-bottom: 1px solid #f3f4f6;
          display: flex; align-items: center; justify-content: space-between;
          background: #fafafa;
          flex-shrink: 0;
        }
        .rmp-detail-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 1.1rem; color: #111827; margin: 0;
        }
        .rmp-close-btn {
          background: none; border: 1px solid #e5e7eb; border-radius: 8px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6b7280; transition: all 0.15s; flex-shrink: 0;
        }
        .rmp-close-btn:hover { background: #f3f4f6; color: #374151; }

        .rmp-detail-body { padding: 1.375rem; display: flex; flex-direction: column; gap: 1.125rem; }

        /* Info table */
        .rmp-info-table {
          background: #f9fafb; border-radius: 12px;
          padding: 1rem 1.125rem;
          display: flex; flex-direction: column; gap: 8px;
        }
        .rmp-info-row {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          font-size: 0.85rem;
        }
        .rmp-info-label { color: #6b7280; flex-shrink: 0; }
        .rmp-info-value {
          color: #111827; font-weight: 500; text-align: right;
          max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Reason display */
        .rmp-reason-display {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 12px; padding: 1rem 1.125rem;
        }
        .rmp-reason-label {
          font-size: 0.72rem; font-weight: 700; color: #92400e;
          text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;
        }
        .rmp-reason-text { font-size: 0.875rem; color: #78350f; line-height: 1.6; }

        /* Note textarea */
        .rmp-note-label {
          font-size: 0.82rem; font-weight: 600; color: #374151; margin-bottom: 6px;
          display: flex; align-items: center; gap: 6px;
        }
        .rmp-note-required { color: #dc2626; font-size: 0.75rem; font-weight: 500; }
        .rmp-textarea {
          width: 100%; padding: 0.75rem 1rem; resize: none; outline: none;
          font-family: 'Poppins',sans-serif; font-size: 0.875rem; color: #111827;
          background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px;
          transition: border-color 0.15s; box-sizing: border-box; line-height: 1.6;
          min-height: 96px;
        }
        .rmp-textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .rmp-textarea::placeholder { color: #d1d5db; }

        /* Info boxes */
        .rmp-info-box {
          background: #eff6ff; border: 1px solid #bfdbfe;
          border-radius: 12px; padding: 0.875rem 1rem;
          display: flex; flex-direction: column; gap: 5px;
        }
        .rmp-info-box p {
          font-size: 0.78rem; color: #1d4ed8; margin: 0; line-height: 1.55;
        }

        /* Action buttons */
        .rmp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rmp-btn-reject {
          padding: 13px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; font-family: 'Poppins',sans-serif; font-size: 0.875rem;
          font-weight: 700; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 3px 10px rgba(239,68,68,0.25);
        }
        .rmp-btn-reject:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(239,68,68,0.35); }
        .rmp-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .rmp-btn-approve {
          padding: 13px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; font-family: 'Poppins',sans-serif; font-size: 0.875rem;
          font-weight: 700; transition: all 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 3px 10px rgba(34,197,94,0.25);
        }
        .rmp-btn-approve:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(34,197,94,0.35); }
        .rmp-btn-approve:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Spinner */
        .rmp-spin {
          width: 15px; height: 15px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          animation: rmp-spin 0.7s linear infinite; display: inline-block;
        }
        @keyframes rmp-spin { to { transform: rotate(360deg); } }

        /* Empty / loading states */
        .rmp-empty {
          text-align: center; padding: 3rem 1.5rem;
          background: #f9fafb; border-radius: 16px;
          border: 2px dashed #e5e7eb;
        }
        .rmp-placeholder {
          border: 2px dashed #e5e7eb; border-radius: 16px;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3rem 2rem; text-align: center;
          color: #9ca3af; gap: 8px;
          min-height: 300px;
        }
      `}</style>

      <div className="rmp">

        {/* Header */}
        <div className="rmp-header">
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <h2 className="rmp-title">Refund Requests</h2>
            <span className="rmp-badge">
              <span style={{ width:7, height:7, background:'#ef4444', borderRadius:'50%', display:'inline-block' }}/>
              {refunds.length} pending
            </span>
          </div>
          <button onClick={fetchRefunds} className="rmp-refresh">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rmp-toast ${toast.type === 'error' ? 'rmp-toast-error' : 'rmp-toast-success'}`}>
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:'1rem', padding:0, lineHeight:1 }}>×</button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'3rem', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #ede9fe', borderTopColor:'#7c3aed', animation:'rmp-spin 0.7s linear infinite' }}/>
            <p style={{ fontSize:'0.875rem', color:'#9ca3af', margin:0 }}>Loading refund requests…</p>
          </div>
        ) : refunds.length === 0 ? (
          <div className="rmp-empty">
            <div style={{ fontSize:'3rem', marginBottom:'0.875rem' }}>🎉</div>
            <p style={{ fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No pending refund requests</p>
            <p style={{ fontSize:'0.82rem', color:'#9ca3af', margin:0 }}>All caught up!</p>
          </div>
        ) : (
          <div className="rmp-layout">

            {/* ── LEFT: List ── */}
            <div className="rmp-list">
              {refunds.map(r => (
                <div
                  key={r._id}
                  onClick={() => { setSelected(r); setNote('') }}
                  className={`rmp-item ${selected?._id === r._id ? 'rmp-item-active' : ''}`}
                >
                  <div className="rmp-item-top">
                    <div style={{ flex:1, minWidth:0 }}>
                      <p className="rmp-item-title">{r.campaign?.title || 'Campaign'}</p>
                      <p className="rmp-item-meta">{r.donor?.name} · {r.donor?.email}</p>
                      <p className="rmp-item-meta">Requested: {fmtDate(r.refundRequestedAt)}</p>
                      {isCampaignExpired(r.campaign?.deadline) && (
                        <span className="rmp-expired-badge">Campaign Expired</span>
                      )}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p className="rmp-item-amount">₹{r.amount?.toLocaleString('en-IN')}</p>
                      <span style={{ fontSize:'0.68rem', background:'#f5f3ff', color:'#7c3aed', padding:'1px 8px', borderRadius:999 }}>UPI</span>
                    </div>
                  </div>
                  {r.refundReason && (
                    <div className="rmp-reason-box">"{r.refundReason}"</div>
                  )}
                </div>
              ))}
            </div>

            {/* ── RIGHT: Detail / Process panel ── */}
            {selected ? (
              <div className="rmp-detail">

                {/* Detail header */}
                <div className="rmp-detail-header">
                  <h3 className="rmp-detail-title">Process Refund</h3>
                  <button className="rmp-close-btn" onClick={() => { setSelected(null); setNote('') }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                <div className="rmp-detail-body">

                  {/* Donor info table */}
                  <div className="rmp-info-table">
                    {[
                      ['Donor',        selected.donor?.name],
                      ['Email',        selected.donor?.email],
                      ['Amount',       `₹${selected.amount?.toLocaleString('en-IN')}`],
                      ['Campaign',     selected.campaign?.title],
                      ['Donated on',   fmtDate(selected.createdAt)],
                      ['Payment ID',   selected.razorpayPaymentId || selected.razorpayOrderId || '—'],
                      ['Campaign',     isCampaignExpired(selected.campaign?.deadline) ? '⚠ Expired' : '✓ Active'],
                    ].map(([label, value]) => (
                      <div key={label} className="rmp-info-row">
                        <span className="rmp-info-label">{label}</span>
                        <span className="rmp-info-value" style={{
                          color: label === 'Amount' ? '#dc2626' :
                                 label === 'Campaign' && String(value).startsWith('⚠') ? '#dc2626' :
                                 label === 'Campaign' && String(value).startsWith('✓') ? '#059669' :
                                 '#111827'
                        }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Refund reason */}
                  <div className="rmp-reason-display">
                    <p className="rmp-reason-label">Refund reason:</p>
                    <p className="rmp-reason-text">"{selected.refundReason}"</p>
                  </div>

                  {/* Admin note */}
                  <div>
                    <div className="rmp-note-label">
                      Admin note
                      <span className="rmp-note-required">(required for rejection)</span>
                    </div>
                    <textarea
                      className="rmp-textarea"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a note — this will be included in the email to the donor..."
                      rows={3}
                    />
                  </div>

                  {/* Info boxes */}
                  <div className="rmp-info-box">
                    <p>ℹ <strong>Approve:</strong> Initiates Stripe refund + sends approval email to donor</p>
                    <p>ℹ <strong>Reject:</strong> Sends rejection email with your note to donor</p>
                    <p>🔥 Money returns to donor's account in 5-7 business days</p>
                  </div>

                  {/* Action buttons */}
                  <div className="rmp-actions">
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={processing}
                      className="rmp-btn-reject"
                    >
                      {processing ? <><span className="rmp-spin"/> Processing…</> : <>✕ Reject</>}
                    </button>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={processing}
                      className="rmp-btn-approve"
                    >
                      {processing ? <><span className="rmp-spin"/> Processing…</> : <>✓ Approve Refund</>}
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="rmp-placeholder">
                <div style={{ fontSize:'3rem' }}>👆</div>
                <p style={{ fontWeight:600, color:'#374151', margin:'4px 0 0', fontSize:'0.875rem' }}>
                  Select a request to process
                </p>
                <p style={{ fontSize:'0.78rem', margin:'2px 0 0' }}>
                  Click any item on the left
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}
