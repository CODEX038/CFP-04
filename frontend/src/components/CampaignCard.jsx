import { useNavigate } from 'react-router-dom'

const fmt = (n) => {
  const num = parseFloat(n) || 0
  if (num >= 1e7) return `₹${(num/1e7).toFixed(1)}Cr`
  if (num >= 1e5) return `₹${(num/1e5).toFixed(1)}L`
  if (num >= 1e3) return `₹${(num/1e3).toFixed(1)}K`
  return `₹${num.toLocaleString('en-IN')}`
}

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
  medical:     { bg: '#FEF2F2', text: '#991B1B' },
  education:   { bg: '#EFF6FF', text: '#1E40AF' },
  environment: { bg: '#ECFDF5', text: '#065F46' },
  animals:     { bg: '#FFF7ED', text: '#C2410C' },
  community:   { bg: '#F5F3FF', text: '#5B21B6' },
  disaster:    { bg: '#FEFCE8', text: '#92400E' },
  arts:        { bg: '#FDF4FF', text: '#7E22CE' },
  sports:      { bg: '#F0FDF4', text: '#166534' },
  health:      { bg: '#FEF2F2', text: '#991B1B' },
  technology:  { bg: '#EFF6FF', text: '#1E40AF' },
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
      className="card"
      style={{
        cursor: 'pointer', overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0 }}>
        {campaign.imageHash ? (
          <img
            src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
            alt={campaign.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth=".8" opacity=".6">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}

        {/* Top overlays */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <span style={{
            background: colors.bg, color: colors.text,
            fontSize: '.68rem', fontWeight: 700, padding: '3px 9px',
            borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '.04em',
          }}>{campaign.category || 'General'}</span>

          <span style={{
            background: time.expired ? 'rgba(17,24,39,.75)' : time.urgent ? 'rgba(220,38,38,.85)' : 'rgba(17,24,39,.65)',
            color: '#fff', fontSize: '.7rem', fontWeight: 600,
            padding: '3px 9px', borderRadius: 'var(--radius-full)',
          }}>{time.label}</span>
        </div>

        {/* Bottom right: payment type */}
        <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
          <span style={{
            background: isFiat ? 'rgba(124,58,237,.85)' : 'rgba(30,20,60,.75)',
            color: '#fff', fontSize: '.68rem', fontWeight: 700,
            padding: '3px 8px', borderRadius: 'var(--radius-full)',
          }}>{isFiat ? 'UPI' : 'ETH'}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem 1.1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem', fontWeight: 400,
              color: 'var(--gray-900)', lineHeight: 1.35, margin: 0, flex: 1,
            }}>{campaign.title}</h3>
            {isVerif && (
              <span style={{
                flexShrink: 0, marginTop: 2,
                background: 'var(--teal-50)', color: 'var(--teal-600)',
                fontSize: '.65rem', fontWeight: 700, padding: '2px 7px',
                borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                Verified
              </span>
            )}
          </div>
          {campaign.ownerName && (
            <p style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginTop: 3 }}>by {campaign.ownerName}</p>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: pct >= 100
                ? 'linear-gradient(90deg, #059669, #10B981)'
                : 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
              borderRadius: 'var(--radius-full)',
              transition: 'width .6s cubic-bezier(.4,0,.2,1)',
            }}/>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '.9rem', color: 'var(--purple-600)' }}>
                {isFiat ? fmt(raised) : `${parseFloat(raised).toFixed(3)} ETH`}
              </span>
              <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginLeft: 4 }}>raised</span>
            </div>
            <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>
              {pct.toFixed(0)}% of {isFiat ? fmt(goal) : `${parseFloat(goal).toFixed(3)} ETH`}
            </span>
          </div>

          {campaign.funders > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ display: 'flex' }}>
                {[...Array(Math.min(campaign.funders, 3))].map((_, i) => (
                  <div key={i} style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: `hsl(${260 + i * 20}, 60%, 65%)`,
                    border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -5,
                  }}/>
                ))}
              </div>
              <span style={{ fontSize: '.72rem', color: 'var(--gray-400)' }}>
                {campaign.funders} supporter{campaign.funders !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
