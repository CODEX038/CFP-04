import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import { ethers } from 'ethers'
import { CAMPAIGN_ABI } from '../utils/constants'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'

const STATUS_STYLE = {
  active:   { bg: '#f3f0ff', color: '#6d28d9' },
  funded:   { bg: '#f0fdf4', color: '#15803d' },
  expiring: { bg: '#fff7ed', color: '#c2410c' },
  expired:  { bg: '#f9fafb', color: '#6b7280' },
  paused:   { bg: '#fef2f2', color: '#dc2626' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 600,
      padding: '3px 10px', borderRadius: 'var(--radius-full)', textTransform: 'capitalize',
    }}>{status}</span>
  )
}

const getCampaignStatus = (c) => {
  if (c.paused) return 'paused'
  const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
  const pct = parseFloat(c.amountRaised) / parseFloat(c.goal)
  if (pct >= 1) return 'funded'
  if (Date.now() >= deadlineMs) return 'expired'
  if ((deadlineMs - Date.now()) < 864e5) return 'expiring'
  return 'active'
}

export default function MyCampaigns() {
  const navigate = useNavigate()
  const { account, signer } = useWallet()
  const { campaigns: all, loading } = useCampaigns()
  const [activeTab, setActiveTab]         = useState('all')
  const [actionLoading, setActionLoading] = useState({})

  const mine = all.filter(c => c.owner?.toLowerCase() === account?.toLowerCase())

  const ethMine  = mine.filter(c => c.paymentType !== 'fiat')
  const fiatMine = mine.filter(c => c.paymentType === 'fiat')
  const totalEth = ethMine.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const totalInr = fiatMine.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const activeCnt = mine.filter(c => !c.paused && Date.now() < (c.deadline > 1e12 ? c.deadline : c.deadline * 1000)).length
  const fundedCnt = mine.filter(c => parseFloat(c.amountRaised || 0) >= parseFloat(c.goal)).length

  const tabs = {
    all:      mine,
    active:   mine.filter(c => getCampaignStatus(c) === 'active'),
    funded:   mine.filter(c => getCampaignStatus(c) === 'funded'),
    expiring: mine.filter(c => getCampaignStatus(c) === 'expiring'),
    expired:  mine.filter(c => getCampaignStatus(c) === 'expired'),
  }

  const handlePause = async (campaign) => {
    if (!signer || campaign.paymentType === 'fiat') return alert('Not supported')
    try {
      setActionLoading(p => ({ ...p, [campaign.contractAddress]: 'pausing' }))
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      const tx = campaign.paused ? await contract.resume() : await contract.pause()
      await tx.wait()
      window.location.reload()
    } catch (e) { alert(e.message) }
    finally { setActionLoading(p => ({ ...p, [campaign.contractAddress]: null })) }
  }

  const handleClaim = async (campaign) => {
    if (!signer) return
    try {
      setActionLoading(p => ({ ...p, [campaign.contractAddress]: 'claiming' }))
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      const tx = await contract.claim()
      await tx.wait()
      window.location.reload()
    } catch (e) { alert(e.message) }
    finally { setActionLoading(p => ({ ...p, [campaign.contractAddress]: null })) }
  }

  if (!account) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--teal-50)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-500)" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-300)' }}>Connect your wallet to view your campaigns.</p>
    </div>
  )

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 1.5rem 5rem' }}>

      {/* Header */}
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'2rem', fontWeight:400, color:'var(--ink-900)', marginBottom:'.35rem' }}>
          My Campaigns
        </h1>
        <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-300)', fontSize:'.9rem' }}>
          Manage and track your fundraising campaigns
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1.25rem', marginBottom:'2rem' }}>
        {[
          { label:'Active Campaigns', value:activeCnt, icon:'📊', color:'var(--ink-900)' },
          { label:'Funded',           value:fundedCnt, icon:'✓',   color:'#15803d' },
          { label:'Total Raised',     valueNode: (
              <div>
                {totalEth > 0 && <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.6rem', color:'var(--ink-900)', lineHeight:1 }}>{totalEth.toFixed(3)} ETH</p>}
                {totalInr > 0 && <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.6rem', color:'var(--ink-900)', lineHeight:1 }}>₹{totalInr.toLocaleString('en-IN')}</p>}
                {!totalEth && !totalInr && <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.6rem', color:'var(--ink-900)', lineHeight:1 }}>0.00</p>}
              </div>
            ), icon:'💰', color:'var(--ink-900)' },
        ].map((s, i) => (
          <div key={i} style={{
            background:'#fff', border:'1px solid var(--cream-200)',
            borderRadius:'var(--radius-lg)', padding:'1.5rem',
            boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.75rem' }}>
              <span style={{ fontFamily:'var(--font-sans)', fontSize:'.875rem', color:'var(--ink-300)' }}>{s.label}</span>
              <div style={{
                width:40, height:40, borderRadius:'50%', background:'var(--cream-100)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
              }}>{s.icon}</div>
            </div>
            {s.valueNode || (
              <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.8rem', color: s.color, lineHeight:1 }}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        background:'#fff', border:'1px solid var(--cream-200)',
        borderRadius:'var(--radius-lg)', padding:8,
        display:'flex', gap:4, overflowX:'auto', marginBottom:'1.25rem',
        boxShadow:'var(--shadow-sm)',
      }}>
        {Object.entries(tabs).map(([key, list]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding:'8px 16px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer',
            fontFamily:'var(--font-sans)', fontSize:'.85rem', fontWeight:500,
            whiteSpace:'nowrap', transition:'all .15s',
            ...(activeTab === key
              ? { background:'linear-gradient(135deg,var(--teal-500),var(--teal-700))', color:'#fff', boxShadow:'0 2px 8px rgba(13,122,106,.3)' }
              : { background:'transparent', color:'var(--ink-500)' })
          }}>
            {key.charAt(0).toUpperCase() + key.slice(1)} ({list.length})
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'5rem', gap:16 }}>
          <div className="spinner"/>
          <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-300)', fontSize:'.875rem' }}>Loading campaigns...</p>
        </div>
      ) : tabs[activeTab].length === 0 ? (
        <div style={{
          background:'#fff', border:'1px solid var(--cream-200)',
          borderRadius:'var(--radius-xl)', padding:'4rem', textAlign:'center',
          boxShadow:'var(--shadow-sm)',
        }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>📭</div>
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--ink-700)', marginBottom:'.5rem' }}>
            No campaigns found
          </h3>
          <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-300)', fontSize:'.875rem', marginBottom:'1.5rem' }}>
            {activeTab === 'all' ? "You haven't created any campaigns yet" : `No ${activeTab} campaigns`}
          </p>
          <button onClick={() => navigate('/campaign/create')} className="btn-primary">
            + Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {tabs[activeTab].map(campaign => {
            const status = getCampaignStatus(campaign)
            const isFiat = campaign.paymentType === 'fiat'
            const pct    = Math.min((parseFloat(campaign.amountRaised || 0) / parseFloat(campaign.goal || 1)) * 100, 100)
            const fmt    = n => isFiat
              ? `₹${parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits:0 })}`
              : `${parseFloat(n).toFixed(4)} ETH`

            return (
              <div key={campaign.contractAddress} style={{
                background:'#fff', border:'1px solid var(--cream-200)',
                borderRadius:'var(--radius-lg)', padding:'1.5rem',
                boxShadow:'var(--shadow-sm)', transition:'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--teal-100)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--cream-200)'}>

                <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                  {/* Thumbnail */}
                  <div style={{
                    width:192, height:120, borderRadius:'var(--radius-md)', overflow:'hidden',
                    background:'var(--cream-100)', flexShrink:0, cursor:'pointer',
                  }} onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}>
                    {campaign.imageHash
                      ? <img src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`} alt={campaign.title}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--cream-300)" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="3"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                          </svg>
                        </div>
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:0, cursor:'pointer' }}
                        onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.05rem', color:'var(--ink-900)', margin:0, lineHeight:1.3 }}>
                            {campaign.title}
                          </h3>
                          <StatusBadge status={status}/>
                          {campaign.verificationStatus === 'verified' && (
                            <span style={{
                              background:'var(--teal-50)', color:'var(--teal-600)',
                              fontFamily:'var(--font-sans)', fontSize:'.7rem', fontWeight:600,
                              padding:'2px 8px', borderRadius:'var(--radius-full)',
                            }}>✓ Verified</span>
                          )}
                        </div>
                        <p style={{ fontFamily:'var(--font-sans)', fontSize:'.75rem', color:'var(--ink-100)', margin:0, fontVariantNumeric:'tabular-nums' }}>
                          {campaign.contractAddress?.slice(0,10)}…{campaign.contractAddress?.slice(-8)}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <ProgressBar percent={pct}/>

                    <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-sans)', fontSize:'.85rem' }}>
                      <span>
                        <strong style={{ color:'var(--ink-900)' }}>{fmt(campaign.amountRaised)}</strong>
                        <span style={{ color:'var(--ink-300)' }}> / {fmt(campaign.goal)}</span>
                      </span>
                      <div style={{ display:'flex', gap:'1rem', color:'var(--ink-300)' }}>
                        <span>{campaign.funders || 0} funders</span>
                        <span style={{ color: pct >= 100 ? '#15803d' : 'var(--teal-500)', fontWeight:600 }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      paddingTop:'0.75rem', borderTop:'1px solid var(--cream-100)', flexWrap:'wrap', gap:8,
                    }}>
                      <CountdownTimer deadline={campaign.deadline}/>

                      <div style={{ display:'flex', gap:8 }}>
                        {campaign.paymentType !== 'fiat' && (
                          <>
                            <button onClick={() => handlePause(campaign)}
                              disabled={actionLoading[campaign.contractAddress] === 'pausing'}
                              style={{
                                padding:'7px 14px', border:'1.5px solid var(--cream-300)',
                                borderRadius:'var(--radius-full)',
                                fontFamily:'var(--font-sans)', fontSize:'.78rem', fontWeight:500,
                                color:'var(--ink-700)', background:'#fff', cursor:'pointer',
                                opacity: actionLoading[campaign.contractAddress] === 'pausing' ? .5 : 1,
                              }}>
                              {actionLoading[campaign.contractAddress] === 'pausing' ? 'Pausing…' : campaign.paused ? 'Resume' : 'Pause'}
                            </button>

                            {pct >= 100 && !campaign.claimed && (
                              <button onClick={() => handleClaim(campaign)}
                                disabled={actionLoading[campaign.contractAddress] === 'claiming'}
                                style={{
                                  padding:'7px 14px', border:'none', borderRadius:'var(--radius-full)',
                                  fontFamily:'var(--font-sans)', fontSize:'.78rem', fontWeight:600,
                                  color:'#fff', background:'#15803d', cursor:'pointer',
                                  opacity: actionLoading[campaign.contractAddress] === 'claiming' ? .5 : 1,
                                }}>
                                {actionLoading[campaign.contractAddress] === 'claiming' ? 'Claiming…' : 'Claim Funds'}
                              </button>
                            )}
                          </>
                        )}

                        <button onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                          className="btn-primary" style={{ fontSize:'.78rem', padding:'7px 16px' }}>
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
