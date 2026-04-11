import { useNavigate } from 'react-router-dom'

const fmt = (n) => {
  const num = parseFloat(n) || 0
  if (num >= 1e7) return `₹${(num/1e7).toFixed(1)}Cr`
  if (num >= 1e5) return `₹${(num/1e5).toFixed(1)}L`
  if (num >= 1e3) return `₹${(num/1e3).toFixed(1)}K`
  return `₹${num.toLocaleString('en-IN')}`
}

const fmtEth = (n) => `${parseFloat(n || 0).toFixed(3)} ETH`

const timeLeft = (deadline) => {
  const ms = deadline - Date.now()
  if (ms <= 0) return { label: 'Ended', urgent: false, expired: true }
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d > 30) return { label: `${Math.floor(d/30)}mo left`, urgent: false, expired: false }
  if (d > 0)  return { label: `${d}d left`, urgent: d <= 3, expired: false }
  return { label: `${h}h left`, urgent: true, expired: false }
}

const CATEGORY_COLORS = {
  medical:     { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
  education:   { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  environment: { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  animals:     { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  community:   { bg: '#F5F3FF', text: '#6D28D9', dot: '#8B5CF6' },
  disaster:    { bg: '#FEF9C3', text: '#A16207', dot: '#EAB308' },
  arts:        { bg: '#FDF4FF', text: '#7E22CE', dot: '#A855F7' },
  sports:      { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
}

export default function CampaignCard({ campaign }) {
  const navigate = useNavigate()
  const isFiat  = campaign.paymentType === 'fiat'
  const raised  = isFiat ? (campaign.raised || 0) : parseFloat(campaign.amountRaised || 0)
  const goal    = parseFloat(campaign.goal || 0)
  const pct     = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0
  const time    = timeLeft(campaign.deadline)
  const cat     = (campaign.category || 'community').toLowerCase()
  const colors  = CATEGORY_COLORS[cat] || CATEGORY_COLORS.community
  const isVerif = campaign.verificationStatus === 'verified'

  return (
    <article
      onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
      style={{
        background: '#fff',
        border: '1px solid var(--cream-200)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .2s, box-shadow .2s, border-color .2s',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = 'var(--cream-300)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.borderColor = 'var(--cream-200)'
      }}
    >
      {/* Image */}
      <div style={{ position:'relative', height:186, overflow:'hidden', background: 'var(--cream-100)', flexShrink:0 }}>
        {campaign.imageHash ? (
          <img
            src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
            alt={campaign.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .35s' }}
            onMouseEnter={e => e.target.style.transform='scale(1.04)'}
            onMouseLeave={e => e.target.style.transform='scale(1)'}
            loading="lazy"
          />
        ) : (
          <div style={{
            width:'100%', height:'100%',
            display:'flex', alignItems:'center', justifyContent:'center',
            background: `linear-gradient(135deg, ${colors.bg}, #fff)`,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.dot} strokeWidth="1" opacity=".5">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Overlays */}
        <div style={{ position:'absolute', top:10, left:10, right:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          {/* Category */}
          <span style={{
            background: colors.bg,
            color: colors.text,
            fontSize: '.68rem',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)',
            letterSpacing: '.03em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(4px)',
          }}>
            {campaign.category || 'General'}
          </span>

          {/* Time */}
          <span style={{
            background: time.expired ? 'rgba(26,20,16,.7)' : time.urgent ? 'rgba(220,53,69,.85)' : 'rgba(26,20,16,.6)',
            color: '#fff',
            fontSize: '.7rem',
            fontWeight: 500,
            padding: '3px 9px',
            borderRadius: 'var(--radius-full)',
            backdropFilter: 'blur(4px)',
          }}>
            {time.label}
          </span>
        </div>

        {/* Payment type */}
        <div style={{ position:'absolute', bottom:10, right:10 }}>
          <span style={{
            background: isFiat ? 'rgba(13,122,106,.85)' : 'rgba(62,36,14,.75)',
            color:'#fff',
            fontSize:'.68rem',
            fontWeight:600,
            padding:'3px 8px',
            borderRadius:'var(--radius-full)',
            backdropFilter:'blur(4px)',
          }}>
            {isFiat ? 'UPI' : 'ETH'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'1rem 1.1rem', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
        {/* Title */}
        <div>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.05rem',
              fontWeight: 400,
              color: 'var(--ink-900)',
              lineHeight: 1.3,
              margin: 0,
              flex: 1,
            }}>
              {campaign.title}
            </h3>
            {isVerif && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:2}}>
                <path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5.9-5.6L4 8l5.6-1.1L12 2z" fill="var(--teal-500)" opacity=".2"/>
                <path d="M9 12l2 2 4-4" stroke="var(--teal-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          {campaign.ownerName && (
            <p style={{ fontSize:'.75rem', color:'var(--ink-300)', marginTop:3 }}>by {campaign.ownerName}</p>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginTop:'auto' }}>
          <div style={{
            height: 5,
            background: 'var(--cream-100)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            marginBottom: 7,
          }}>
            <div style={{
              height:'100%',
              width: `${pct}%`,
              background: pct >= 100
                ? 'linear-gradient(90deg, var(--teal-500), #22c55e)'
                : 'linear-gradient(90deg, var(--teal-500), var(--amber-400))',
              borderRadius: 'var(--radius-full)',
              transition: 'width .6s cubic-bezier(.4,0,.2,1)',
            }}/>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div>
              <span style={{ fontFamily:'var(--font-sans)', fontWeight:600, fontSize:'.9rem', color:'var(--teal-600)' }}>
                {isFiat ? fmt(raised) : fmtEth(raised)}
              </span>
              <span style={{ fontSize:'.75rem', color:'var(--ink-300)', marginLeft:4 }}>raised</span>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:'.75rem', color:'var(--ink-300)' }}>
                {pct.toFixed(0)}% of {isFiat ? fmt(goal) : fmtEth(goal)}
              </span>
            </div>
          </div>

          {/* Funders */}
          {campaign.funders > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
              <div style={{ display:'flex' }}>
                {[...Array(Math.min(campaign.funders, 3))].map((_, i) => (
                  <div key={i} style={{
                    width:18, height:18, borderRadius:'50%',
                    background: `hsl(${160 + i*30}, 40%, 60%)`,
                    border:'1.5px solid #fff',
                    marginLeft: i === 0 ? 0 : -5,
                  }}/>
                ))}
              </div>
              <span style={{ fontSize:'.72rem', color:'var(--ink-300)' }}>
                {campaign.funders} supporter{campaign.funders !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
