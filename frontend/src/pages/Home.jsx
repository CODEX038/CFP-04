import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const CATEGORIES  = ['All','Medical','Education','Environment','Animals','Community','Disaster','Arts','Sports','Technology']
const FILTERS     = ['all','active','expiring','funded']
const SORT_OPTIONS = [
  { value:'newest',   label:'Newest first' },
  { value:'trending', label:'Most funded'  },
  { value:'ending',   label:'Ending soon'  },
  { value:'goal',     label:'Biggest goal' },
]

export default function Home() {
  const navigate = useNavigate()
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [category, setCategory] = useState('All')
  const [sort,     setSort]     = useState('newest')

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
      const ms  = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
      const pct = (parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100
      const exp = Date.now() > ms
      if (filter === 'active')   return !exp
      if (filter === 'funded')   return pct >= 100
      if (filter === 'expiring') return !exp && (ms - Date.now()) < 864e5 * 7
      return true
    })
    switch (sort) {
      case 'trending': list.sort((a,b) => parseFloat(b.amountRaised||0) - parseFloat(a.amountRaised||0)); break
      case 'ending':   list.sort((a,b) => (a.deadline>1e12?a.deadline:a.deadline*1000)-(b.deadline>1e12?b.deadline:b.deadline*1000)); break
      case 'goal':     list.sort((a,b) => parseFloat(b.goal||0) - parseFloat(a.goal||0)); break
      default:         list.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
    }
    return list
  }, [verifiedCampaigns, search, category, filter, sort])

  const hasFilters = search || filter !== 'all' || category !== 'All'
  const clearFilters = () => { setSearch(''); setFilter('all'); setCategory('All') }

  const STATS = [
    { icon:'🚀', label:'Live campaigns',   value:`${verifiedCampaigns.length}+` },
    { icon:'⟠',  label:'ETH raised',       value:`${totalRaised.toFixed(3)}`   },
    { icon:'🔒', label:'Refund protected', value:'100%'                        },
  ]

  return (
    <>
      {/* ─── GLOBAL STYLES ─────────────────────────────────────────── */}
      <style>{`
        /* Force dark bg on html/body so no white leaks anywhere */
        html, body, #root { background: #0f0528 !important; margin: 0; padding: 0; }

        .home-page { min-height: 100vh; background: #0f0528; }

        /* Fixed full-page background */
        .home-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
        }
        .home-bg img {
          width: 100%; height: 100%; object-fit: cover; object-position: center;
        }
        .home-bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg,
            rgba(15,5,40,0.97) 0%,
            rgba(35,12,75,0.95) 40%,
            rgba(15,18,60,0.97) 100%
          );
        }
        .home-bg-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.055) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .blob {
          position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none;
        }

        /* Content above bg */
        .home-content { position: relative; z-index: 10; }

        /* Hero */
        .hero {
          padding: clamp(2.5rem,7vw,4.5rem) clamp(1rem,4vw,2.5rem) clamp(2rem,5vw,3.5rem);
        }
        .hero-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr auto;
          gap: 2rem; align-items: center;
        }
        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero-stats { display: none !important; }
        }

        /* Filter bar */
        .filter-bar {
          position: sticky; top: 0; z-index: 40;
          background: rgba(12,4,32,0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 10px clamp(1rem,4vw,2.5rem);
        }
        .filter-inner { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
        .filter-row1  { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        /* Grid */
        .grid-section { max-width: 1280px; margin: 0 auto; padding: 1.75rem clamp(1rem,4vw,2.5rem) 5rem; }
        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(295px,1fr));
          gap: 1.2rem;
        }

        /* Inputs */
        .search-input { color: #fff !important; }
        .search-input::placeholder { color: rgba(255,255,255,0.3); }
        select option { background: #1e1040; color: #fff; }

        /* Skeletons */
        .skel { background: rgba(255,255,255,0.07); border-radius: 8px; animation: shimmer 1.4s ease infinite; }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }

        /* Skeleton card */
        .skel-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; overflow: hidden;
        }

        /* Fade up */
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(18px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp .5s ease both; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>

      {/* ─── FULL-PAGE FIXED BACKGROUND ─────────────────────────────── */}
      <div className="home-bg">
        <img
          src="https://images.unsplash.com/photo-1542435503-ec7b0f6b5d3c?w=1800&q=85"
          alt=""
          loading="eager"
        />
        <div className="home-bg-overlay" />
        <div className="home-bg-dots" />
        {/* Glow blobs */}
        <div className="blob" style={{ top:'-5%', left:'22%', width:550, height:550,
          background:'radial-gradient(circle, rgba(124,58,237,.2) 0%, transparent 70%)' }} />
        <div className="blob" style={{ bottom:'15%', right:'8%', width:400, height:400,
          background:'radial-gradient(circle, rgba(79,70,229,.14) 0%, transparent 70%)' }} />
        <div className="blob" style={{ top:'55%', left:'45%', width:320, height:320,
          background:'radial-gradient(circle, rgba(168,85,247,.1) 0%, transparent 70%)' }} />
      </div>

      {/* ─── PAGE CONTENT ───────────────────────────────────────────── */}
      <div className="home-page home-content">

        {/* ══ HERO ══ */}
        <section className="hero">
          <div className="hero-inner">

            {/* Left */}
            <div className="fade-up">
              {/* Live badge */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:999, padding:'5px 15px', marginBottom:'1.4rem',
              }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80',
                  display:'inline-block', animation:'pulse 2s infinite' }} />
                <span style={{ fontSize:'.78rem', fontWeight:500, color:'rgba(255,255,255,.82)',
                  letterSpacing:'.04em', fontFamily:'system-ui,sans-serif' }}>
                  {verifiedCampaigns.length} verified campaigns · Live on Ethereum
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize:'clamp(2.5rem,5.5vw,3.8rem)', fontWeight:900,
                lineHeight:1.06, letterSpacing:'-.025em',
                color:'#fff', margin:'0 0 1rem',
                fontFamily:'system-ui,sans-serif',
              }}>
                Fund ideas that<br/>
                <span style={{
                  background:'linear-gradient(90deg,#c4b5fd 0%,#a78bfa 50%,#f0abfc 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                }}>change the world</span>
              </h1>

              {/* Sub */}
              <p style={{
                fontSize:'clamp(.95rem,2vw,1.05rem)', color:'rgba(255,255,255,.5)',
                lineHeight:1.75, maxWidth:490, margin:'0 0 2rem',
                fontFamily:'system-ui,sans-serif',
              }}>
                Browse verified campaigns. Donate with ETH or UPI.
                Every transaction is transparent and immutably on-chain.
              </p>

              {/* CTAs */}
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:'2rem' }}>
                {account ? (
                  <button onClick={() => navigate('/campaign/create')} style={BTN.primary}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                    </svg>
                    Start a campaign
                  </button>
                ) : (
                  <button onClick={connectWallet} style={BTN.primary}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="7" width="20" height="14" rx="3"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    Connect wallet
                  </button>
                )}
                <button onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior:'smooth' })}
                  style={BTN.ghost}>
                  Browse campaigns ↓
                </button>
              </div>

              {/* Trust row */}
              <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                {['🔒 Smart contract secured','⚡ Instant withdrawals','🔄 Auto refunds','₹ UPI accepted'].map(t => (
                  <span key={t} style={{ fontSize:'.77rem', color:'rgba(255,255,255,.36)', fontFamily:'system-ui,sans-serif' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Right — stat cards */}
            <div className="hero-stats" style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {STATS.map((s, i) => (
                <div key={s.label} className="fade-up" style={{ animationDelay:`${i*80}ms`,
                  display:'flex', alignItems:'center', gap:14,
                  background:'rgba(255,255,255,0.07)',
                  border:'1px solid rgba(255,255,255,0.11)',
                  borderRadius:20, padding:'14px 22px', minWidth:210,
                  backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
                }}>
                  <span style={{ fontSize:'1.65rem' }}>{s.icon}</span>
                  <div>
                    <p style={{ fontFamily:'system-ui,sans-serif', fontSize:'1.4rem', fontWeight:900, color:'#fff', lineHeight:1, margin:0 }}>
                      {s.value}
                    </p>
                    <p style={{ fontFamily:'system-ui,sans-serif', fontSize:'.72rem', color:'rgba(255,255,255,.36)', margin:'3px 0 0' }}>
                      {s.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ STICKY FILTER BAR ══ */}
        <div className="filter-bar">
          <div className="filter-inner">
            <div className="filter-row1">

              {/* Search */}
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,.3)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="search-input"
                  style={{
                    width:'100%', boxSizing:'border-box',
                    paddingLeft:36, paddingRight: search ? 34 : 14,
                    paddingTop:9, paddingBottom:9,
                    background:'rgba(255,255,255,0.07)',
                    border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:999, outline:'none',
                    fontFamily:'system-ui,sans-serif', fontSize:'.85rem',
                    transition:'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(167,139,250,.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,.1)'}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer',
                      color:'rgba(255,255,255,.4)', padding:0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Status tabs */}
              <div style={{
                display:'flex', gap:2, padding:3,
                background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:13,
              }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding:'7px 15px', border:'none', cursor:'pointer',
                    fontFamily:'system-ui,sans-serif', fontSize:'.78rem', fontWeight:600,
                    textTransform:'capitalize', borderRadius:10, transition:'all .15s',
                    ...(filter === f
                      ? { background:'rgba(124,58,237,.88)', color:'#fff', boxShadow:'0 2px 8px rgba(124,58,237,.4)' }
                      : { background:'transparent', color:'rgba(255,255,255,.4)' })
                  }}>{f}</button>
                ))}
              </div>

              {/* Sort */}
              <select value={sort} onChange={e => setSort(e.target.value)} style={{
                background:'rgba(255,255,255,0.07)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:999, padding:'8px 14px', outline:'none', cursor:'pointer',
                fontFamily:'system-ui,sans-serif', fontSize:'.8rem',
                color:'rgba(255,255,255,.7)',
              }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Category pills */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  flexShrink:0, padding:'5px 14px', border:'none', cursor:'pointer',
                  fontFamily:'system-ui,sans-serif', fontSize:'.75rem', fontWeight:600,
                  borderRadius:999, transition:'all .15s',
                  ...(category === cat
                    ? { background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', boxShadow:'0 3px 10px rgba(124,58,237,.45)' }
                    : { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,.45)' })
                }}>{cat}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ CAMPAIGN GRID ══ */}
        <section id="grid" className="grid-section">

          {/* Results header */}
          {!loading && !error && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:'1.25rem', flexWrap:'wrap', gap:8 }}>
              <p style={{ fontFamily:'system-ui,sans-serif', fontSize:'.875rem',
                color:'rgba(255,255,255,.38)', margin:0 }}>
                {filtered.length === 0 ? 'No campaigns found' : (
                  <><strong style={{ color:'rgba(255,255,255,.85)', fontWeight:700 }}>{filtered.length}</strong>
                  {' '}campaign{filtered.length !== 1 ? 's' : ''} found</>
                )}
                {category !== 'All' && (
                  <> in <span style={{ color:'#a78bfa', fontWeight:600 }}>{category}</span></>
                )}
              </p>
              {hasFilters && (
                <button onClick={clearFilters}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontFamily:'system-ui,sans-serif', fontSize:'.8rem', fontWeight:600,
                    color:'#a78bfa', padding:0 }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="campaign-grid">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="skel-card">
                  <div className="skel" style={{ height:188 }} />
                  <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:10 }}>
                    <div className="skel" style={{ height:18, width:'75%' }} />
                    <div className="skel" style={{ height:13, width:'45%' }} />
                    <div className="skel" style={{ height:5, marginTop:6 }} />
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div className="skel" style={{ height:13, width:'38%' }} />
                      <div className="skel" style={{ height:13, width:'22%' }} />
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
                background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <p style={{ color:'#fff', fontWeight:600, fontFamily:'system-ui,sans-serif', marginBottom:'.4rem' }}>
                Something went wrong
              </p>
              <p style={{ color:'rgba(239,68,68,.8)', fontSize:'.875rem', fontFamily:'system-ui,sans-serif', marginBottom:'1.25rem' }}>
                {error}
              </p>
              <button onClick={refetch} style={BTN.primary}>Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{
              textAlign:'center', padding:'4rem 1.5rem',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:24,
            }}>
              <div style={{ fontSize:'2.8rem', marginBottom:'1rem' }}>🌱</div>
              <h3 style={{ fontFamily:'system-ui,sans-serif', fontWeight:800, fontSize:'1.25rem', color:'#fff', marginBottom:'.5rem' }}>
                No campaigns found
              </h3>
              <p style={{ fontFamily:'system-ui,sans-serif', color:'rgba(255,255,255,.38)', fontSize:'.9rem', marginBottom:'1.5rem' }}>
                {search ? `Nothing matches "${search}"` : verifiedCampaigns.length === 0
                  ? 'No verified campaigns yet. Be the first!'
                  : 'Try adjusting your filters.'}
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                {hasFilters && (
                  <button onClick={clearFilters} style={BTN.ghost}>Clear filters</button>
                )}
                <button onClick={() => navigate('/campaign/create')} style={BTN.primary}>
                  Create a campaign
                </button>
              </div>
            </div>
          )}

          {/* Campaign grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="campaign-grid">
              {filtered.map((campaign, i) => (
                <div key={campaign.contractAddress} className="fade-up"
                  style={{ animationDelay:`${Math.min(i,9)*55}ms` }}>
                  <CampaignCard
                    campaign={campaign}
                    onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom CTA for guests */}
          {!account && !loading && (
            <div style={{
              marginTop:'3.5rem', position:'relative', overflow:'hidden',
              borderRadius:28,
              border:'1px solid rgba(124,58,237,0.3)',
            }}>
              <img
                src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80"
                alt=""
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
              />
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(135deg,rgba(15,5,40,.95),rgba(45,18,85,.9))' }} />
              <div style={{
                position:'relative', zIndex:1,
                display:'flex', flexWrap:'wrap', alignItems:'center',
                justifyContent:'space-between', gap:'1.5rem',
                padding:'2.25rem 2rem',
              }}>
                <div>
                  <h3 style={{ fontFamily:'system-ui,sans-serif', fontWeight:900,
                    fontSize:'1.6rem', color:'#fff', margin:'0 0 .45rem' }}>
                    Ready to make an impact?
                  </h3>
                  <p style={{ fontFamily:'system-ui,sans-serif', color:'rgba(255,255,255,.42)',
                    fontSize:'.9rem', maxWidth:380, margin:0 }}>
                    Connect your wallet to donate with ETH, or create an account to launch your own verified campaign.
                  </p>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0, flexWrap:'wrap' }}>
                  <button onClick={connectWallet} style={BTN.primary}>Connect wallet</button>
                  <button onClick={() => navigate('/login')} style={BTN.ghost}>Create account</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ height:60 }} />
        </section>
      </div>
    </>
  )
}

/* ── Button style objects ── */
const BTN = {
  primary: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 24px', border:'none', borderRadius:999,
    background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
    color:'#fff', fontFamily:'system-ui,sans-serif',
    fontSize:'.88rem', fontWeight:700, cursor:'pointer',
    boxShadow:'0 6px 22px rgba(124,58,237,.45)',
    transition:'transform .15s, box-shadow .15s',
  },
  ghost: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 24px', borderRadius:999,
    background:'rgba(255,255,255,0.08)',
    border:'1px solid rgba(255,255,255,0.18)',
    color:'rgba(255,255,255,.85)', fontFamily:'system-ui,sans-serif',
    fontSize:'.88rem', fontWeight:600, cursor:'pointer',
    transition:'all .15s',
  },
}
