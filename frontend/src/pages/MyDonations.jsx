/**
 * MyDonations.jsx — Fully responsive
 */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_CONFIG = {
  created:          { label:'Pending',          bg:'var(--bg-muted)',    color:'var(--text-muted)'  },
  paid:             { label:'Paid',             bg:'var(--teal-50)',     color:'var(--teal-700)'    },
  failed:           { label:'Failed',           bg:'var(--error-50)',    color:'var(--error-700)'   },
  refund_requested: { label:'Refund Requested', bg:'var(--warning-50)',  color:'#92400e'            },
  refunded:         { label:'Refunded',         bg:'#eff6ff',            color:'#1d4ed8'            },
  refund_rejected:  { label:'Refund Rejected',  bg:'var(--error-50)',    color:'var(--error-700)'   },
}

export default function MyDonations() {
  const navigate = useNavigate()
  const [donations, setDonations]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [refundModal, setRefundModal]   = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [message, setMessage]           = useState('')

  const token   = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchDonations() }, [])

  const fetchDonations = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/donations/my`, { headers })
      setDonations(data.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) return
    setSubmitting(true)
    try {
      await axios.post(`${API}/donations/${refundModal._id}/refund-request`, { reason: refundReason }, { headers })
      setMessage('Refund request submitted successfully!')
      setRefundModal(null); setRefundReason('')
      fetchDonations()
    } catch(e) {
      setMessage(e.response?.data?.message || 'Failed to submit refund request.')
    } finally { setSubmitting(false) }
  }

  const canRequestRefund = (d) => {
    if (d.status !== 'paid' || d.paymentMethod !== 'upi') return false
    return (Date.now() - new Date(d.createdAt).getTime()) / 86400000 <= 7
  }

  const totalPaid = donations.filter(d => d.status === 'paid').reduce((s, d) => s + (d.amount || 0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', flexDirection:'column', gap:12 }}>
      <div className="spinner"/>
      <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>Loading your donations…</p>
    </div>
  )

  return (
    <div style={{ maxWidth:'var(--content-max)', margin:'0 auto', paddingBottom:'4rem' }}>

      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.5rem,4vw,2rem)', color:'var(--text-primary)', marginBottom:'.25rem' }}>
          My Donations
        </h1>
        {totalPaid > 0 && (
          <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>
            You've donated <strong style={{ color:'var(--purple-600)' }}>₹{totalPaid.toLocaleString('en-IN')}</strong> in total
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="alert alert-info" style={{ marginBottom:'1rem', justifyContent:'space-between' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--purple-400)', fontSize:'1.1rem', lineHeight:1, padding:0 }}>×</button>
        </div>
      )}

      {/* Empty state */}
      {donations.length === 0 ? (
        <div className="card" style={{ padding:'clamp(3rem, 8vw, 5rem)', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>💜</div>
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--text-primary)', marginBottom:'.5rem' }}>
            No donations yet
          </h3>
          <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1.5rem' }}>
            Support a campaign and make a real difference.
          </p>
          <button onClick={() => navigate('/app')} className="btn btn-primary">Browse campaigns</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
          {donations.map(d => {
            const status = STATUS_CONFIG[d.status] || STATUS_CONFIG.created
            return (
              <div key={d._id} className="card" style={{ padding:'1.125rem' }}>
                {/* Top row */}
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:'0.625rem', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{
                      fontFamily:'var(--font-serif)', fontSize:'0.95rem',
                      color:'var(--text-primary)', margin:'0 0 3px',
                      cursor:'pointer',
                    }}
                    onClick={() => d.campaign?.contractAddress && navigate(`/campaign/${d.campaign.contractAddress}`)}>
                      {d.campaign?.title || 'Campaign'}
                    </p>
                    <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:0 }}>
                      {new Date(d.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:'var(--font-sans)', fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>
                      ₹{d.amount?.toLocaleString('en-IN')}
                    </p>
                    <span style={{
                      background: status.bg, color: status.color,
                      fontSize:'0.68rem', fontWeight:700,
                      padding:'2px 8px', borderRadius:'var(--r-full)',
                    }}>{status.label}</span>
                  </div>
                </div>

                {/* Method badge */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    background:'var(--purple-50)', color:'var(--purple-700)',
                    fontSize:'0.7rem', fontWeight:600, padding:'2px 9px', borderRadius:'var(--r-full)',
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
                    </svg>
                    UPI / Card
                  </span>
                  {d.message && (
                    <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', fontStyle:'italic', margin:0 }}>
                      "{d.message}"
                    </p>
                  )}
                </div>

                {/* Refund status */}
                {d.status === 'refund_requested' && (
                  <div className="alert alert-warning" style={{ marginTop:'0.625rem', fontSize:'0.78rem' }}>
                    ⏳ Refund requested — under review. Reason: {d.refundReason}
                  </div>
                )}
                {d.status === 'refunded' && (
                  <div className="alert alert-success" style={{ marginTop:'0.625rem', fontSize:'0.78rem' }}>
                    ✓ Refunded on {new Date(d.refundProcessedAt).toLocaleDateString()}
                    {d.refundNote && <> · {d.refundNote}</>}
                  </div>
                )}
                {d.status === 'refund_rejected' && (
                  <div className="alert alert-error" style={{ marginTop:'0.625rem', fontSize:'0.78rem' }}>
                    ✕ Refund rejected: {d.refundNote || 'No reason provided'}
                  </div>
                )}

                {/* Refund button */}
                {canRequestRefund(d) && (
                  <button onClick={() => setRefundModal(d)} style={{
                    marginTop:'0.75rem', padding:'6px 14px',
                    border:'1px solid #fecaca', borderRadius:'var(--r-full)',
                    background:'none', cursor:'pointer',
                    fontFamily:'var(--font-sans)', fontSize:'0.78rem', fontWeight:600,
                    color:'var(--error-700)', transition:'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--error-50)'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                    Request Refund
                  </button>
                )}
                {d.paymentMethod==='upi' && d.status==='paid' && !canRequestRefund(d) && (
                  <p style={{ marginTop:8, fontSize:'0.72rem', color:'var(--text-subtle)' }}>
                    Refund window expired (7 days)
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Refund Modal ── */}
      {refundModal && (
        <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget){setRefundModal(null);setRefundReason('')} }}>
          <div className="modal" style={{ padding:'1.75rem' }}>
            <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', color:'var(--text-primary)', margin:'0 0 1rem' }}>
              Request Refund
            </h3>

            {/* Details */}
            <div style={{ background:'var(--bg-muted)', borderRadius:'var(--r-md)', padding:'1rem', marginBottom:'1rem', fontSize:'0.875rem' }}>
              {[
                ['Campaign', refundModal.campaign?.title],
                ['Amount', `₹${refundModal.amount?.toLocaleString('en-IN')}`],
                ['Donated on', new Date(refundModal.createdAt).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:4, gap:8 }}>
                  <span style={{ color:'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight:500, textAlign:'right', color: label==='Amount'?'var(--error-700)':'var(--text-primary)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Reason textarea */}
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.875rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                Reason <span style={{ color:'var(--error-500)' }}>*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Please explain why you want a refund..."
                rows={3}
                style={{
                  width:'100%', padding:'0.75rem 1rem', resize:'none', outline:'none',
                  fontFamily:'var(--font-sans)', fontSize:'0.875rem', color:'var(--text-primary)',
                  background:'var(--bg-card)', border:'1.5px solid var(--border)', borderRadius:'var(--r-md)',
                  transition:'border-color 0.15s', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor='var(--purple-500)'}
                onBlur={e  => e.target.style.borderColor='var(--border)'}
              />
            </div>

            {/* Warning */}
            <div className="alert alert-warning" style={{ fontSize:'0.78rem', marginBottom:'1.25rem' }}>
              ⚠ Refunds take 2-3 business days after admin review. Only available within 7 days of donation.
            </div>

            {/* Actions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <button
                onClick={() => { setRefundModal(null); setRefundReason('') }}
                className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRefundRequest}
                disabled={submitting || !refundReason.trim()}
                className="btn"
                style={{ background:'var(--error-500)', color:'#fff', opacity: (submitting||!refundReason.trim())?.5:1 }}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
