import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
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
  if (d > 0) return `${d} day${d !== 1 ? 's' : ''} remaining`
  return `${h} hour${h !== 1 ? 's' : ''} remaining`
}

export default function CampaignDetail() {
  const { id: contractAddress } = useParams()
  const navigate = useNavigate()
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

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{
        width:40, height:40, borderRadius:'50%',
        border:'2px solid var(--cream-200)',
        borderTopColor:'var(--teal-500)',
        animation:'spin .8s linear infinite',
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !campaign) return (
    <div style={{ textAlign:'center', padding:'5rem 1.5rem', color:'var(--ink-300)' }}>
      {error || 'Campaign not found.'}
    </div>
  )

  const isFiat    = campaign.paymentType === 'fiat'
  const raised    = isFiat ? (campaign.raised || 0) : parseFloat(campaign.amountRaised || 0)
  const goal      = parseFloat(campaign.goal || 0)
  const pct       = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const isExpired = Date.now() > campaign.deadline
  const isGoalMet = raised >= goal
  const isVerified= campaign.verificationStatus === 'verified'
  const isOwner   = account?.toLowerCase() === campaign.owner?.toLowerCase()
  const isPending = campaign.verificationStatus === 'pending'
  const isRejected= campaign.verificationStatus === 'rejected'

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 1.5rem 5rem' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:'none', border:'none', cursor:'pointer',
          fontFamily:'var(--font-sans)', fontSize:'.875rem', color:'var(--ink-300)',
          padding:'4px 0', marginBottom:'1.5rem', transition:'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color='var(--ink-700)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--ink-300)'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to campaigns
      </button>

      {/* Status banners */}
      {txStatus && (
        <div style={{
          marginBottom:'1.25rem', padding:'12px 16px', borderRadius:'var(--radius-md)',
          fontFamily:'var(--font-sans)', fontSize:'.875rem', fontWeight:500,
          background: txStatus==='error' ? 'var(--error-50)' : 'var(--teal-50)',
          color: txStatus==='error' ? 'var(--error-500)' : 'var(--teal-600)',
          border: `1px solid ${txStatus==='error' ? '#fecdd3' : 'var(--teal-100)'}`,
        }}>
          {txStatus==='pending'   && '⏳ Waiting for transaction confirmation…'}
          {txStatus==='refunded'  && '✓ Refund processed successfully.'}
          {txStatus==='withdrawn' && '✓ Funds withdrawn to your wallet.'}
          {txStatus==='error'     && '✗ Transaction failed. Please try again.'}
        </div>
      )}

      {(isPending || isRejected) && (
        <div style={{
          marginBottom:'1.25rem', padding:'12px 16px', borderRadius:'var(--radius-md)',
          background: isRejected ? 'var(--error-50)' : 'var(--amber-50)',
          color: isRejected ? 'var(--error-500)' : 'var(--amber-500)',
          border: `1px solid ${isRejected ? '#fecdd3' : 'var(--amber-100)'}`,
          fontFamily:'var(--font-sans)', fontSize:'.875rem',
        }}>
          {isPending  && '⏳ This campaign is pending admin verification. Donations are not yet enabled.'}
          {isRejected && '✕ This campaign has been rejected and is not accepting donations.'}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'2.5rem', alignItems:'start' }}>

        {/* ── LEFT ── */}
        <div>
          {/* Image */}
          <div style={{
            width:'100%', height:'clamp(240px, 40vw, 420px)',
            borderRadius:'var(--radius-xl)', overflow:'hidden',
            background:'var(--cream-100)', marginBottom:'1.75rem',
            boxShadow:'var(--shadow-md)',
          }}>
            {campaign.imageHash ? (
              <img src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
                alt={campaign.title}
                style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            ) : (
              <div style={{
                width:'100%', height:'100%',
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'linear-gradient(135deg, var(--teal-50), var(--cream-100))',
              }}>
                <span style={{fontFamily:'var(--font-serif)',fontSize:'1.5rem',color:'var(--ink-100)'}}>No image</span>
              </div>
            )}
          </div>

          {/* Title + badges */}
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem', flexWrap:'wrap' }}>
              {campaign.category && (
                <span style={{
                  background:'var(--cream-100)', color:'var(--ink-500)',
                  fontFamily:'var(--font-sans)', fontSize:'.72rem', fontWeight:600,
                  padding:'3px 10px', borderRadius:'var(--radius-full)',
                  textTransform:'uppercase', letterSpacing:'.04em',
                }}>
                  {campaign.category}
                </span>
              )}
              {isVerified && (
                <span style={{
                  background:'var(--teal-50)', color:'var(--teal-600)',
                  fontFamily:'var(--font-sans)', fontSize:'.72rem', fontWeight:600,
                  padding:'3px 10px', borderRadius:'var(--radius-full)',
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Verified
                </span>
              )}
              <span style={{
                background: isFiat ? 'var(--teal-50)' : 'var(--cream-100)',
                color: isFiat ? 'var(--teal-600)' : 'var(--ink-500)',
                fontFamily:'var(--font-sans)', fontSize:'.72rem', fontWeight:600,
                padding:'3px 10px', borderRadius:'var(--radius-full)',
              }}>
                {isFiat ? 'UPI / Card' : 'ETH'}
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '-.015em',
              color: 'var(--ink-900)',
              margin: '0 0 .5rem',
            }}>
              {campaign.title}
            </h1>

            {campaign.ownerName && (
              <p style={{ fontFamily:'var(--font-sans)', fontSize:'.875rem', color:'var(--ink-300)' }}>
                by <span style={{ color:'var(--ink-500)', fontWeight:500 }}>{campaign.ownerName}</span>
                {campaign.ownerUsername && <span style={{color:'var(--teal-500)'}}> @{campaign.ownerUsername}</span>}
              </p>
            )}
          </div>

          {/* Progress */}
          <div style={{
            background:'#fff', border:'1px solid var(--cream-200)',
            borderRadius:'var(--radius-lg)', padding:'1.25rem',
            marginBottom:'1.5rem', boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'1.25rem' }}>
              {[
                { label:'Raised', value: fmt(raised, isFiat), color:'var(--teal-600)' },
                { label:'Goal',   value: fmt(goal, isFiat),   color:'var(--ink-900)' },
                { label:'Donors', value: campaign.funders || 0, color:'var(--ink-900)' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.4rem', color:s.color }}>{s.value}</div>
                  <div style={{ fontFamily:'var(--font-sans)', fontSize:'.75rem', color:'var(--ink-300)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height:8, background:'var(--cream-100)', borderRadius:'var(--radius-full)', overflow:'hidden', marginBottom:8 }}>
              <div style={{
                height:'100%', width:`${pct}%`,
                background:'linear-gradient(90deg, var(--teal-500), var(--amber-400))',
                borderRadius:'var(--radius-full)',
                transition:'width .8s cubic-bezier(.4,0,.2,1)',
              }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-sans)', fontSize:'.8rem' }}>
              <span style={{ color:'var(--teal-600)', fontWeight:500 }}>{pct.toFixed(1)}% funded</span>
              <span style={{ color:'var(--ink-300)' }}>{timeLeft(campaign.deadline)}</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:'1.5rem' }}>
            <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', color:'var(--ink-900)', marginBottom:'.75rem' }}>
              About this campaign
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '.95rem',
              lineHeight: 1.75,
              color: 'var(--ink-500)',
              whiteSpace: 'pre-wrap',
            }}>
              {campaign.description}
            </p>
          </div>

          {/* Owner actions */}
          {isOwner && (isGoalMet || (isExpired && !isGoalMet)) && (
            <div style={{ display:'flex', gap:10 }}>
              {isExpired && !isGoalMet && isVerified && (
                <button onClick={handleRefund} disabled={txStatus==='pending' || !refund}
                  className="btn-secondary"
                  style={{ borderColor:'var(--teal-200)', opacity: txStatus==='pending' ? .5 : 1 }}>
                  Claim Refund
                </button>
              )}
              {isGoalMet && !campaign.claimed && (
                <button onClick={handleWithdraw} disabled={txStatus==='pending' || !claimFunds}
                  className="btn-primary"
                  style={{ opacity: txStatus==='pending' ? .5 : 1 }}>
                  Withdraw Funds
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Donation panel ── */}
        <div style={{ position:'sticky', top:84 }}>
          {isVerified ? (
            isFiat ? (
              <UpiDonationPanel campaign={campaign} onSuccess={refetch} />
            ) : (
              <DonationPanel campaign={campaign} donate={donate} onSuccess={refetch} />
            )
          ) : (
            <div style={{
              background:'#fff', border:'1px solid var(--cream-200)',
              borderRadius:'var(--radius-xl)', padding:'2rem', textAlign:'center',
              boxShadow:'var(--shadow-sm)',
            }}>
              <div style={{
                width:56, height:56, borderRadius:'50%',
                background:'var(--amber-50)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 1rem',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--amber-400)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.05rem', color:'var(--ink-700)', marginBottom:'.5rem' }}>
                Donations not available
              </p>
              <p style={{ fontFamily:'var(--font-sans)', fontSize:'.85rem', color:'var(--ink-300)' }}>
                {isPending ? 'Awaiting admin verification' : isRejected ? 'Campaign was rejected' : 'Not yet verified'}
              </p>
            </div>
          )}

          {/* Trust signals */}
          <div style={{
            marginTop:'1rem', background:'var(--cream-50)',
            border:'1px solid var(--cream-200)', borderRadius:'var(--radius-md)',
            padding:'1rem',
          }}>
            {[
              { icon:'🔒', text:'Secure payments via Stripe' },
              { icon:'⛓️', text:'Blockchain-verified campaign' },
              { icon:'↩️',  text:'Refunds available within 7 days' },
            ].map(t => (
              <div key={t.text} style={{ display:'flex', alignItems:'center', gap:10,
                fontFamily:'var(--font-sans)', fontSize:'.78rem', color:'var(--ink-300)',
                padding:'4px 0',
              }}>
                <span>{t.icon}</span><span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns: 1fr 380px"] {
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
