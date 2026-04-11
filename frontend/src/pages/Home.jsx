import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const CATEGORIES = ['All', 'Medical', 'Education', 'Environment', 'Animals', 'Community', 'Disaster', 'Arts', 'Sports', 'Technology']
const FILTERS    = ['all', 'active', 'expiring', 'funded']
const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'trending', label: 'Most funded'  },
  { value: 'ending',   label: 'Ending soon'  },
  { value: 'goal',     label: 'Biggest goal' },
]

export default function Home() {
  const navigate = useNavigate()
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [category, setCategory] = useState('All')
  const [sort,     setSort]     = useState('newest')

  /* ── Derived data ── */
  const verifiedCampaigns = useMemo(() =>
    campaigns.filter(c => c.verificationStatus === 'verified' && !c.paused),
  [campaigns])

  const totalRaised = useMemo(() =>
    verifiedCampaigns.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0),
  [verifiedCampaigns])

  const filtered = useMemo(() => {
    let list = [...verifiedCampaigns]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
    }

    if (category !== 'All')
      list = list.filter(c => c.category?.toLowerCase() === category.toLowerCase())

    list = list.filter(c => {
      const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
      const pct        = (parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100
      const expired    = Date.now() > deadlineMs
      if (filter === 'active')   return !expired
      if (filter === 'funded')   return pct >= 100
      if (filter === 'expiring') return !expired && (deadlineMs - Date.now()) < 864e5 * 7
      return true
    })

    switch (sort) {
      case 'trending': list.sort((a, b) => parseFloat(b.amountRaised||0) - parseFloat(a.amountRaised||0)); break
      case 'ending':   list.sort((a, b) => (a.deadline > 1e12 ? a.deadline : a.deadline*1000) - (b.deadline > 1e12 ? b.deadline : b.deadline*1000)); break
      case 'goal':     list.sort((a, b) => parseFloat(b.goal||0) - parseFloat(a.goal||0)); break
      default:         list.sort((a, b) => (b.createdAt||0) - (a.createdAt||0))
    }

    return list
  }, [verifiedCampaigns, search, category, filter, sort])

  const hasActiveFilters = search || filter !== 'all' || category !== 'All'
  const clearFilters = () => { setSearch(''); setFilter('all'); setCategory('All') }

  /* ── Stat cards matching screenshot top-right ── */
  const STATS = [
    { icon: '🚀', label: 'Live campaigns',   value: `${verifiedCampaigns.length}+`  },
    { icon: '⟠',  label: 'ETH raised',        value: `${totalRaised.toFixed(3)}`     },
    { icon: '🔒', label: 'Refund protected', value: '100%'                          },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream-50)' }}>

      {/* ══════════════════════════════════════════
          HERO — dark purple gradient (matching screenshots 1-2)
      ══════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e1040 0%, #2d1260 40%, #1a1050 70%, #110d38 100%)',
        padding: 'clamp(3rem,8vw,5rem) 1.5rem clamp(2.5rem,6vw,4rem)',
      }}>
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}/>
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:'-10%', left:'25%', width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-5%', right:'5%', width:350, height:350, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(167,139,250,.1) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative', zIndex:1,
          display:'grid', gridTemplateColumns:'1fr auto', gap:'2rem', alignItems:'center' }}>

          {/* Left — copy */}
          <div className="animate-fade-up">
            {/* Live badge */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)',
              borderRadius:'var(--radius-full)', padding:'5px 14px', marginBottom:'1.5rem',
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite', display:'inline-block' }}/>
              <span style={{ fontFamily:'var(--font-sans)', fontSize:'.78rem', color:'rgba(255,255,255,.85)', fontWeight:500, letterSpacing:'.04em' }}>
                {verifiedCampaigns.length} verified campaigns · Live on Ethereum
              </span>
            </div>

            <h1 style={{
              fontFamily:'var(--font-serif)',
              fontSize:'clamp(2.4rem,5vw,3.6rem)',
              fontWeight:400,
              lineHeight:1.08,
              letterSpacing:'-.02em',
              color:'#fff',
              marginBottom:'1.1rem',
            }}>
              Fund ideas that<br/>
              <span style={{
                background:'linear-gradient(90deg,#c4b5fd 0%,#a78bfa 50%,#f0abfc 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>change the world</span>
            </h1>

            <p style={{
              fontFamily:'var(--font-sans)',
              fontSize:'clamp(.95rem,2vw,1.05rem)',
              color:'rgba(255,255,255,.55)',
              lineHeight:1.75,
              marginBottom:'2rem',
              maxWidth:480,
            }}>
              Browse verified campaigns. Donate with ETH or UPI.
              Every transaction is transparent and immutably on-chain.
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:'2.5rem' }}>
              {account ? (
                <button onClick={() => navigate('/campaign/create')} style={S.heroBtnPrimary}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                  </svg>
                  Start a campaign
                </button>
              ) : (
                <button onClick={connectWallet} style={S.heroBtnPrimary}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="7" width="20" height="14" rx="3"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                  Connect wallet
                </button>
              )}
              <button
                onClick={() => document.getElementById('campaigns-grid')?.scrollIntoView({ behavior:'smooth' })}
                style={S.heroBtnGhost}>
                Browse campaigns ↓
              </button>
            </div>

            {/* Trust row */}
            <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
              {['🔒 Smart contract secured','⚡ Instant withdrawals','🔄 Auto refunds','₹ UPI accepted'].map(t => (
                <span key={t} style={{ fontFamily:'var(--font-sans)', fontSize:'.78rem', color:'rgba(255,255,255,.4)', fontWeight:500 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — stat cards (matching top-right in screenshots) */}
          <div className="animate-fade-up-1" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {STATS.map(s => (
              <div key={s.label} style={{
                display:'flex', alignItems:'center', gap:14,
                background:'rgba(255,255,255,.07)',
                border:'1px solid rgba(255,255,255,.12)',
                borderRadius:18,
                padding:'14px 20px',
                backdropFilter:'blur(12px)',
                minWidth:200,
              }}>
                <span style={{ fontSize:'1.6rem' }}>{s.icon}</span>
                <div>
                  <p style={{ fontFamily:'var(--font-serif)', fontSize:'1.35rem', color:'#fff', lineHeight:1 }}>{s.value}</p>
                  <p style={{ fontFamily:'var(--font-sans)', fontSize:'.72rem', color:'rgba(255,255,255,.38)', marginTop:3 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </section>

      {/* ══════════════════════════════════════════
          FILTER BAR — dark sticky (matching screenshot search row)
      ══════════════════════════════════════════ */}
      <div style={{
        position:'sticky', top:0, zIndex:40,
        background:'rgba(30,16,64,.88)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,.08)',
        padding:'10px 1.5rem',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', flexDirection:'column', gap:8 }}>

          {/* Row 1: search + filter tabs + sort */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>

            {/* Search */}
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                style={{
                  width:'100%', paddingLeft:36, paddingRight: search ? 36 : 14,
                  paddingTop:9, paddingBottom:9,
                  background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                  borderRadius:'var(--radius-full)', outline:'none', boxSizing:'border-box',
                  fontFamily:'var(--font-sans)', fontSize:'.85rem', color:'#fff',
                  transition:'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor='rgba(167,139,250,.6)'}
                onBlur={e  => e.target.style.borderColor='rgba(255,255,255,.1)'}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Status filter tabs */}
            <div style={{
              display:'flex', gap:2, padding:3,
              background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
              borderRadius:12,
            }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer',
                  fontFamily:'var(--font-sans)', fontSize:'.78rem', fontWeight:600,
                  textTransform:'capitalize', transition:'all .15s',
                  ...(filter === f
                    ? { background:'rgba(124,58,237,.85)', color:'#fff', boxShadow:'0 2px 8px rgba(124,58,237,.4)' }
                    : { background:'transparent', color:'rgba(255,255,255,.42)' })
                }}>{f}</button>
              ))}
            </div>

            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
              borderRadius:'var(--radius-full)', padding:'8px 14px', outline:'none', cursor:'pointer',
              fontFamily:'var(--font-sans)', fontSize:'.8rem', color:'rgba(255,255,255,.7)',
            }}>
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background:'#1e1040' }}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Row 2: category pills */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                flexShrink:0, padding:'5px 14px', border:'none', cursor:'pointer',
                fontFamily:'var(--font-sans)', fontSize:'.75rem', fontWeight:600,
                borderRadius:'var(--radius-full)', transition:'all .15s',
                ...(category === cat
                  ? { background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', boxShadow:'0 3px 10px rgba(124,58,237,.45)' }
                  : { background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.45)' })
              }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CAMPAIGN GRID
      ══════════════════════════════════════════ */}
      <section id="campaigns-grid" style={{ maxWidth:1200, margin:'0 auto', padding:'2rem 1.5rem 5rem' }}>

        {/* Results header */}
        {!loading && !error && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
            <p style={{ fontFamily:'var(--font-sans)', fontSize:'.875rem', color:'var(--ink-300)', margin:0 }}>
              {filtered.length === 0
                ? 'No campaigns found'
                : <><strong style={{ color:'var(--ink-900)', fontWeight:700 }}>{filtered.length}</strong>
                    {' '}campaign{filtered.length !== 1 ? 's' : ''} found</>
              }
              {category !== 'All' && (
                <> in <span style={{ color:'var(--teal-500)', fontWeight:600 }}>{category}</span></>
              )}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} style={{
                background:'none', border:'none', cursor:'pointer', padding:0,
                fontFamily:'var(--font-sans)', fontSize:'.8rem', fontWeight:600, color:'var(--teal-500)',
              }}>
                Clear filters ×
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.25rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height:186 }}/>
                <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:10 }}>
                  <div className="skeleton" style={{ height:20, width:'78%' }}/>
                  <div className="skeleton" style={{ height:13, width:'45%' }}/>
                  <div className="skeleton" style={{ height:5, marginTop:8 }}/>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div className="skeleton" style={{ height:13, width:'35%' }}/>
                    <div className="skeleton" style={{ height:13, width:'25%' }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ textAlign:'center', padding:'4rem 1.5rem' }}>
            <div style={{
              width:56, height:56, borderRadius:16, margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--error-50)', border:'1px solid #fecdd3',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-700)', fontWeight:600, marginBottom:'.4rem' }}>Something went wrong</p>
            <p style={{ fontFamily:'var(--font-sans)', color:'var(--error-500)', fontSize:'.875rem', marginBottom:'1.25rem' }}>{error}</p>
            <button onClick={refetch} className="btn-primary">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{
            textAlign:'center', padding:'4rem 1.5rem',
            background:'#fff', border:'1px solid var(--cream-200)',
            borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ fontSize:'2.8rem', marginBottom:'1rem' }}>🌱</div>
            <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.35rem', color:'var(--ink-700)', marginBottom:'.5rem' }}>
              No campaigns found
            </h3>
            <p style={{ fontFamily:'var(--font-sans)', color:'var(--ink-300)', fontSize:'.9rem', marginBottom:'1.5rem' }}>
              {search
                ? `Nothing matches "${search}"`
                : verifiedCampaigns.length === 0
                  ? 'No verified campaigns yet. Be the first!'
                  : 'Try adjusting your filters.'}
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-secondary">Clear filters</button>
              )}
              <button onClick={() => navigate('/campaign/create')} className="btn-primary">
                Create a campaign
              </button>
            </div>
          </div>
        )}

        {/* Campaign grid */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.25rem' }}>
            {filtered.map((campaign, i) => (
              <div key={campaign.contractAddress} style={{ animation:`fadeUp .5s ${Math.min(i,8)*55}ms ease both` }}>
                <CampaignCard campaign={campaign}/>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA for guests */}
        {!account && !loading && filtered.length > 0 && (
          <div style={{
            marginTop:'3.5rem', position:'relative', overflow:'hidden',
            borderRadius:'var(--radius-xl)',
            background:'linear-gradient(135deg,#1e1040 0%,#2d1260 50%,#1a1050 100%)',
            border:'1px solid rgba(124,58,237,.3)',
          }}>
            <div style={{
              position:'absolute', top:'-40%', left:'50%', transform:'translateX(-50%)',
              width:400, height:300, borderRadius:'50%',
              background:'radial-gradient(ellipse,rgba(124,58,237,.18) 0%,transparent 70%)',
              pointerEvents:'none',
            }}/>
            <div style={{
              position:'relative', zIndex:1, padding:'2.25rem 2rem',
              display:'flex', flexWrap:'wrap', alignItems:'center',
              justifyContent:'space-between', gap:'1.5rem',
            }}>
              <div>
                <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.65rem', color:'#fff', marginBottom:'.45rem' }}>
                  Ready to make an impact?
                </h3>
                <p style={{ fontFamily:'var(--font-sans)', color:'rgba(255,255,255,.42)', fontSize:'.9rem', maxWidth:380, margin:0 }}>
                  Connect your wallet to donate with ETH, or create an account to launch your own verified campaign.
                </p>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', flexShrink:0 }}>
                <button onClick={connectWallet} style={S.heroBtnPrimary}>Connect wallet</button>
                <button onClick={() => navigate('/login')} style={S.heroBtnGhost}>Create account</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height:60 }}/>
      </section>

      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @media (max-width:768px) {
          section:first-of-type > div { grid-template-columns: 1fr !important; }
          section:first-of-type > div > div:last-child { display: none !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Shared style objects ── */
const S = {
  heroBtnPrimary: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 24px', border:'none', borderRadius:'var(--radius-full)',
    background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
    color:'#fff', fontFamily:'var(--font-sans)', fontSize:'.88rem', fontWeight:700,
    cursor:'pointer', boxShadow:'0 6px 22px rgba(124,58,237,.45)',
    transition:'transform .15s, box-shadow .15s',
  },
  heroBtnGhost: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 24px', borderRadius:'var(--radius-full)',
    background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.18)',
    color:'rgba(255,255,255,.85)', fontFamily:'var(--font-sans)', fontSize:'.88rem', fontWeight:600,
    cursor:'pointer', transition:'all .15s',
  },
}
