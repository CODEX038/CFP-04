/**
 * CampaignCard.jsx — Fully responsive card component
 */
import { useNavigate } from 'react-router-dom'

const fmtINR = (n) => {
  const num = parseFloat(n) || 0
  if (num >= 1e7) return `₹${(num/1e7).toFixed(1)}Cr`
  if (num >= 1e5) return `₹${(num/1e5).toFixed(1)}L`
  if (num >= 1e3) return `₹${(num/1e3).toFixed(1)}K`
  return `₹${num.toLocaleString('en-IN')}`
}

const timeLeft = (deadline) => {
  const ms = deadline - Date.now()
  if (ms <= 0) return { label:'Ended', urgent:false, expired:true }
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d > 30) return { label:`${Math.floor(d/30)}mo left`, urgent:false, expired:false }
  if (d > 0)  return { label:`${d}d left`, urgent:d<=3, expired:false }
  return { label:`${h}h left`, urgent:true, expired:false }
}

const CATEGORY_COLORS = {
  medical:     { bg:'#fef2f2', text:'#991b1b' },
  education:   { bg:'#eff6ff', text:'#1e40af' },
  environment: { bg:'#ecfdf5', text:'#065f46' },
  animals:     { bg:'#fff7ed', text:'#c2410c' },
  community:   { bg:'#f5f3ff', text:'#5b21b6' },
  health:      { bg:'#fef2f2', text:'#991b1b' },
  technology:  { bg:'#eff6ff', text:'#1e40af' },
  arts:        { bg:'#fdf4ff', text:'#7e22ce' },
  sports:      { bg:'#f0fdf4', text:'#166534' },
}

export default function CampaignCard({ campaign }) {
  const navigate = useNavigate()
  const isFiat  = campaign.paymentType === 'fiat'
  const raised  = parseFloat(campaign.amountRaised || campaign.raised || 0)
  const goal    = parseFloat(campaign.goal || 0)
  const pct     = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const time    = timeLeft(campaign.deadline)
  const cat     = (campaign.category || 'community').toLowerCase()
  const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.community
  const isVerif = campaign.verificationStatus === 'verified'

  return (
    <article
      onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        boxShadow: 'var(--shadow-xs)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
        e.currentTarget.style.borderColor = 'var(--purple-200)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Image */}
      <div style={{ position:'relative', height:'clamp(160px, 30vw, 210px)', overflow:'hidden', background:'var(--bg-muted)', flexShrink:0 }}>
        {campaign.imageHash ? (
          <img
            src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
            alt={campaign.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s ease' }}
            onMouseEnter={e => e.target.style.transform='scale(1.05)'}
            onMouseLeave={e => e.target.style.transform='scale(1)'}
            loading="lazy"
          />
        ) : (
          <div style={{
            width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg, var(--purple-50), var(--teal-50))',
            fontSize:'2.5rem',
          }}>🎯</div>
        )}

        {/* Top overlays */}
        <div style={{ position:'absolute', top:10, left:10, right:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
          <span style={{
            background: catColor.bg, color: catColor.text,
            fontSize:'0.65rem', fontWeight:700, padding:'3px 9px',
            borderRadius:'var(--r-full)', textTransform:'uppercase', letterSpacing:'0.04em',
          }}>{campaign.category || 'General'}</span>

          <span style={{
            background: time.expired ? 'rgba(17,24,39,0.75)' : time.urgent ? 'rgba(220,38,38,0.85)' : 'rgba(17,24,39,0.65)',
            color:'#fff', fontSize:'0.67rem', fontWeight:600,
            padding:'3px 9px', borderRadius:'var(--r-full)',
          }}>{time.label}</span>
        </div>

        {/* Payment type badge */}
        <div style={{ position:'absolute', bottom:10, right:10 }}>
          <span style={{
            background: isFiat ? 'rgba(16,185,129,0.85)' : 'rgba(109,40,217,0.85)',
            color:'#fff', fontSize:'0.65rem', fontWeight:700,
            padding:'2px 8px', borderRadius:'var(--r-full)',
          }}>{isFiat ? 'UPI' : 'ETH'}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'1rem', flex:1, display:'flex', flexDirection:'column', gap:'0.625rem' }}>

        {/* Title & verified */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(0.92rem, 2vw, 1rem)',
            fontWeight: 400, color: 'var(--text-primary)',
            lineHeight: 1.35, margin: 0, flex: 1,
          }}>
            {campaign.title}
          </h3>
          {isVerif && (
            <span style={{
              flexShrink:0, marginTop:2,
              background:'var(--teal-50)', color:'var(--teal-700)',
              fontSize:'0.62rem', fontWeight:700, padding:'2px 7px',
              borderRadius:'var(--r-full)', display:'flex', alignItems:'center', gap:3,
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              Verified
            </span>
          )}
        </div>

        {campaign.ownerName && (
          <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:0 }}>
            by {campaign.ownerName}
          </p>
        )}

        {/* Progress — pushed to bottom */}
        <div style={{ marginTop:'auto', paddingTop:'0.375rem' }}>
          <div style={{ height:6, background:'var(--bg-muted)', borderRadius:'var(--r-full)', overflow:'hidden', marginBottom:'0.5rem' }}>
            <div style={{
              height:'100%', width:`${pct}%`,
              background: pct>=100
                ? 'linear-gradient(90deg, #059669, #10b981)'
                : 'linear-gradient(90deg, var(--purple-600), var(--purple-400))',
              borderRadius:'var(--r-full)',
              transition:'width 0.6s ease',
            }}/>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div>
              <span style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:'0.875rem', color:'var(--purple-600)' }}>
                {isFiat ? fmtINR(raised) : `${parseFloat(raised).toFixed(3)} ETH`}
              </span>
              <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginLeft:3 }}>raised</span>
            </div>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
              {pct.toFixed(0)}%
            </span>
          </div>

          {campaign.funders > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:'0.375rem' }}>
              <div style={{ display:'flex' }}>
                {[...Array(Math.min(campaign.funders, 3))].map((_, i) => (
                  <div key={i} style={{
                    width:16, height:16, borderRadius:'50%',
                    background:`hsl(${260+i*20}, 60%, 65%)`,
                    border:'1.5px solid var(--bg-card)',
                    marginLeft: i===0?0:-5,
                  }}/>
                ))}
              </div>
              <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>
                {campaign.funders} supporter{campaign.funders!==1?'s':''}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
