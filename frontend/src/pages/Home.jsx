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
      case 'trending': list.sort((a,b) => parseFloat(b.amountRaised||0)-parseFloat(a.amountRaised||0)); break
      case 'ending':   list.sort((a,b) => (a.deadline>1e12?a.deadline:a.deadline*1000)-(b.deadline>1e12?b.deadline:b.deadline*1000)); break
      case 'goal':     list.sort((a,b) => parseFloat(b.goal||0)-parseFloat(a.goal||0)); break
      default:         list.sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0))
    }
    return list
  }, [verifiedCampaigns, search, category, filter, sort])

  const hasFilters = search || filter !== 'all' || category !== 'All'
  const clearFilters = () => { setSearch(''); setFilter('all'); setCategory('All') }

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0; padding: 0;
          background: #2e1065 !important;
        }

        /* ── Page wrapper ── */
        .h-page {
          min-height: 100vh;
          position: relative;
          background: linear-gradient(160deg,
            #1e0a4a 0%,
            #2d1b6b 18%,
            #3b1f7a 32%,
            #2a1660 48%,
            #1a1255 62%,
            #261660 78%,
            #1e0a4a 100%
          );
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* Decorative orbs behind everything */
        .h-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Hero ── */
        .h-hero {
          position: relative;
          z-index: 10;
          padding: clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 4vw, 3rem) clamp(2rem, 4vw, 3rem);
          overflow: hidden;
        }
        .h-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        .h-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 3rem;
          align-items: center;
        }
        @media (max-width: 860px) {
          .h-hero-inner { grid-template-columns: 1fr; }
          .h-stat-col   { display: none !important; }
        }

        /* ── Filter bar ── */
        .h-filterbar {
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 12px clamp(1.25rem, 4vw, 3rem);
          background: rgba(30, 10, 72, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(167,139,250,0.15);
          box-shadow: 0 4px 32px rgba(0,0,0,0.25);
        }
        .h-filterbar-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .h-filterrow {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        /* ── Grid section ── */
        .h-grid-section {
          position: relative;
          z-index: 10;
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem clamp(1.25rem, 4vw, 3rem) 5rem;
        }
        .h-campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        /* ── Glass card (for stat cards, empty state, etc) ── */
        .h-glass {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
        }
        .h-glass-warm {
          background: linear-gradient(135deg, rgba(139,92,246,0.18), rgba(109,40,217,0.1));
          border: 1px solid rgba(167,139,250,0.25);
          backdrop-filter: blur(16px);
          border-radius: 20px;
        }

        /* ── Skeleton ── */
        .h-skel { border-radius: 10px; animation: hShimmer 1.6s ease infinite; }
        .h-skel-bg { background: rgba(167,139,250,0.12); }
        .h-skel-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(167,139,250,0.1);
          border-radius: 20px;
          overflow: hidden;
        }
        @keyframes hShimmer {
          0%,100% { opacity: .45; }
          50%      { opacity: .85; }
        }

        /* ── Animations ── */
        @keyframes hFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .h-fade-up { animation: hFadeUp .55s ease both; }

        @keyframes hPulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* ── Input placeholder ── */
        .h-input::placeholder { color: rgba(196,181,253,.35); }
        .h-input:focus { border-color: rgba(167,139,250,.7) !important; box-shadow: 0 0 0 3px rgba(139,92,246,.18) !important; }

        /* ── Scrollbar hide ── */
        .h-cats { scrollbar-width: none; }
        .h-cats::-webkit-scrollbar { display: none; }

        /* ── Campaign card wrapper hover ── */
        .h-card-wrap {
          transition: transform .22s ease;
        }
        .h-card-wrap:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── Decorative orbs ── */}
      <div className="h-orb" style={{ top:'-8%', left:'15%', width:600, height:600,
        background:'radial-gradient(circle, rgba(167,139,250,.22) 0%, transparent 65%)' }} />
      <div className="h-orb" style={{ top:'30%', right:'-5%', width:450, height:450,
        background:'radial-gradient(circle, rgba(139,92,246,.16) 0%, transparent 65%)' }} />
      <div className="h-orb" style={{ bottom:'10%', left:'5%', width:400, height:400,
        background:'radial-gradient(circle, rgba(109,40,217,.18) 0%, transparent 65%)' }} />
      <div className="h-orb" style={{ top:'60%', left:'45%', width:300, height:300,
        background:'radial-gradient(circle, rgba(196,181,253,.1) 0%, transparent 65%)' }} />

      <div className="h-page">

        {/* ════════════════════════════════════════
            HERO
        ════════════════════════════════════════ */}
        <section className="h-hero">
          <div className="h-hero-inner">

            {/* Left — copy */}
            <div className="h-fade-up">

              {/* Badge */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1.5rem',
                background:'rgba(139,92,246,0.18)', border:'1px solid rgba(167,139,250,0.3)',
                borderRadius:999, padding:'6px 16px',
              }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#4ade80',
                  display:'inline-block', animation:'hPulse 2s infinite' }} />
                <span style={{ fontSize:'.78rem', fontWeight:600, color:'rgba(196,181,253,.9)',
                  letterSpacing:'.04em' }}>
                  {verifiedCampaigns.length} verified campaigns · Live on Ethereum
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize:'clamp(2.6rem,5.5vw,4rem)',
                fontWeight:900, lineHeight:1.05, letterSpacing:'-.025em',
                color:'#fff', margin:'0 0 1.1rem',
              }}>
                Fund ideas that<br/>
                <span style={{
                  background:'linear-gradient(90deg, #e9d5ff 0%, #c4b5fd 35%, #a78bfa 65%, #f0abfc 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                }}>change the world</span>
              </h1>

              {/* Subtext */}
              <p style={{
                fontSize:'clamp(.95rem,2vw,1.08rem)', color:'rgba(196,181,253,.65)',
                lineHeight:1.8, maxWidth:500, margin:'0 0 2rem',
              }}>
                Browse verified campaigns. Support causes that matter with ETH or UPI.
                Every donation is transparent, secure, and on-chain.
              </p>

              {/* CTA buttons */}
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:'2rem' }}>
                {account ? (
                  <button onClick={() => navigate('/campaign/create')} style={S.btnPrimary}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 10px 32px rgba(139,92,246,.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(139,92,246,.45)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                    </svg>
                    Start a campaign
                  </button>
                ) : (
                  <button onClick={connectWallet} style={S.btnPrimary}
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow='0 10px 32px rgba(139,92,246,.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(139,92,246,.45)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="7" width="20" height="14" rx="3"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    Connect wallet
                  </button>
                )}
                <button
                  onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior:'smooth' })}
                  style={S.btnGhost}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(139,92,246,0.2)'; e.currentTarget.style.borderColor='rgba(167,139,250,.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,.18)' }}>
                  Browse campaigns ↓
                </button>
              </div>

              {/* Trust pills */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {[
                  { icon:'🔒', text:'Smart contract secured' },
                  { icon:'⚡', text:'Instant withdrawals' },
                  { icon:'🔄', text:'Auto refunds' },
                  { icon:'₹', text:'UPI accepted' },
                ].map(t => (
                  <span key={t.text} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    background:'rgba(139,92,246,0.12)', border:'1px solid rgba(167,139,250,0.2)',
                    borderRadius:999, padding:'4px 11px',
                    fontSize:'.74rem', fontWeight:500, color:'rgba(196,181,253,.75)',
                  }}>
                    <span>{t.icon}</span> {t.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — stat cards */}
            <div className="h-stat-col" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { icon:'🚀', label:'Live campaigns',   value:`${verifiedCampaigns.length}+`, color:'#c4b5fd' },
                { icon:'⟠',  label:'ETH raised',        value:totalRaised.toFixed(3),          color:'#93c5fd' },
                { icon:'🔒', label:'Refund protected', value:'100%',                           color:'#6ee7b7' },
              ].map((s, i) => (
                <div key={s.label} className="h-fade-up h-glass-warm"
                  style={{ animationDelay:`${i*90}ms`, padding:'18px 22px',
                    display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{
                    width:44, height:44, borderRadius:14,
                    background:'rgba(139,92,246,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.3rem', flexShrink:0,
                  }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize:'1.5rem', fontWeight:900, color:s.color,
                      lineHeight:1, margin:0 }}>{s.value}</p>
                    <p style={{ fontSize:'.72rem', color:'rgba(196,181,253,.5)',
                      margin:'3px 0 0' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            FILTER BAR
        ════════════════════════════════════════ */}
        <div className="h-filterbar">
          <div className="h-filterbar-inner">
            <div className="h-filterrow">

              {/* Search */}
              <div style={{ position:'relative', flex:1, minWidth:200 }}>
                <svg style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(167,139,250,.45)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="h-input"
                  style={{
                    width:'100%', boxSizing:'border-box',
                    paddingLeft:36, paddingRight: search ? 34 : 14,
                    paddingTop:9, paddingBottom:9,
                    background:'rgba(139,92,246,0.12)',
                    border:'1px solid rgba(167,139,250,0.2)',
                    borderRadius:999, outline:'none', transition:'all .2s',
                    fontSize:'.85rem', color:'#e9d5ff',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{
                    position:'absolute', right:11, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'rgba(167,139,250,.5)', padding:0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Status tabs */}
              <div style={{
                display:'flex', gap:2, padding:3,
                background:'rgba(139,92,246,0.12)',
                border:'1px solid rgba(167,139,250,0.18)',
                borderRadius:14,
              }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding:'7px 15px', border:'none', cursor:'pointer',
                    fontSize:'.78rem', fontWeight:600,
                    textTransform:'capitalize', borderRadius:11, transition:'all .18s',
                    ...(filter === f
                      ? { background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', boxShadow:'0 3px 12px rgba(124,58,237,.45)' }
                      : { background:'transparent', color:'rgba(196,181,253,.45)' })
                  }}>{f}</button>
                ))}
              </div>

              {/* Sort */}
              <select value={sort} onChange={e => setSort(e.target.value)} style={{
                background:'rgba(139,92,246,0.12)',
                border:'1px solid rgba(167,139,250,0.2)',
                borderRadius:999, padding:'8px 14px', outline:'none', cursor:'pointer',
                fontSize:'.8rem', color:'rgba(196,181,253,.8)',
                transition:'border-color .2s',
              }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background:'#2d1b6b' }}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Category pills */}
            <div className="h-cats" style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:2 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  flexShrink:0, padding:'5px 15px', border:'none', cursor:'pointer',
                  fontSize:'.75rem', fontWeight:600,
                  borderRadius:999, transition:'all .18s',
                  ...(category === cat
                    ? { background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'#fff', boxShadow:'0 4px 14px rgba(139,92,246,.5)' }
                    : { background:'rgba(139,92,246,0.1)', border:'1px solid rgba(167,139,250,0.18)', color:'rgba(196,181,253,.6)' })
                }}>{cat}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CAMPAIGN GRID
        ════════════════════════════════════════ */}
        <section id="grid" className="h-grid-section">

          {/* Results line */}
          {!loading && !error && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              marginBottom:'1.4rem', flexWrap:'wrap', gap:8 }}>
              <p style={{ fontSize:'.875rem', color:'rgba(196,181,253,.45)', margin:0 }}>
                {filtered.length === 0 ? 'No campaigns found' : (
                  <><strong style={{ color:'rgba(233,213,255,.9)', fontWeight:700 }}>{filtered.length}</strong>
                  {' '}campaign{filtered.length !== 1 ? 's' : ''} found</>
                )}
                {category !== 'All' && (
                  <> in <span style={{ color:'#c4b5fd', fontWeight:600 }}>{category}</span></>
                )}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:'.8rem', fontWeight:600, color:'#a78bfa', padding:0 }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="h-campaign-grid">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="h-skel-card">
                  <div className="h-skel h-skel-bg" style={{ height:190 }} />
                  <div style={{ padding:'1.1rem', display:'flex', flexDirection:'column', gap:11 }}>
                    <div className="h-skel h-skel-bg" style={{ height:19, width:'72%' }} />
                    <div className="h-skel h-skel-bg" style={{ height:13, width:'48%' }} />
                    <div className="h-skel h-skel-bg" style={{ height:5, marginTop:4 }} />
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <div className="h-skel h-skel-bg" style={{ height:13, width:'36%' }} />
                      <div className="h-skel h-skel-bg" style={{ height:13, width:'20%' }} />
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
                width:60, height:60, borderRadius:18, margin:'0 auto 1.1rem',
                display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <p style={{ color:'#e9d5ff', fontWeight:700, fontSize:'1.05rem', marginBottom:'.4rem' }}>Something went wrong</p>
              <p style={{ color:'rgba(248,113,113,.85)', fontSize:'.875rem', marginBottom:'1.5rem' }}>{error}</p>
              <button onClick={refetch} style={S.btnPrimary}>Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{
              textAlign:'center', padding:'4.5rem 2rem',
              background:'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.07))',
              border:'1px solid rgba(167,139,250,0.2)',
              borderRadius:28,
            }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🌱</div>
              <h3 style={{ fontWeight:800, fontSize:'1.3rem', color:'#e9d5ff', marginBottom:'.55rem' }}>
                No campaigns found
              </h3>
              <p style={{ color:'rgba(196,181,253,.5)', fontSize:'.9rem', marginBottom:'1.75rem', maxWidth:340, margin:'0 auto 1.75rem' }}>
                {search ? `Nothing matches "${search}"` : verifiedCampaigns.length === 0
                  ? 'No verified campaigns yet. Be the first to start one!'
                  : 'Try different filters or search terms.'}
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                {hasFilters && (
                  <button onClick={clearFilters} style={S.btnGhost}>Clear filters</button>
                )}
                <button onClick={() => navigate('/campaign/create')} style={S.btnPrimary}>
                  Create a campaign
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="h-campaign-grid">
              {filtered.map((campaign, i) => (
                <div key={campaign.contractAddress} className="h-card-wrap h-fade-up"
                  style={{ animationDelay:`${Math.min(i,9)*60}ms` }}>
                  <CampaignCard
                    campaign={campaign}
                    onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          {!account && !loading && (
            <div style={{
              marginTop:'3.5rem', position:'relative', overflow:'hidden',
              borderRadius:28,
              background:'linear-gradient(135deg, rgba(109,40,217,0.6), rgba(79,70,229,0.4), rgba(139,92,246,0.5))',
              border:'1px solid rgba(167,139,250,0.3)',
              boxShadow:'0 8px 40px rgba(109,40,217,0.3)',
            }}>
              {/* Shimmer overlay */}
              <div style={{
                position:'absolute', inset:0, pointerEvents:'none',
                background:'linear-gradient(135deg, rgba(255,255,255,.04), rgba(255,255,255,.01))',
                backgroundImage:'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px)',
                backgroundSize:'24px 24px',
              }} />
              <div style={{
                position:'relative', zIndex:1,
                display:'flex', flexWrap:'wrap', alignItems:'center',
                justifyContent:'space-between', gap:'1.5rem',
                padding:'2.5rem 2rem',
              }}>
                <div>
                  <h3 style={{ fontWeight:900, fontSize:'1.7rem', color:'#fff', margin:'0 0 .5rem' }}>
                    Ready to make an impact?
                  </h3>
                  <p style={{ color:'rgba(233,213,255,.55)', fontSize:'.92rem', maxWidth:400, margin:0, lineHeight:1.65 }}>
                    Connect your wallet to donate with ETH, or create an account to launch your own verified campaign.
                  </p>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0, flexWrap:'wrap' }}>
                  <button onClick={connectWallet} style={S.btnPrimary}
                    onMouseEnter={e => e.currentTarget.style.transform='scale(1.04)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                    Connect wallet
                  </button>
                  <button onClick={() => navigate('/login')} style={{ ...S.btnGhost }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(139,92,246,0.25)'; e.currentTarget.style.borderColor='rgba(167,139,250,.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,.2)' }}>
                    Create account
                  </button>
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

const S = {
  btnPrimary: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 26px', border:'none', borderRadius:999,
    background:'linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9)',
    color:'#fff', fontSize:'.88rem', fontWeight:700, cursor:'pointer',
    boxShadow:'0 6px 22px rgba(139,92,246,.45)',
    transition:'transform .18s, box-shadow .18s',
  },
  btnGhost: {
    display:'inline-flex', alignItems:'center', gap:7,
    padding:'11px 26px', borderRadius:999,
    background:'rgba(255,255,255,0.07)',
    border:'1px solid rgba(255,255,255,.18)',
    color:'rgba(233,213,255,.85)', fontSize:'.88rem', fontWeight:600,
    cursor:'pointer', transition:'all .18s',
  },
}
