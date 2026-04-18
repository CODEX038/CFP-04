/**
 * MyCampaigns.jsx — Fully responsive
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import { ethers } from 'ethers'
import { CAMPAIGN_ABI } from '../utils/constants'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'

const STATUS_STYLE = {
  active:   { bg: 'var(--purple-50)',  color: 'var(--purple-700)' },
  funded:   { bg: 'var(--teal-50)',    color: 'var(--teal-700)'   },
  expiring: { bg: 'var(--warning-50)', color: '#c2410c'           },
  expired:  { bg: 'var(--bg-muted)',   color: 'var(--text-muted)' },
  paused:   { bg: 'var(--error-50)',   color: 'var(--error-700)'  },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize:'0.7rem', fontWeight:700,
      padding:'2px 9px', borderRadius:'var(--r-full)',
      textTransform:'capitalize', flexShrink:0,
    }}>{status}</span>
  )
}

const getCampaignStatus = (c) => {
  if (c.paused) return 'paused'
  const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
  const pct = parseFloat(c.amountRaised || c.raised || 0) / parseFloat(c.goal || 1)
  if (pct >= 1) return 'funded'
  if (Date.now() >= deadlineMs) return 'expired'
  if ((deadlineMs - Date.now()) < 864e5) return 'expiring'
  return 'active'
}

export default function MyCampaigns() {
  const navigate = useNavigate()
  const { account, signer } = useWallet()
  const { campaigns: all, loading } = useCampaigns()
  const [activeTab, setActiveTab] = useState('all')
  const [actionLoading, setActionLoading] = useState({})

  const mine = all.filter(c => c.owner?.toLowerCase() === account?.toLowerCase())
  const ethMine  = mine.filter(c => c.paymentType !== 'fiat')
  const fiatMine = mine.filter(c => c.paymentType === 'fiat')
  const totalEth = ethMine.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const totalInr = fiatMine.reduce((s, c) => s + parseFloat(c.amountRaised || c.raised || 0), 0)
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
    if (!signer || campaign.paymentType === 'fiat') return
    try {
      setActionLoading(p => ({ ...p, [campaign.contractAddress]: 'pausing' }))
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      const tx = campaign.paused ? await contract.resume?.() : await contract.pause?.()
      await tx.wait()
      window.location.reload()
    } catch(e) { alert(e.message) }
    finally { setActionLoading(p => ({ ...p, [campaign.contractAddress]: null })) }
  }

  const handleClaim = async (campaign) => {
    if (!signer) return
    try {
      setActionLoading(p => ({ ...p, [campaign.contractAddress]: 'claiming' }))
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      const tx = await contract.claim?.()
      await tx.wait()
      window.location.reload()
    } catch(e) { alert(e.message) }
    finally { setActionLoading(p => ({ ...p, [campaign.contractAddress]: null })) }
  }

  if (!account) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:16 }}>
      <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--purple-50)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--purple-600)" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <p style={{ color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>Connect your wallet to view your campaigns.</p>
    </div>
  )

  return (
    <div style={{ maxWidth:'var(--content-max)', margin:'0 auto', paddingBottom:'4rem' }}>

      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.5rem,4vw,2rem)', color:'var(--text-primary)', marginBottom:'.25rem' }}>
          My Campaigns
        </h1>
        <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>
          Manage and track your fundraising campaigns
        </p>
      </div>

      {/* Stat cards — responsive grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Active Campaigns', value: activeCnt, icon:'📊' },
          { label:'Successfully Funded', value: fundedCnt, icon:'✅' },
          { label:'ETH Raised', value: `${totalEth.toFixed(3)} ETH`, icon:'⟠' },
          { label:'UPI Raised', value: `₹${totalInr.toLocaleString('en-IN')}`, icon:'₹' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding:'1.125rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
              <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{s.label}</span>
              <span style={{ fontSize:'1.1rem' }}>{s.icon}</span>
            </div>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', color:'var(--text-primary)', margin:0, lineHeight:1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div style={{
        display:'flex', gap:'3px', background:'var(--bg-card)',
        border:'1px solid var(--border)', borderRadius:'var(--r-lg)',
        padding:'4px', marginBottom:'1.25rem', overflowX:'auto',
        boxShadow:'var(--shadow-xs)',
      }} className="hide-scroll">
        {Object.entries(tabs).map(([key, list]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flexShrink:0, padding:'7px 16px', borderRadius:'var(--r-md)',
            border:'none', cursor:'pointer', fontFamily:'var(--font-sans)',
            fontSize:'0.82rem', fontWeight:500, whiteSpace:'nowrap', transition:'all 0.15s',
            background: activeTab===key ? 'linear-gradient(135deg,var(--purple-600),var(--purple-700))' : 'transparent',
            color: activeTab===key ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab===key ? '0 2px 8px rgba(124,58,237,.3)' : 'none',
          }}>
            {key.charAt(0).toUpperCase() + key.slice(1)} ({list.length})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4rem', gap:12 }}>
          <div className="spinner"/>
          <p style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>Loading campaigns…</p>
        </div>
      ) : tabs[activeTab].length === 0 ? (
        <div className="card" style={{ padding:'clamp(2.5rem, 6vw, 4rem)', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📭</div>
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', color:'var(--text-primary)', marginBottom:'.5rem' }}>
            No campaigns found
          </h3>
          <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1.5rem' }}>
            {activeTab==='all' ? "You haven't created any campaigns yet" : `No ${activeTab} campaigns`}
          </p>
          <button onClick={() => navigate('/campaign/create')} className="btn btn-primary">
            + Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {tabs[activeTab].map(campaign => {
            const status = getCampaignStatus(campaign)
            const isFiat = campaign.paymentType === 'fiat'
            const pct    = Math.min((parseFloat(campaign.amountRaised||0)/parseFloat(campaign.goal||1))*100, 100)
            const fmt    = n => isFiat
              ? `₹${parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits:0 })}`
              : `${parseFloat(n).toFixed(4)} ETH`

            return (
              <div key={campaign.contractAddress} className="card" style={{ padding:'1.25rem', transition:'all 0.2s' }}>
                <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>

                  {/* Thumbnail */}
                  <div style={{
                    width:'clamp(80px,20vw,140px)', height:'clamp(60px,15vw,90px)',
                    borderRadius:'var(--r-md)', overflow:'hidden',
                    background:'var(--bg-muted)', flexShrink:0, cursor:'pointer',
                  }} onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}>
                    {campaign.imageHash
                      ? <img src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`} alt={campaign.title}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem' }}>🎯</div>
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                      <h3 style={{
                        fontFamily:'var(--font-serif)', fontSize:'1rem',
                        color:'var(--text-primary)', margin:0, lineHeight:1.3,
                        cursor:'pointer',
                      }}
                      onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}>
                        {campaign.title}
                      </h3>
                      <div style={{ display:'flex', gap:5, flexShrink:0, flexWrap:'wrap' }}>
                        <StatusBadge status={status}/>
                        {campaign.verificationStatus==='verified' && (
                          <span style={{ background:'var(--teal-50)', color:'var(--teal-700)', fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:'var(--r-full)' }}>
                            ✓ Verified
                          </span>
                        )}
                        <span style={{ background: isFiat?'var(--teal-50)':'var(--purple-50)', color: isFiat?'var(--teal-700)':'var(--purple-700)', fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:'var(--r-full)' }}>
                          {isFiat?'UPI':'ETH'}
                        </span>
                      </div>
                    </div>

                    <ProgressBar percent={pct}/>

                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', flexWrap:'wrap', gap:4 }}>
                      <span>
                        <strong style={{ color:'var(--text-primary)' }}>{fmt(campaign.amountRaised)}</strong>
                        <span style={{ color:'var(--text-muted)' }}> / {fmt(campaign.goal)}</span>
                      </span>
                      <div style={{ display:'flex', gap:'0.75rem', color:'var(--text-muted)' }}>
                        <span>{campaign.funders||0} funders</span>
                        <span style={{ color: pct>=100?'var(--teal-600)':'var(--purple-600)', fontWeight:600 }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      paddingTop:'0.625rem', borderTop:'1px solid var(--border-light)',
                      flexWrap:'wrap', gap:8,
                    }}>
                      <CountdownTimer deadline={campaign.deadline}/>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {campaign.paymentType !== 'fiat' && (
                          <>
                            <button onClick={() => handlePause(campaign)}
                              disabled={actionLoading[campaign.contractAddress]==='pausing'}
                              className="btn btn-secondary btn-sm"
                              style={{ opacity: actionLoading[campaign.contractAddress]==='pausing'?.5:1 }}>
                              {actionLoading[campaign.contractAddress]==='pausing' ? 'Pausing…' : campaign.paused ? 'Resume' : 'Pause'}
                            </button>
                            {pct>=100 && !campaign.claimed && (
                              <button onClick={() => handleClaim(campaign)}
                                disabled={actionLoading[campaign.contractAddress]==='claiming'}
                                className="btn btn-sm"
                                style={{ background:'var(--teal-600)', color:'#fff', opacity: actionLoading[campaign.contractAddress]==='claiming'?.5:1 }}>
                                {actionLoading[campaign.contractAddress]==='claiming' ? 'Claiming…' : 'Claim Funds'}
                              </button>
                            )}
                          </>
                        )}
                        <button onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                          className="btn btn-primary btn-sm">
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
