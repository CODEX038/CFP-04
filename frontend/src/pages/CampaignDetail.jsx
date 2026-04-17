import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useCampaign } from '../hooks/useCampaigns'
import { useCampaignContract } from '../hooks/useContract'
import DonationPanel from '../components/DonationPanel'
import UpiDonationPanel from '../components/UpiDonationPanel'

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

export default function CampaignDetail() {
  const { id: contractAddress } = useParams()
  const navigate = useNavigate()
  const { account } = useWallet()
  const { campaign, loading, error, refetch } = useCampaign(contractAddress)
  const { donate, refund, claimFunds } = useCampaignContract(contractAddress)
  const [txStatus, setTxStatus] = useState(null)

  const handleRefund = async () => {
    setTxStatus('pending')
    try { await refund?.(); setTxStatus('refunded'); await refetch() }
    catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 4000) }
  }

  const handleWithdraw = async () => {
    setTxStatus('pending')
    try { await claimFunds?.(); setTxStatus('withdrawn'); await refetch() }
    catch { setTxStatus('error') }
    finally { setTimeout(() => setTxStatus(null), 4000) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', flexDirection:'column', gap:12 }}>
      <div className="spinner" style={{ width:36, height:36 }}/>
      <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>Loading campaign…</p>
    </div>
  )

  if (error || !campaign) return (
    <div style={{ textAlign:'center', padding:'4rem 1.5rem' }}>
      <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🔍</div>
      <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', marginBottom:'.5rem' }}>Campaign not found</h3>
      <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
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
    if (!isVerified) {
      return (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--r-xl)', padding:'2rem', textAlign:'center',
          boxShadow:'var(--shadow-sm)',
        }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            background:'var(--warning-50)', border:'1px solid #fde68a',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 1rem',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)', marginBottom:'.35rem' }}>
            Donations not available
          </p>
          <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
            {isPending ? 'Awaiting admin verification' : isRejected ? 'Campaign was rejected' : 'Not yet verified'}
          </p>
        </div>
      )
    }

    if (isEnded) {
      return (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--r-xl)', overflow:'hidden', boxShadow:'var(--shadow-sm)',
        }}>
          <div style={{
            background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)',
            borderBottom:`1px solid ${isGoalMet ? '#bbf7d0' : '#fecdd3'}`,
            padding:'1rem 1.25rem',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <span style={{ fontWeight:700, fontSize:'0.875rem', color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)' }}>
              Campaign Status
            </span>
            <span style={{
              background: isGoalMet ? '#bbf7d0' : '#fecdd3',
              color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)',
              fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:'var(--r-full)',
            }}>
              {isGoalMet ? '✓ Goal Reached' : '⏹ Ended'}
            </span>
          </div>
          <div style={{ padding:'1.25rem' }}>
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:'0.875rem' }}>
                <span style={{ color:'var(--text-muted)' }}>Raised</span>
                <strong style={{ color: isGoalMet ? 'var(--teal-600)' : 'var(--purple-600)' }}>{fmt(raised, isFiat)}</strong>
              </div>
              <div style={{ height:8, background:'var(--bg-muted)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${pct}%`, borderRadius:'var(--r-full)',
                  background: isGoalMet ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,var(--purple-600),var(--amber-500))',
                  transition:'width 0.8s ease',
                }}/>
              </div>
              <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:6, textAlign:'right' }}>
                {pct.toFixed(1)}% of {fmt(goal, isFiat)}
              </p>
            </div>
            <div style={{
              background: isGoalMet ? 'var(--teal-50)' : 'var(--error-50)',
              border:`1px solid ${isGoalMet ? '#bbf7d0' : '#fecdd3'}`,
              borderRadius:'var(--r-md)', padding:'0.875rem',
              fontSize:'0.82rem', lineHeight:1.65,
              color: isGoalMet ? 'var(--teal-700)' : 'var(--error-700)',
            }}>
              {isGoalMet
                ? '🎉 This campaign reached its goal! Funds have been released to the creator.'
                : '⏹ This campaign ended without reaching its goal. Donors may request a refund.'}
            </div>
          </div>
        </div>
      )
    }

    return isFiat
      ? <UpiDonationPanel campaign={campaign} onSuccess={refetch}/>
      : <DonationPanel campaign={campaign} donate={donate} onSuccess={refetch}/>
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', paddingBottom: '4rem' }}>

      {/* Back link */}
      <button onClick={() => navigate(-1)} style={{
        display:'inline-flex', alignItems:'center', gap:6, background:'none',
        border:'none', cursor:'pointer', fontSize:'0.875rem', color:'var(--text-muted)',
        padding:'4px 0', marginBottom:'1.25rem', transition:'color 0.15s',
        fontFamily:'var(--font-sans)',
      }}
      onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
      onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to campaigns
      </button>

      {/* TX status banners */}
      {txStatus && (
        <div className={`alert ${txStatus==='error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom:'1rem' }}>
          {txStatus==='pending'   && '⏳ Waiting for transaction…'}
          {txStatus==='refunded'  && '✓ Refund processed successfully.'}
          {txStatus==='withdrawn' && '✓ Funds withdrawn to your wallet.'}
          {txStatus==='error'     && '✗ Transaction failed. Please try again.'}
        </div>
      )}

      {(isPending || isRejected) && (
        <div className={`alert ${isRejected ? 'alert-error' : 'alert-warning'}`} style={{ marginBottom:'1rem' }}>
          {isPending  && '⏳ This campaign is pending admin verification.'}
          {isRejected && '✕ This campaign has been rejected by admins.'}
        </div>
      )}

      {/* ── Two-column layout (stacks on mobile) ── */}
      <div className="detail-layout">

        {/* LEFT: Campaign info */}
        <div>

          {/* Hero image */}
          <div style={{
            width:'100%', height:'clamp(200px, 40vw, 420px)',
            borderRadius:'var(--r-xl)', overflow:'hidden',
            background:'var(--bg-muted)', marginBottom:'1.25rem',
            boxShadow:'var(--shadow-md)',
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
                background:'linear-gradient(135deg, var(--purple-50), var(--teal-50))',
              }}>
                <span style={{ fontSize:'1.25rem', color:'var(--text-subtle)' }}>No image</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:'0.875rem' }}>
            {campaign.category && (
              <span className="badge badge-gray" style={{ textTransform:'uppercase', letterSpacing:'0.04em' }}>
                {campaign.category}
              </span>
            )}
            {isVerified && (
              <span className="badge badge-green">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                Verified
              </span>
            )}
            <span className={`badge ${isFiat ? 'badge-green' : 'badge-purple'}`}>
              {isFiat ? 'UPI / Card' : 'ETH'}
            </span>
            {isEnded && (
              <span className={`badge ${isGoalMet ? 'badge-green' : 'badge-red'}`}>
                {isGoalMet ? '✓ Goal Reached' : '⏹ Ended'}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily:'var(--font-serif)',
            fontSize:'clamp(1.5rem, 4vw, 2.2rem)',
            fontWeight:400, lineHeight:1.15, letterSpacing:'-0.015em',
            color:'var(--text-primary)', margin:'0 0 0.5rem',
          }}>
            {campaign.title}
          </h1>

          {campaign.ownerName && (
            <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>
              by <span style={{ color:'var(--text-secondary)', fontWeight:600 }}>{campaign.ownerName}</span>
              {campaign.ownerUsername && <span style={{ color:'var(--purple-600)' }}> @{campaign.ownerUsername}</span>}
            </p>
          )}

          {/* Progress card */}
          <div className="card" style={{ padding:'1.25rem', marginBottom:'1.25rem' }}>
            {/* Stat row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem', marginBottom:'1rem' }}>
              {[
                { label:'Raised',  value: fmt(raised, isFiat), color:'var(--purple-600)' },
                { label:'Goal',    value: fmt(goal, isFiat),   color:'var(--text-primary)' },
                { label:'Donors',  value: campaign.funders || 0, color:'var(--text-primary)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.1rem, 2.5vw, 1.4rem)', color:s.color, lineHeight:1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height:8, background:'var(--bg-muted)', borderRadius:'var(--r-full)', overflow:'hidden', marginBottom:8 }}>
              <div style={{
                height:'100%', width:`${pct}%`, borderRadius:'var(--r-full)',
                background: isGoalMet
                  ? 'linear-gradient(90deg,#22c55e,#16a34a)'
                  : 'linear-gradient(90deg,var(--purple-600),var(--amber-400))',
                transition:'width 0.8s ease',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem' }}>
              <span style={{ color:'var(--purple-600)', fontWeight:600 }}>{pct.toFixed(1)}% funded</span>
              <span style={{ color:'var(--text-muted)' }}>{timeLeft(deadlineMs)}</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:'1.5rem' }}>
            <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', marginBottom:'0.75rem', color:'var(--text-primary)' }}>
              About this campaign
            </h2>
            <p style={{ fontSize:'0.925rem', lineHeight:1.8, color:'var(--text-secondary)', whiteSpace:'pre-wrap' }}>
              {campaign.description}
            </p>
          </div>

          {/* Owner actions — ETH only */}
          {isOwner && !isFiat && (isGoalMet || (isExpired && !isGoalMet)) && (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {isExpired && !isGoalMet && isVerified && (
                <button onClick={handleRefund} disabled={txStatus==='pending' || !refund}
                  className="btn btn-secondary">
                  Claim Refund
                </button>
              )}
              {isGoalMet && !campaign.claimed && (
                <button onClick={handleWithdraw} disabled={txStatus==='pending' || !claimFunds}
                  className="btn btn-primary">
                  Withdraw Funds
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Donation panel (sticky on desktop, stacks on mobile) */}
        <div style={{ position:'sticky', top:'calc(var(--navbar-h) + 1rem)', alignSelf:'start' }}>
          {renderRightPanel()}
        </div>
      </div>
    </div>
  )
}
