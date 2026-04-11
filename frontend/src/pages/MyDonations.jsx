/**
 * pages/MyDonations.jsx
 * Donation history with purple theme matching the app design.
 */

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const STATUS_CONFIG = {
  created:          { label: 'Pending',         bg: '#F3F4F6', color: '#6B7280'  },
  paid:             { label: 'Paid',             bg: '#ECFDF5', color: '#059669'  },
  failed:           { label: 'Failed',           bg: '#FEF2F2', color: '#DC2626'  },
  refund_requested: { label: 'Refund Requested', bg: '#FFFBEB', color: '#D97706'  },
  refunded:         { label: 'Refunded',         bg: '#EFF6FF', color: '#2563EB'  },
  refund_rejected:  { label: 'Refund Rejected',  bg: '#FEF2F2', color: '#DC2626'  },
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
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
      setRefundModal(null); setRefundReason('')
      fetchDonations()
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to submit refund request.')
    } finally { setSubmitting(false) }
  }

  const canRequestRefund = (d) => {
    if (d.status !== 'paid' || d.paymentMethod !== 'upi') return false
    return (Date.now() - new Date(d.createdAt).getTime()) / 86400000 <= 7
  }

  const totalPaid = donations.filter(d => d.status === 'paid').reduce((s, d) => s + (d.amount || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '2px solid var(--purple-200)', borderTopColor: 'var(--purple-600)',
        animation: 'spin .7s linear infinite',
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, color: 'var(--gray-900)', margin: '0 0 .3rem' }}>
          My Donations
        </h1>
        {totalPaid > 0 && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: 'var(--gray-500)' }}>
            You've donated <strong style={{ color: 'var(--purple-600)' }}>₹{totalPaid.toLocaleString('en-IN')}</strong> in total
          </p>
        )}
      </div>

      {message && (
        <div style={{
          background: 'var(--purple-50)', border: '1px solid var(--purple-200)',
          color: 'var(--purple-700)', fontFamily: 'var(--font-sans)', fontSize: '.875rem',
          padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {message}
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple-400)', fontSize: '1rem' }}>×</button>
        </div>
      )}

      {donations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '5rem 1.5rem',
          background: '#fff', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--gray-200)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💜</div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--gray-700)', marginBottom: '.5rem' }}>
            No donations yet
          </h3>
          <p style={{ color: 'var(--gray-400)', fontSize: '.875rem', marginBottom: '1.5rem' }}>
            Support a campaign and make a real difference.
          </p>
          <button onClick={() => navigate('/app')} className="btn-primary">Browse campaigns</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {donations.map((d) => {
            const status = STATUS_CONFIG[d.status] || STATUS_CONFIG.created
            return (
              <div key={d._id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-serif)', fontSize: '1rem',
                      color: 'var(--gray-900)', margin: '0 0 4px',
                      cursor: 'pointer',
                    }}
                    onClick={() => d.campaign?._id && navigate(`/campaign/${d.campaign?.contractAddress || d.campaign?._id}`)}>
                      {d.campaign?.title || 'Campaign'}
                    </p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--gray-400)', margin: 0 }}>
                      {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 4px' }}>
                      ₹{d.amount?.toLocaleString('en-IN')}
                    </p>
                    <span style={{
                      background: status.bg, color: status.color,
                      fontFamily: 'var(--font-sans)', fontSize: '.7rem', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    }}>{status.label}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--purple-50)', color: 'var(--purple-600)',
                    fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
                    </svg>
                    UPI / Card
                  </span>
                  {d.message && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--gray-400)', fontStyle: 'italic', margin: 0 }}>
                      "{d.message}"
                    </p>
                  )}
                </div>

                {/* Refund info */}
                {d.status === 'refund_requested' && (
                  <div style={{ marginTop: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: '#92400E' }}>
                    ⏳ Refund requested · Reason: {d.refundReason}
                  </div>
                )}
                {d.status === 'refunded' && (
                  <div style={{ marginTop: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: '#1D4ED8' }}>
                    ✓ Refunded on {new Date(d.refundProcessedAt).toLocaleDateString()}
                    {d.refundNote && <> · {d.refundNote}</>}
                  </div>
                )}
                {d.status === 'refund_rejected' && (
                  <div style={{ marginTop: 10, background: 'var(--error-50)', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: 'var(--error-500)' }}>
                    ✕ Refund rejected: {d.refundNote || 'No reason provided'}
                  </div>
                )}

                {/* Refund button */}
                {canRequestRefund(d) && (
                  <button onClick={() => setRefundModal(d)} style={{
                    marginTop: 12, padding: '7px 14px',
                    border: '1px solid #FECACA', borderRadius: 'var(--radius-full)',
                    background: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '.78rem', fontWeight: 600,
                    color: 'var(--error-500)', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--error-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    Request Refund
                  </button>
                )}
                {d.paymentMethod === 'upi' && d.status === 'paid' && !canRequestRefund(d) && (
                  <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: 'var(--gray-400)' }}>
                    Refund window expired (7 days)
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: '1.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--gray-900)', margin: '0 0 1rem' }}>
              Request Refund
            </h3>

            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', fontFamily: 'var(--font-sans)', fontSize: '.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--gray-500)' }}>Campaign</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 200 }}>{refundModal.campaign?.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--gray-500)' }}>Amount</span>
                <span style={{ fontWeight: 700, color: 'var(--error-500)' }}>₹{refundModal.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-500)' }}>Donated</span>
                <span>{new Date(refundModal.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                Reason <span style={{ color: 'var(--error-500)' }}>*</span>
              </label>
              <textarea
                value={refundReason} onChange={e => setRefundReason(e.target.value)}
                placeholder="Please explain why you want a refund..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', resize: 'none', outline: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: 'var(--gray-900)',
                  background: '#fff', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                  transition: 'border-color .15s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--purple-500)'}
                onBlur={e  => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            <div style={{ background: 'var(--amber-50)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: '#92400E', marginBottom: '1.25rem' }}>
              ⚠ Refunds take 2-3 business days after admin review. Only available within 7 days of donation.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setRefundModal(null); setRefundReason('') }} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleRefundRequest} disabled={submitting || !refundReason.trim()} className="btn-primary"
                style={{ flex: 1, background: 'var(--error-500)', boxShadow: 'none', opacity: submitting || !refundReason.trim() ? .5 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
