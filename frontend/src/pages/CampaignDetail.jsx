import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useCampaign } from '../hooks/useCampaigns'
import { useCampaignContract } from '../hooks/useContract'
import DonationPanel from '../components/DonationPanel'
import UpiDonationPanel from '../components/UpiDonationPanel'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const fmt = (n, isFiat) => {
  const num = parseFloat(n) || 0
  if (isFiat) return `₹${num.toLocaleString('en-IN')}`
  return `${num.toFixed(4)} ETH`
}

const timeLeft = (deadline) => {
  const ms = deadline - Date.now()
  if (ms <= 0) return 'Campaign ended'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d > 0) return `${d} day${d !== 1 ? 's' : ''} remaining`
  return `${h} hour${h !== 1 ? 's' : ''} remaining`
}

/* ── Ended / Refund sidebar panel ── */
function EndedPanel({ campaign, isFiat, pct, isGoalMet }) {
  const { token } = useAuth?.() || {}
  const authToken = token || localStorage.getItem('admin_token')

  const [myDonation,    setMyDonation]    = useState(null)
  const [loadingCheck,  setLoadingCheck]  = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [reason,        setReason]        = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [error,         setError]         = useState('')

  /* Check if current user has a paid donation to this campaign */
  useEffect(() => {
    if (!authToken) { setLoadingCheck(false); return }
    axios.get(`${API}/donations/my`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => {
        const donations = data.data || []
        const match = donations.find(d =>
          (d.campaign?._id === campaign._id ||
           d.campaign?.contractAddress === campaign.contractAddress ||
           d.campaignId === campaign._id) &&
          d.status === 'paid'
        )
        setMyDonation(match || null)
      })
      .catch(() => setMyDonation(null))
      .finally(() => setLoadingCheck(false))
  }, [authToken, campaign._id, campaign.contractAddress])

  const handleRefundRequest = async () => {
    if (!reason.trim()) { setError('Please provide a reason.'); return }
    setSubmitting(true); setError('')
    try {
      await axios.post(
        `${API}/donations/${myDonation._id}/refund-request`,
        { reason },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      setSubmitted(true)
      setShowModal(false)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        .ep-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        /* ended header */
        .ep-header {
          background: #f9fafb;
          border-bottom: 1px solid #f3f4f6;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ep-ended-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef2f2;
          border: 1px solid #fecdd3;
          color: #dc2626;
          font-size: .78rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          letter-spacing: .03em;
          text-transform: uppercase;
        }
        .ep-funded-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: .78rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          letter-spacing: .03em;
          text-transform: uppercase;
        }
        .ep-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }

        /* summary box */
        .ep-summary {
          background: #f9fafb;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ep-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: .85rem;
        }
        .ep-summary-label { color: #6b7280; }
        .ep-summary-val   { font-weight: 700; color: #111; }

        /* progress */
        .ep-prog-track {
          height: 8px;
          background: #f3f4f6;
          border-radius: 999px;
          overflow: hidden;
        }
        .ep-prog-fill {
          height: 100%;
          border-radius: 999px;
          transition: width .6s ease;
        }

        /* message box */
        .ep-msg {
          border-radius: 14px;
          padding: 16px;
          font-size: .875rem;
          line-height: 1.6;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ep-msg-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .ep-msg-ended   { background: #fef2f2; color: #7f1d1d; }
        .ep-msg-funded  { background: #f0fdf4; color: #14532d; }

        /* refund button */
        .ep-refund-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(220,38,38,.3);
          transition: all .18s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ep-refund-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(220,38,38,.4); }

        .ep-submitted {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          color: #15803d;
          font-size: .875rem;
          font-weight: 600;
        }

        .ep-no-donation {
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 14px;
          padding: 16px;
          text-align: center;
          color: #9ca3af;
          font-size: .85rem;
        }

        /* trust */
        .ep-trust {
          margin-top: 14px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ep-trust-row {
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .82rem; color: #6b7280;
        }
        .ep-trust-icon {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: .9rem; flex-shrink: 0;
        }

        /* modal */
        .ep-modal-backdrop {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          backdrop-filter: blur(4px);
        }
        .ep-modal {
          background: #fff;
          border-radius: 24px;
          padding: 2rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .ep-modal h3 {
          font-size: 1.15rem;
          font-weight: 800;
          color: #111;
          margin: 0;
        }
        .ep-modal-info {
          background: #fef9ec;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: .82rem;
          color: #92400e;
          line-height: 1.55;
        }
        .ep-modal-detail {
          background: #f9fafb;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: .85rem;
        }
        .ep-modal-detail-row {
          display: flex;
          justify-content: space-between;
        }
        .ep-modal-detail-row span:first-child { color: #6b7280; }
        .ep-modal-detail-row span:last-child  { font-weight: 700; color: #111; }
        .ep-modal textarea {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem;
          color: #111;
          outline: none;
          resize: none;
          min-height: 90px;
          box-sizing: border-box;
          transition: border-color .18s;
        }
        .ep-modal textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
        .ep-modal textarea::placeholder { color: #d1d5db; }
        .ep-modal-error {
          background: #fef2f2; border: 1px solid #fecdd3;
          color: #dc2626; font-size: .82rem;
          padding: 10px 14px; border-radius: 10px;
        }
        .ep-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 10px;
        }
        .ep-modal-cancel {
          padding: 13px; border-radius: 12px;
          border: 1.5px solid #e5e7eb; background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem; font-weight: 600; color: #6b7280;
          cursor: pointer; transition: all .18s;
        }
        .ep-modal-cancel:hover { background: #f9fafb; }
        .ep-modal-submit {
          padding: 13px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .92rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 14px rgba(220,38,38,.3);
          transition: all .18s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .ep-modal-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .ep-modal-submit:disabled { opacity: .5; cursor: not-allowed; }
        .ep-spin {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff; border-radius: 50%;
          animation: epSpin .7s linear infinite; display: inline-block;
        }
        @keyframes epSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Main panel ── */}
      <div className="ep-wrap">
        <div className="ep-header">
          <span style={{ fontFamily:'DM Sans,system-ui,sans-serif', fontSize:'.9rem', fontWeight:700, color:'#374151' }}>
            Campaign Status
          </span>
          {isGoalMet
            ? <span className="ep-funded-badge">✓ Goal Reached</span>
            : <span className="ep-ended-badge">⏹ Ended</span>
          }
        </div>

        <div className="ep-body">
          {/* Summary */}
          <div className="ep-summary">
            <div className="ep-summary-row">
              <span className="ep-summary-label">Amount raised</span>
              <span className="ep-summary-val" style={{ color: isGoalMet ? '#15803d' : '#7c3aed' }}>
                {fmt(campaign.amountRaised || campaign.raised || 0, isFiat)}
              </span>
            </div>
            <div className="ep-summary-row">
              <span className="ep-summary-label">Goal</span>
              <span className="ep-summary-val">{fmt(campaign.goal, isFiat)}</span>
            </div>
            <div className="ep-summary-row">
              <span className="ep-summary-label">Funded</span>
              <span className="ep-summary-val">{pct.toFixed(1)}%</span>
            </div>
            {/* Progress bar */}
            <div className="ep-prog-track" style={{ marginTop: 6 }}>
              <div className="ep-prog-fill" style={{
                width: `${pct}%`,
                background: isGoalMet
                  ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                  : 'linear-gradient(90deg,#7c3aed,#f59e0b)',
              }}/>
            </div>
          </div>

          {/* Contextual message */}
          <div className={`ep-msg ${isGoalMet ? 'ep-msg-funded' : 'ep-msg-ended'}`}>
            <span className="ep-msg-icon">{isGoalMet ? '🎉' : '⏹'}</span>
            <span>
              {isGoalMet
                ? 'This campaign successfully reached its goal! Funds have been released to the creator.'
                : 'This campaign has ended without reaching its goal. Donors who contributed may request a refund.'}
            </span>
          </div>

          {/* Refund section */}
          {!isGoalMet && (
            loadingCheck ? (
              <div style={{ textAlign:'center', padding:'12px 0', color:'#9ca3af', fontSize:'.85rem' }}>
                Checking your donation…
              </div>
            ) : submitted ? (
              <div className="ep-submitted">
                ✓ Refund request submitted! Our team will review and process it within 2–3 business days.
              </div>
            ) : myDonation ? (
              <>
                {/* Donor's donation info */}
                <div style={{
                  background:'#faf5ff', border:'1px solid #ede9fe',
                  borderRadius:14, padding:16,
                }}>
                  <p style={{ fontFamily:'DM Sans,system-ui,sans-serif', fontSize:'.78rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 10px' }}>
                    Your donation
                  </p>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.9rem' }}>
                    <span style={{ color:'#6b7280' }}>Amount</span>
                    <span style={{ fontWeight:800, color:'#7c3aed', fontSize:'1.05rem' }}>
                      ₹{myDonation.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {myDonation.createdAt && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.82rem', marginTop:4 }}>
                      <span style={{ color:'#9ca3af' }}>Donated on</span>
                      <span style={{ color:'#374151' }}>{new Date(myDonation.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                    </div>
                  )}
                  {myDonation.status === 'refund_requested' && (
                    <div style={{ marginTop:10, background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:'.78rem', color:'#92400e' }}>
                      ⏳ Refund request already submitted — under review.
                    </div>
                  )}
                  {myDonation.status === 'refunded' && (
                    <div style={{ marginTop:10, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 12px', fontSize:'.78rem', color:'#15803d' }}>
                      ✓ Your refund has been processed.
                    </div>
                  )}
                </div>

                {/* Show refund button only if not already requested/refunded */}
                {myDonation.status === 'paid' && (
                  <button className="ep-refund-btn" onClick={() => setShowModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                    Request Refund
                  </button>
                )}
              </>
            ) : (
              <div className="ep-no-donation">
                <div style={{ fontSize:'1.8rem', marginBottom:6 }}>💸</div>
                <p style={{ margin:0, fontWeight:600, color:'#6b7280' }}>You didn't donate to this campaign</p>
                <p style={{ margin:'4px 0 0', fontSize:'.78rem' }}>Only donors can request a refund</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Trust signals */}
      <div className="ep-trust">
        <div className="ep-trust-row">
          <div className="ep-trust-icon" style={{ background:'#fef3c7' }}>🔒</div>
          <span>Secure payments via Stripe</span>
        </div>
        <div className="ep-trust-row">
          <div className="ep-trust-icon" style={{ background:'#f0fdf4' }}>⛓️</div>
          <span>Blockchain-verified campaign</span>
        </div>
        <div className="ep-trust-row">
          <div className="ep-trust-icon" style={{ background:'#eff6ff' }}>↩️</div>
          <span>Refunds available within 7 days</span>
        </div>
      </div>

      {/* Refund Modal */}
      {showModal && myDonation && (
        <div className="ep-modal-backdrop" onClick={e => { if(e.target === e.currentTarget) setShowModal(false) }}>
          <div className="ep-modal">
            <h3>Request a Refund</h3>

            <div className="ep-modal-info">
              ⚠ Refunds are reviewed by our team within 2–3 business days. Once approved, the amount will be returned to your original payment method.
            </div>

            <div className="ep-modal-detail">
              <div className="ep-modal-detail-row">
                <span>Campaign</span>
                <span style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {campaign.title}
                </span>
              </div>
              <div className="ep-modal-detail-row">
                <span>Amount</span>
                <span style={{ color:'#dc2626' }}>₹{myDonation.amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="ep-modal-detail-row">
                <span>Donated on</span>
                <span>{new Date(myDonation.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:'.875rem', fontWeight:600, color:'#374151', marginBottom:8 }}>
                Reason for refund <span style={{ color:'#dc2626' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => { setReason(e.target.value); setError('') }}
                placeholder="Please explain why you would like a refund…"
                rows={3}
              />
            </div>

            {error && <div className="ep-modal-error">⚠ {error}</div>}

            <div className="ep-modal-actions">
              <button className="ep-modal-cancel" onClick={() => { setShowModal(false); setReason(''); setError('') }}>
                Cancel
              </button>
              <button
                className="ep-modal-submit"
                onClick={handleRefundRequest}
                disabled={submitting || !reason.trim()}
              >
                {submitting
                  ? <><span className="ep-spin"/>Submitting…</>
                  : 'Submit Request'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN CampaignDetail page
══════════════════════════════════════════════════════ */
export default function CampaignDetail() {
  const { id: contractAddress } = useParams()
  const navigate  = useNavigate()
  const { account } = useWallet()
  const { campaign, loading, error, refetch } = useCampaign(contractAddress)
  const { donate, refund, claimFunds } = useCampaignContract(contractAddress)
  const [txStatus, setTxStatus] = useState(null)

  const handleRefund = async () => {
    if (!refund) return
    setTxStatus('pending')
    try { await refund(); setTxStatus('refunded'); await refetch() }
    catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 4000) }
  }

  const handleWithdraw = async () => {
    if (!claimFunds) return
    setTxStatus('pending')
    try { await claimFunds(); setTxStatus('withdrawn'); await refetch() }
    catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 4000) }
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{
        width:40, height:40, borderRadius:'50%',
        border:'3px solid #ede9fe', borderTopColor:'#7c3aed',
        animation:'cdSpin .8s linear infinite',
      }}/>
      <style>{`@keyframes cdSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  /* ── Error ── */
  if (error || !campaign) return (
    <div style={{ textAlign:'center', padding:'5rem 1.5rem', fontFamily:'DM Sans,system-ui,sans-serif', color:'#9ca3af' }}>
      {error || 'Campaign not found.'}
    </div>
  )

  const isFiat      = campaign.paymentType === 'fiat'
  const raised      = isFiat ? (campaign.raised || 0) : parseFloat(campaign.amountRaised || 0)
  const goal        = parseFloat(campaign.goal || 0)
  const pct         = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const deadlineMs  = campaign.deadline > 1e12 ? campaign.deadline : campaign.deadline * 1000
  const isExpired   = Date.now() > deadlineMs
  const isGoalMet   = raised >= goal && goal > 0
  const isVerified  = campaign.verificationStatus === 'verified'
  const isOwner     = account?.toLowerCase() === campaign.owner?.toLowerCase()
  const isPending   = campaign.verificationStatus === 'pending'
  const isRejected  = campaign.verificationStatus === 'rejected'

  /* Campaign is "ended" = expired OR goal met */
  const isEnded = isExpired || isGoalMet

  /* Right-panel decision:
     1. Not verified            → "not available" card
     2. Ended                   → EndedPanel (refund if applicable)
     3. Active + verified       → Donation form
  */
  const renderRightPanel = () => {
    if (!isVerified) {
      return (
        <div style={{
          background:'#fff', border:'1px solid #e5e7eb',
          borderRadius:20, padding:'2rem', textAlign:'center',
          boxShadow:'0 4px 24px rgba(0,0,0,.07)',
          fontFamily:'DM Sans,system-ui,sans-serif',
        }}>
          <div style={{
            width:56, height:56, borderRadius:'50%',
            background:'#fffbeb', border:'1px solid #fde68a',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 1rem',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p style={{ fontWeight:700, fontSize:'1.05rem', color:'#111', marginBottom:'.4rem' }}>
            Donations not available
          </p>
          <p style={{ fontSize:'.85rem', color:'#9ca3af' }}>
            {isPending  ? 'Awaiting admin verification'
            : isRejected ? 'Campaign was rejected'
            : 'Not yet verified'}
          </p>
        </div>
      )
    }

    if (isEnded) {
      return (
        <EndedPanel
          campaign={campaign}
          isFiat={isFiat}
          pct={pct}
          isGoalMet={isGoalMet}
        />
      )
    }

    /* Active & verified → show donation form */
    return isFiat
      ? <UpiDonationPanel campaign={campaign} onSuccess={refetch}/>
      : <DonationPanel campaign={campaign} donate={donate} onSuccess={refetch}/>
  }

  return (
    <div style={{
      maxWidth:1100, margin:'0 auto',
      padding:'2rem 1.5rem 5rem',
      fontFamily:'DM Sans,system-ui,sans-serif',
    }}>

      {/* Back link */}
      <button onClick={() => navigate(-1)} style={{
        display:'inline-flex', alignItems:'center', gap:6,
        background:'none', border:'none', cursor:'pointer',
        fontSize:'.875rem', color:'#9ca3af',
        padding:'4px 0', marginBottom:'1.5rem', transition:'color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.color='#374151'}
      onMouseLeave={e => e.currentTarget.style.color='#9ca3af'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to campaigns
      </button>

      {/* TX status banners */}
      {txStatus && (
        <div style={{
          marginBottom:'1.25rem', padding:'12px 16px', borderRadius:12,
          fontSize:'.875rem', fontWeight:500,
          background: txStatus==='error' ? '#fef2f2' : '#f0fdf4',
          color:      txStatus==='error' ? '#dc2626'  : '#15803d',
          border:     `1px solid ${txStatus==='error' ? '#fecdd3' : '#bbf7d0'}`,
        }}>
          {txStatus==='pending'   && '⏳ Waiting for transaction confirmation…'}
          {txStatus==='refunded'  && '✓ Refund processed successfully.'}
          {txStatus==='withdrawn' && '✓ Funds withdrawn to your wallet.'}
          {txStatus==='error'     && '✗ Transaction failed. Please try again.'}
        </div>
      )}

      {(isPending || isRejected) && (
        <div style={{
          marginBottom:'1.25rem', padding:'12px 16px', borderRadius:12,
          background: isRejected ? '#fef2f2' : '#fffbeb',
          color:      isRejected ? '#dc2626'  : '#d97706',
          border:     `1px solid ${isRejected ? '#fecdd3' : '#fde68a'}`,
          fontSize:'.875rem',
        }}>
          {isPending  && '⏳ This campaign is pending admin verification.'}
          {isRejected && '✕ This campaign has been rejected.'}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:'2.5rem', alignItems:'start' }}>

        {/* ── LEFT col ── */}
        <div>
          {/* Hero image */}
          <div style={{
            width:'100%', height:'clamp(240px,40vw,440px)',
            borderRadius:20, overflow:'hidden',
            background:'#f3f4f6', marginBottom:'1.75rem',
            boxShadow:'0 4px 20px rgba(0,0,0,.1)',
          }}>
            {campaign.imageHash ? (
              <img
                src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
                alt={campaign.title}
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
              />
            ) : (
              <div style={{
                width:'100%', height:'100%', display:'flex',
                alignItems:'center', justifyContent:'center',
                background:'linear-gradient(135deg,#f5f3ff,#f0fdf4)',
              }}>
                <span style={{ fontSize:'1.5rem', color:'#d1d5db' }}>No image</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
            {campaign.category && (
              <span style={{
                background:'#f3f4f6', color:'#374151',
                fontSize:'.72rem', fontWeight:700,
                padding:'4px 12px', borderRadius:999,
                textTransform:'uppercase', letterSpacing:'.04em',
              }}>{campaign.category}</span>
            )}
            {isVerified && (
              <span style={{
                background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0',
                fontSize:'.72rem', fontWeight:700,
                padding:'4px 10px', borderRadius:999,
                display:'flex', alignItems:'center', gap:4,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Verified
              </span>
            )}
            <span style={{
              background: isFiat ? '#f0fdf4' : '#f5f3ff',
              color:      isFiat ? '#15803d' : '#6d28d9',
              border:     `1px solid ${isFiat ? '#bbf7d0' : '#ede9fe'}`,
              fontSize:'.72rem', fontWeight:700,
              padding:'4px 10px', borderRadius:999,
            }}>
              {isFiat ? 'UPI / Card' : 'ETH'}
            </span>
            {/* Ended badge inline too */}
            {isEnded && (
              <span style={{
                background: isGoalMet ? '#f0fdf4' : '#fef2f2',
                color:      isGoalMet ? '#15803d' : '#dc2626',
                border:     `1px solid ${isGoalMet ? '#bbf7d0' : '#fecdd3'}`,
                fontSize:'.72rem', fontWeight:700,
                padding:'4px 10px', borderRadius:999,
              }}>
                {isGoalMet ? '✓ Goal Reached' : '⏹ Ended'}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily:'DM Serif Display,Georgia,serif',
            fontSize:'clamp(1.7rem,3vw,2.4rem)',
            fontWeight:400, lineHeight:1.2,
            letterSpacing:'-.015em', color:'#111',
            margin:'0 0 .5rem',
          }}>
            {campaign.title}
          </h1>

          {campaign.ownerName && (
            <p style={{ fontSize:'.9rem', color:'#9ca3af', marginBottom:'1.5rem' }}>
              by{' '}
              <span style={{ color:'#374151', fontWeight:600 }}>{campaign.ownerName}</span>
              {campaign.ownerUsername && (
                <span style={{ color:'#7c3aed' }}> @{campaign.ownerUsername}</span>
              )}
            </p>
          )}

          {/* Progress card */}
          <div style={{
            background:'#fff', border:'1px solid #e5e7eb',
            borderRadius:16, padding:'1.5rem',
            marginBottom:'1.5rem', boxShadow:'0 1px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1.25rem' }}>
              {[
                { label:'Raised', value: fmt(raised, isFiat), color:'#7c3aed' },
                { label:'Goal',   value: fmt(goal, isFiat),   color:'#111'    },
                { label:'Donors', value: campaign.funders || 0, color:'#111'  },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{
                    fontFamily:'DM Serif Display,Georgia,serif',
                    fontSize:'1.35rem', color:s.color, lineHeight:1,
                  }}>{s.value}</div>
                  <div style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ height:8, background:'#f3f4f6', borderRadius:999, overflow:'hidden', marginBottom:8 }}>
              <div style={{
                height:'100%', width:`${pct}%`,
                background: isGoalMet
                  ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                  : 'linear-gradient(90deg,#7c3aed,#f59e0b)',
                borderRadius:999, transition:'width .8s ease',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8rem' }}>
              <span style={{ color:'#7c3aed', fontWeight:600 }}>{pct.toFixed(1)}% funded</span>
              <span style={{ color:'#9ca3af' }}>{timeLeft(deadlineMs)}</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:'1.5rem' }}>
            <h2 style={{
              fontFamily:'DM Serif Display,Georgia,serif',
              fontSize:'1.15rem', color:'#111', marginBottom:'.75rem',
            }}>
              About this campaign
            </h2>
            <p style={{ fontSize:'.95rem', lineHeight:1.8, color:'#4b5563', whiteSpace:'pre-wrap' }}>
              {campaign.description}
            </p>
          </div>

          {/* Owner actions (ETH only) */}
          {isOwner && !isFiat && (isGoalMet || (isExpired && !isGoalMet)) && (
            <div style={{ display:'flex', gap:10 }}>
              {isExpired && !isGoalMet && isVerified && (
                <button onClick={handleRefund}
                  disabled={txStatus==='pending' || !refund}
                  style={{
                    padding:'11px 22px', borderRadius:999,
                    border:'1.5px solid #e5e7eb', background:'#fff',
                    fontSize:'.875rem', fontWeight:600, color:'#374151',
                    cursor:'pointer', opacity: txStatus==='pending' ? .5 : 1,
                  }}>
                  Claim Refund
                </button>
              )}
              {isGoalMet && !campaign.claimed && (
                <button onClick={handleWithdraw}
                  disabled={txStatus==='pending' || !claimFunds}
                  style={{
                    padding:'11px 22px', borderRadius:999, border:'none',
                    background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                    color:'#fff', fontSize:'.875rem', fontWeight:700,
                    cursor:'pointer', opacity: txStatus==='pending' ? .5 : 1,
                  }}>
                  Withdraw Funds
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT col ── */}
        <div style={{ position:'sticky', top:80 }}>
          {renderRightPanel()}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: 1fr 400px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  )
}
