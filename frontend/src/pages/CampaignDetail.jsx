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
  if (d > 0) return `${d}d ${h}h remaining`
  return `${h}h remaining`
}

/* ══════════════════════════════════════════════════════════════════
   ETH REFUND PANEL
══════════════════════════════════════════════════════════════════ */
function EthRefundPanel({ campaign, isGoalMet, pct, refundFn, txStatus, setTxStatus, refetch }) {
  const { token } = useAuth?.() || {}
  const authToken = token || localStorage.getItem('admin_token')
  const [myDonation,   setMyDonation]   = useState(null)
  const [loadingCheck, setLoadingCheck] = useState(true)

  useEffect(() => {
    if (!authToken) { setLoadingCheck(false); return }
    axios.get(`${API}/donations/my`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => {
        const list = data.data || []
        const match = list.find(d =>
          (d.campaign?._id === campaign._id || d.campaign?.contractAddress === campaign.contractAddress) &&
          d.status === 'paid'
        )
        setMyDonation(match || null)
      })
      .catch(() => setMyDonation(null))
      .finally(() => setLoadingCheck(false))
  }, [authToken, campaign._id, campaign.contractAddress])

  const handleEthRefund = async () => {
    if (!refundFn) return
    setTxStatus('pending')
    try {
      await refundFn()
      setTxStatus('refunded')
      await refetch()
    } catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 5000) }
  }

  return (
    <div className="cd-panel">
      <div className="cd-panel-header" style={{ background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)', borderColor: isGoalMet ? '#bbf7d0' : '#fecdd3' }}>
        <span style={{ fontWeight: 700, fontSize: '.875rem', color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)' }}>Campaign Status</span>
        <span className={`cd-status-badge ${isGoalMet ? 'cd-badge-green' : 'cd-badge-red'}`}>
          {isGoalMet ? '✓ Goal Reached' : '⏹ Ended'}
        </span>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Raised</span>
            <strong style={{ color: isGoalMet ? 'var(--teal-600)' : 'var(--purple-600)' }}>{fmt(campaign.amountRaised, false)}</strong>
          </div>
          <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-full)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 'var(--r-full)', background: isGoalMet ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,var(--purple-600),var(--amber-500))', transition: 'width .8s ease' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--text-muted)' }}>
            <span>{pct.toFixed(1)}% funded</span>
            <span>of {fmt(campaign.goal, false)}</span>
          </div>
        </div>

        {/* Status message */}
        <div style={{ background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)', border: `1px solid ${isGoalMet ? '#bbf7d0' : '#fecdd3'}`, borderRadius: 'var(--r-md)', padding: '.875rem', fontSize: '.82rem', lineHeight: 1.65, color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)' }}>
          {isGoalMet
            ? '🎉 This campaign reached its goal! Funds have been released to the creator.'
            : '⏹ This campaign ended without reaching its goal. Claim your full ETH refund below.'}
        </div>

        {/* ETH Refund */}
        {!isGoalMet && (
          loadingCheck ? (
            <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-subtle)', fontSize: '.82rem' }}>Checking your donation…</div>
          ) : txStatus === 'refunded' ? (
            <div style={{ background: 'var(--teal-50)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-md)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--teal-700)', margin: '0 0 4px', fontSize: '.9rem' }}>Refund successful!</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: 'var(--teal-600)', margin: 0 }}>Your ETH has been returned to your wallet.</p>
            </div>
          ) : myDonation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ background: 'var(--purple-50)', border: '1px solid var(--purple-200)', borderRadius: 'var(--r-md)', padding: '1rem' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 700, color: 'var(--purple-600)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>Your donation</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount donated</span>
                  <span style={{ fontWeight: 800, color: 'var(--purple-600)', fontSize: '1.1rem' }}>{fmt(myDonation.amount, false)}</span>
                </div>
              </div>

              {txStatus === 'pending' && (
                <div style={{ background: 'var(--warning-50)', border: '1px solid #fde68a', borderRadius: 'var(--r-md)', padding: '.875rem', fontSize: '.82rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#d97706', flexShrink: 0 }}/>
                  Waiting for transaction confirmation…
                </div>
              )}
              {txStatus === 'error' && <div className="alert alert-error">✗ Transaction failed. Check MetaMask and try again.</div>}

              {txStatus !== 'pending' && (
                <button onClick={handleEthRefund} disabled={!refundFn} style={{
                  width: '100%', padding: '13px', border: 'none', borderRadius: 14,
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff',
                  fontFamily: 'var(--font-sans)', fontSize: '.95rem', fontWeight: 700,
                  cursor: refundFn ? 'pointer' : 'not-allowed',
                  boxShadow: '0 4px 14px rgba(220,38,38,.3)', transition: 'all .18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: refundFn ? 1 : .5,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Claim Refund ({fmt(myDonation.amount, false)})
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>💸</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px', fontSize: '.875rem' }}>You didn't donate to this campaign</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--text-subtle)', margin: 0 }}>Only donors can claim refunds</p>
            </div>
          )
        )}

        {/* Trust signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: '.75rem', borderTop: '1px solid var(--border-light)' }}>
          {['🔒 Secure — funds held by smart contract','⛓️ On-chain — verifiable on Sepolia','↩️ Full refund — exact amount returned'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
              <span style={{ flexShrink: 0 }}>{t.slice(0, 2)}</span>{t.slice(3)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   UPI ENDED PANEL
══════════════════════════════════════════════════════════════════ */
function UpiEndedPanel({ campaign, isGoalMet, pct }) {
  const { token } = useAuth?.() || {}
  const authToken = token || localStorage.getItem('admin_token')
  const [myDonation, setMyDonation]   = useState(null)
  const [loadingCheck, setLoadingCheck] = useState(true)
  const [showModal,  setShowModal]    = useState(false)
  const [reason,     setReason]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitted,  setSubmitted]    = useState(false)
  const [error,      setError]        = useState('')

  useEffect(() => {
    if (!authToken) { setLoadingCheck(false); return }
    axios.get(`${API}/donations/my`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => {
        const list  = data.data || []
        const match = list.find(d =>
          (d.campaign?._id === campaign._id || d.campaign?.contractAddress === campaign.contractAddress) &&
          d.status === 'paid'
        )
        setMyDonation(match || null)
      })
      .catch(() => setMyDonation(null))
      .finally(() => setLoadingCheck(false))
  }, [authToken, campaign._id])

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Please provide a reason.'); return }
    setSubmitting(true); setError('')
    try {
      await axios.post(`${API}/donations/${myDonation._id}/refund-request`, { reason }, { headers: { Authorization: `Bearer ${authToken}` } })
      setSubmitted(true); setShowModal(false)
    } catch(e) { setError(e.response?.data?.message || 'Failed to submit. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <div className="cd-panel">
        <div className="cd-panel-header" style={{ background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)', borderColor: isGoalMet ? '#bbf7d0' : '#fecdd3' }}>
          <span style={{ fontWeight: 700, fontSize: '.875rem', color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)' }}>Campaign Status</span>
          <span className={`cd-status-badge ${isGoalMet ? 'cd-badge-green' : 'cd-badge-red'}`}>{isGoalMet ? '✓ Goal Reached' : '⏹ Ended'}</span>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Raised</span>
              <strong style={{ color: isGoalMet ? 'var(--teal-600)' : 'var(--purple-600)' }}>{fmt(campaign.raised || campaign.amountRaised || 0, true)}</strong>
            </div>
            <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-full)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 'var(--r-full)', background: isGoalMet ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,var(--purple-600),var(--amber-500))' }}/>
            </div>
            <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>{pct.toFixed(1)}% of {fmt(campaign.goal, true)}</p>
          </div>

          <div style={{ background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)', border: `1px solid ${isGoalMet ? '#bbf7d0' : '#fecdd3'}`, borderRadius: 'var(--r-md)', padding: '.875rem', fontSize: '.82rem', lineHeight: 1.65, color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)' }}>
            {isGoalMet ? '🎉 This campaign reached its goal! Funds released to the creator.' : '⏹ Campaign ended without reaching its goal. Request a refund below if you donated.'}
          </div>

          {!isGoalMet && (
            loadingCheck ? (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-subtle)', fontSize: '.82rem' }}>Checking your donation…</div>
            ) : submitted ? (
              <div style={{ background: 'var(--teal-50)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-md)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✅</div>
                <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--teal-700)', margin: '0 0 4px', fontSize: '.9rem' }}>Request submitted!</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: 'var(--teal-600)', margin: 0 }}>Our team will review within 2-3 business days.</p>
              </div>
            ) : myDonation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <div style={{ background: 'var(--purple-50)', border: '1px solid var(--purple-200)', borderRadius: 'var(--r-md)', padding: '1rem' }}>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 700, color: 'var(--purple-600)', textTransform: 'uppercase', letterSpacing: '.04em', margin: '0 0 8px' }}>Your donation</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                    <span style={{ fontWeight: 800, color: 'var(--purple-600)', fontSize: '1.1rem' }}>₹{myDonation.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  {myDonation.status === 'refund_requested' && (
                    <div style={{ marginTop: 8, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '6px 10px', fontSize: '.75rem', color: '#92400e' }}>⏳ Refund request submitted — under admin review.</div>
                  )}
                  {myDonation.status === 'refunded' && (
                    <div style={{ marginTop: 8, background: 'var(--teal-50)', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 10px', fontSize: '.75rem', color: 'var(--teal-700)' }}>✓ Your refund has been processed.</div>
                  )}
                </div>
                {myDonation.status === 'paid' && (
                  <button onClick={() => setShowModal(true)} style={{
                    width: '100%', padding: '13px', border: 'none', borderRadius: 14,
                    background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff',
                    fontFamily: 'var(--font-sans)', fontSize: '.95rem', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220,38,38,.3)', transition: 'all .18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Request Refund
                  </button>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>💸</div>
                <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px', fontSize: '.875rem' }}>You didn't donate to this campaign</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--text-subtle)', margin: 0 }}>Only donors can request refunds</p>
              </div>
            )
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: '.75rem', borderTop: '1px solid var(--border-light)' }}>
            {['🔒 Secure payments via Stripe','⛓️ Blockchain-verified campaign','↩️ Refunds reviewed within 2-3 days'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                <span style={{ flexShrink: 0 }}>{t.slice(0,2)}</span>{t.slice(3)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && myDonation && (
        <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget){ setShowModal(false); setReason(''); setError('') } }}>
          <div className="modal" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>Request a Refund</h3>
            <div style={{ background: 'var(--warning-50)', border: '1px solid #fde68a', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '.78rem', color: '#92400e' }}>
              ⚠ Refunds are reviewed within 2-3 business days and returned to your original payment method.
            </div>
            <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--r-md)', padding: '1rem', fontSize: '.875rem' }}>
              {[['Campaign', campaign.title],['Amount',`₹${myDonation.amount?.toLocaleString('en-IN')}`],['Donated on', new Date(myDonation.createdAt).toLocaleDateString('en-IN')]].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontWeight: 500, color: l === 'Amount' ? 'var(--error-700)' : 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: '.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Reason <span style={{ color: 'var(--error-500)' }}>*</span>
              </label>
              <textarea value={reason} onChange={e => { setReason(e.target.value); setError('') }} placeholder="Why would you like a refund?" rows={3}
                style={{ width: '100%', padding: '10px 14px', resize: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: 'var(--text-primary)', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)', boxSizing: 'border-box', transition: 'border-color .15s' }}
                onFocus={e => e.target.style.borderColor='var(--error-500)'}
                onBlur={e  => e.target.style.borderColor='var(--border)'}/>
            </div>
            {error && <div className="alert alert-error">⚠ {error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10 }}>
              <button onClick={() => { setShowModal(false); setReason(''); setError('') }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="btn"
                style={{ background: 'var(--error-500)', color: '#fff', opacity: (submitting||!reason.trim())?.5:1 }}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function CampaignDetail() {
  const { id: contractAddress } = useParams()
  const navigate = useNavigate()
  const { account } = useWallet()
  const { campaign, loading, error, refetch } = useCampaign(contractAddress)
  const { donate, refund, claimFunds } = useCampaignContract(contractAddress)
  const [txStatus, setTxStatus] = useState(null)

  const handleWithdraw = async () => {
    setTxStatus('pending')
    try { await claimFunds?.(); setTxStatus('withdrawn'); await refetch() }
    catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 4000) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', flexDirection:'column', gap:12 }}>
      <div className="spinner" style={{ width:36, height:36 }}/>
      <p style={{ fontSize:'.875rem', color:'var(--text-muted)' }}>Loading campaign…</p>
    </div>
  )

  if (error || !campaign) return (
    <div style={{ textAlign:'center', padding:'4rem 1.5rem' }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔍</div>
      <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', marginBottom:'.5rem' }}>Campaign not found</h3>
      <p style={{ fontSize:'.875rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>{error || "This campaign doesn't exist."}</p>
      <button onClick={() => navigate('/app')} className="btn btn-primary">Browse campaigns</button>
    </div>
  )

  const isFiat     = campaign.paymentType === 'fiat'
  const raised     = isFiat ? (campaign.raised || 0) : parseFloat(campaign.amountRaised || 0)
  const goal       = parseFloat(campaign.goal || 0)
  const pct        = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const deadlineMs = campaign.deadline > 1e12 ? campaign.deadline : campaign.deadline * 1000
  const isExpired  = Date.now() > deadlineMs
  const isGoalMet  = raised >= goal && goal > 0
  const isVerified = campaign.verificationStatus === 'verified'
  const isOwner    = account?.toLowerCase() === campaign.owner?.toLowerCase()
  const isPending  = campaign.verificationStatus === 'pending'
  const isRejected = campaign.verificationStatus === 'rejected'
  const isEnded    = isExpired || isGoalMet

  const renderRightPanel = () => {
    if (!isVerified) return (
      <div className="cd-panel">
        <div style={{ padding:'2rem', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--warning-50)', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <p style={{ fontWeight:700, fontSize:'.95rem', color:'var(--text-primary)', margin:'0 0 .35rem' }}>Donations not available</p>
          <p style={{ fontSize:'.82rem', color:'var(--text-muted)', margin:0 }}>
            {isPending ? 'Awaiting admin verification' : isRejected ? 'Campaign was rejected' : 'Not yet verified'}
          </p>
        </div>
      </div>
    )

    if (isEnded) return isFiat
      ? <UpiEndedPanel campaign={campaign} isGoalMet={isGoalMet} pct={pct}/>
      : <EthRefundPanel campaign={campaign} isGoalMet={isGoalMet} pct={pct} refundFn={refund} txStatus={txStatus} setTxStatus={setTxStatus} refetch={refetch}/>

    return isFiat
      ? <UpiDonationPanel campaign={campaign} onSuccess={refetch}/>
      : <DonationPanel campaign={campaign} donate={donate} onSuccess={refetch}/>
  }

  return (
    <>
      <style>{`
        .cd-panel { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r-xl); overflow:hidden; box-shadow:var(--shadow-md); }
        .cd-panel-header { padding:.875rem 1.25rem; border-bottom:1px solid; display:flex; align-items:center; justify-content:space-between; }
        .cd-status-badge { font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:var(--r-full); }
        .cd-badge-green { background:#bbf7d0; color:var(--teal-700); }
        .cd-badge-red   { background:#fecdd3; color:var(--error-700); }
      `}</style>

      <div style={{ maxWidth:'var(--container-max)', margin:'0 auto', paddingBottom:'4rem' }}>

        <button onClick={() => navigate(-1)} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', fontSize:'.875rem', color:'var(--text-muted)', padding:'4px 0', marginBottom:'1.25rem', transition:'color .15s', fontFamily:'var(--font-sans)' }}
          onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to campaigns
        </button>

        {txStatus === 'withdrawn' && <div className="alert alert-success" style={{ marginBottom:'1rem' }}>✓ Funds withdrawn to your wallet.</div>}
        {(isPending||isRejected) && <div className={`alert ${isRejected?'alert-error':'alert-warning'}`} style={{ marginBottom:'1rem' }}>{isPending?'⏳ Pending admin verification.':'✕ Campaign was rejected.'}</div>}

        {/* Expired banner */}
        {isExpired && !isGoalMet && (
          <div style={{ marginBottom:'1rem', background:'var(--error-50)', border:'1px solid #fecdd3', color:'var(--error-700)', borderRadius:'var(--r-md)', padding:'.875rem 1rem', display:'flex', flexDirection:'column', gap:4, fontSize:'.875rem' }}>
            <strong>⏹ This campaign has expired without reaching its goal.</strong>
            <span style={{ fontSize:'.82rem' }}>
              {isFiat ? 'If you donated via UPI/card, you can request a refund →' : 'If you donated ETH, claim your full refund from the panel on the right →'}
            </span>
          </div>
        )}

        <div className="detail-layout">
          <div>
            {/* Hero image */}
            <div style={{ width:'100%', height:'clamp(200px,40vw,420px)', borderRadius:'var(--r-xl)', overflow:'hidden', background:'var(--bg-muted)', marginBottom:'1.25rem', boxShadow:'var(--shadow-md)' }}>
              {campaign.imageHash
                ? <img src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`} alt={campaign.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,var(--purple-50),var(--teal-50))' }}><span style={{ fontSize:'1.25rem', color:'var(--text-subtle)' }}>No image</span></div>
              }
            </div>

            {/* Badges */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:'.875rem' }}>
              {campaign.category && <span className="badge badge-gray" style={{ textTransform:'uppercase', letterSpacing:'.04em' }}>{campaign.category}</span>}
              {isVerified && <span className="badge badge-green"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> Verified</span>}
              <span className={`badge ${isFiat?'badge-green':'badge-purple'}`}>{isFiat?'UPI / Card':'ETH'}</span>
              {isEnded && <span className={`badge ${isGoalMet?'badge-green':'badge-red'}`}>{isGoalMet?'✓ Goal Reached':'⏹ Ended'}</span>}
            </div>

            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.5rem,4vw,2.2rem)', fontWeight:400, lineHeight:1.15, color:'var(--text-primary)', margin:'0 0 .5rem' }}>{campaign.title}</h1>
            {campaign.ownerName && (
              <p style={{ fontSize:'.875rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>
                by <span style={{ color:'var(--text-secondary)', fontWeight:600 }}>{campaign.ownerName}</span>
                {campaign.ownerUsername && <span style={{ color:'var(--purple-600)' }}> @{campaign.ownerUsername}</span>}
              </p>
            )}

            {/* Progress card */}
            <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.75rem', marginBottom:'1rem' }}>
                {[{label:'Raised',value:fmt(raised,isFiat),color:'var(--purple-600)'},{label:'Goal',value:fmt(goal,isFiat),color:'var(--text-primary)'},{label:'Donors',value:campaign.funders||0,color:'var(--text-primary)'}].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.1rem,2.5vw,1.4rem)', color:s.color, lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ height:8, background:'var(--bg-muted)', borderRadius:'var(--r-full)', overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:`${pct}%`, borderRadius:'var(--r-full)', background:isGoalMet?'linear-gradient(90deg,#22c55e,#16a34a)':'linear-gradient(90deg,var(--purple-600),var(--amber-400))', transition:'width .8s ease' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.8rem' }}>
                <span style={{ color:'var(--purple-600)', fontWeight:600 }}>{pct.toFixed(1)}% funded</span>
                <span style={{ color:'var(--text-muted)' }}>{timeLeft(deadlineMs)}</span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', marginBottom:'.75rem', color:'var(--text-primary)' }}>About this campaign</h2>
              <p style={{ fontSize:'.925rem', lineHeight:1.8, color:'var(--text-secondary)', whiteSpace:'pre-wrap' }}>{campaign.description}</p>
            </div>

            {/* Owner withdraw */}
            {isOwner && !isFiat && isGoalMet && !campaign.claimed && (
              <button onClick={handleWithdraw} disabled={txStatus==='pending'||!claimFunds} className="btn btn-primary" style={{ opacity:txStatus==='pending'?.6:1 }}>
                {txStatus==='pending'?'Confirming…':'Withdraw Funds'}
              </button>
            )}
          </div>

          <div style={{ position:'sticky', top:'calc(var(--navbar-h) + 1rem)', alignSelf:'start' }}>
            {renderRightPanel()}
          </div>
        </div>
      </div>
    </>
  )
}
