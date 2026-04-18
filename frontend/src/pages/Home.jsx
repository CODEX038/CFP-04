import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const CATEGORIES   = ['All', 'Education', 'Health', 'Technology', 'Environment', 'Community', 'Arts']
const FILTERS      = ['All', 'Active', 'Expiring', 'Funded']
const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest' },
  { value: 'trending', label: 'Trending' },
  { value: 'ending',   label: 'Ending Soon' },
  { value: 'goal',     label: 'Biggest Goal' },
]

export default function Home() {
  const navigate = useNavigate()
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('All')
  const [category, setCategory] = useState('All')
  const [sort,     setSort]     = useState('newest')
  const [showSort, setShowSort] = useState(false)

  const verified = useMemo(() =>
    campaigns.filter(c => c.verificationStatus === 'verified' && !c.paused),
  [campaigns])

  const totalRaised = useMemo(() =>
    verified.reduce((s, c) => s + parseFloat(c.amountRaised || c.raised || 0), 0),
  [verified])

  const filtered = useMemo(() => {
    let list = [...verified]
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
      if (filter === 'Active')   return !exp
      if (filter === 'Funded')   return pct >= 100
      if (filter === 'Expiring') return !exp && (ms - Date.now()) < 864e5 * 7
      return true
    })

    switch (sort) {
      case 'trending': list.sort((a,b) => parseFloat(b.amountRaised||0) - parseFloat(a.amountRaised||0)); break
      case 'ending':   list.sort((a,b) => (a.deadline>1e12?a.deadline:a.deadline*1000) - (b.deadline>1e12?b.deadline:b.deadline*1000)); break
      case 'goal':     list.sort((a,b) => parseFloat(b.goal||0) - parseFloat(a.goal||0)); break
      default:         list.sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
    }
    return list
  }, [verified, search, category, filter, sort])

  const hasFilters   = search || filter !== 'All' || category !== 'All'
  const clearFilters = () => { setSearch(''); setFilter('All'); setCategory('All') }

  return (
    <>
      {/* ══ HERO ══ */}
      <section style={{
        position: 'relative',
        minHeight: 'clamp(380px, 55vw, 560px)',
        display: 'flex', alignItems: 'center',
        overflow: 'hidden',
        margin: 'calc(-1 * clamp(1.25rem, 4vw, 2.5rem)) calc(-1 * clamp(1rem, 4vw, 2rem)) 0',
      }}>
        {/* BG image */}
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1800&q=80"
          alt=""
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}
        />
        {/* Overlay */}
        <div style={{
          position:'absolute', inset:0,
          background: 'linear-gradient(110deg, rgba(76,29,149,0.9) 0%, rgba(109,40,217,0.75) 50%, rgba(124,58,237,0.55) 100%)',
        }}/>

        <div style={{ position:'relative', zIndex:2, width:'100%', padding: 'clamp(2.5rem, 8vw, 5rem) clamp(1.25rem, 4vw, 2rem)' }} className="animate-fade-up">

          {/* Live badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1.25rem',
            background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.2)', borderRadius:'var(--r-full)',
            padding:'5px 14px', fontSize:'0.78rem', fontWeight:600,
            color:'rgba(255,255,255,0.9)',
          }}>
            <span style={{ width:8, height:8, background:'#4ade80', borderRadius:'50%', animation:'pulse-dot 2s infinite', display:'inline-block' }}/>
            {verified.length} verified campaigns live
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            fontWeight: 400, color: '#fff',
            lineHeight: 1.08, letterSpacing: '-0.02em',
            margin: '0 0 1rem', maxWidth: 660,
          }}>
            Fund ideas that<br/>
            <span style={{ color: '#c4b5fd' }}>change the world</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.75, maxWidth: 480, marginBottom: '1.75rem',
          }}>
            Browse verified campaigns. Support with ETH or UPI. Every transaction tracked transparently on-chain.
          </p>

          {/* CTA buttons */}
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'2rem' }}>
            <button
              onClick={() => account ? navigate('/campaign/create') : connectWallet()}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'11px 24px', borderRadius:'var(--r-full)',
                background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)',
                border:'2px solid rgba(255,255,255,0.6)',
                color:'#fff', fontFamily:'var(--font-sans)', fontWeight:700, fontSize:'0.92rem',
                cursor:'pointer', whiteSpace:'nowrap',
                transition:'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Start a campaign
            </button>
            <button
              onClick={() => document.getElementById('fc-grid')?.scrollIntoView({ behavior:'smooth' })}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'11px 24px', borderRadius:'var(--r-full)',
                background:'rgba(109,40,217,0.45)', backdropFilter:'blur(8px)',
                border:'2px solid rgba(255,255,255,0.2)',
                color:'rgba(255,255,255,0.9)', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:'0.92rem',
                cursor:'pointer', whiteSpace:'nowrap',
                transition:'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(109,40,217,0.65)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(109,40,217,0.45)'}
            >
              Browse campaigns ↓
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:'clamp(1rem, 3vw, 2.5rem)', flexWrap:'wrap' }}>
            {[
              { val: `${verified.length}+`, lbl: 'Campaigns' },
              { val: totalRaised.toFixed(2), lbl: 'ETH raised' },
              { val: '100%', lbl: 'Refund protected' },
            ].map(s => (
              <div key={s.lbl} style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.3rem, 3vw, 1.75rem)', color:'#fff', lineHeight:1 }}>{s.val}</span>
                <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.5)', fontWeight:500 }}>{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FILTER BAR ══ */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
        position: 'sticky', top: 'var(--navbar-h)', zIndex: 40,
        margin: '0 calc(-1 * clamp(1rem, 4vw, 2rem))',
        padding: '0.875rem clamp(1rem, 4vw, 2rem)',
      }}>
        {/* Row 1: Search + filter tabs + sort */}
        <div style={{ display:'flex', gap:'0.625rem', alignItems:'center', flexWrap:'wrap', marginBottom:'0.625rem' }}>

          {/* Search */}
          <div style={{ position:'relative', flex:'1', minWidth:'180px' }}>
            <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              style={{
                width:'100%', padding:'9px 36px', paddingRight: search ? 34 : 12,
                background:'var(--bg-muted)', border:'1.5px solid transparent',
                borderRadius:'var(--r-full)', fontFamily:'var(--font-sans)',
                fontSize:'0.85rem', color:'var(--text-primary)', outline:'none',
                transition:'all 0.18s', minHeight: 40,
              }}
              onFocus={e => { e.target.style.borderColor='var(--purple-400)'; e.target.style.background='var(--bg-card)' }}
              onBlur={e => { e.target.style.borderColor='transparent'; e.target.style.background='var(--bg-muted)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--text-subtle)', padding:0,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display:'flex', gap:'3px', background:'var(--bg-muted)', borderRadius:'var(--r-full)', padding:'3px', flexShrink:0 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:'5px 14px', borderRadius:'var(--r-full)', border:'none',
                fontFamily:'var(--font-sans)', fontSize:'0.78rem', fontWeight:600,
                cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
                background: filter===f ? 'var(--purple-600)' : 'transparent',
                color: filter===f ? '#fff' : 'var(--text-muted)',
                boxShadow: filter===f ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
              }}>
                {f}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <button onClick={() => setShowSort(!showSort)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'7px 12px', borderRadius:'var(--r-full)',
              background:'var(--bg-muted)', border:'1.5px solid var(--border)',
              fontFamily:'var(--font-sans)', fontSize:'0.78rem', fontWeight:600,
              color:'var(--text-secondary)', cursor:'pointer', whiteSpace:'nowrap',
              minHeight: 36,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
              {SORT_OPTIONS.find(o => o.value === sort)?.label}
            </button>
            {showSort && (
              <div style={{
                position:'absolute', top:'calc(100% + 4px)', right:0,
                background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-lg)',
                overflow:'hidden', zIndex:50, minWidth:150,
              }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => { setSort(o.value); setShowSort(false) }} style={{
                    display:'block', width:'100%', textAlign:'left',
                    padding:'9px 14px', background: sort===o.value ? 'var(--purple-50)' : 'none',
                    border:'none', fontFamily:'var(--font-sans)', fontSize:'0.82rem',
                    fontWeight: sort===o.value ? 600 : 500,
                    color: sort===o.value ? 'var(--purple-700)' : 'var(--text-secondary)',
                    cursor:'pointer', transition:'background 0.15s',
                  }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Category pills */}
        <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:2 }} className="hide-scroll">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              flexShrink:0, padding:'5px 14px',
              borderRadius:'var(--r-full)',
              border: category===cat ? '1.5px solid var(--purple-600)' : '1.5px solid var(--border)',
              background: category===cat ? 'var(--purple-600)' : 'var(--bg-card)',
              fontFamily:'var(--font-sans)', fontSize:'0.78rem',
              fontWeight: category===cat ? 700 : 500,
              color: category===cat ? '#fff' : 'var(--text-muted)',
              cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
              minHeight: 34,
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CAMPAIGN GRID ══ */}
      <div id="fc-grid" style={{ marginTop:'1.5rem' }}>

        {/* Results bar */}
        {!loading && !error && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
            <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', margin:0 }}>
              {filtered.length === 0
                ? 'No campaigns found'
                : <><strong style={{ color:'var(--text-primary)' }}>{filtered.length}</strong> campaign{filtered.length!==1?'s':''} found{category!=='All' ? <> in <span style={{ color:'var(--purple-600)', fontWeight:600 }}>{category}</span></> : ''}</>
              }
            </p>
            {hasFilters && (
              <button onClick={clearFilters} style={{
                background:'none', border:'none', cursor:'pointer',
                fontFamily:'var(--font-sans)', fontSize:'0.8rem', fontWeight:600,
                color:'var(--purple-600)', padding:0,
              }}>
                Clear filters ×
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="campaign-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background:'var(--bg-card)', borderRadius:'var(--r-xl)', overflow:'hidden', border:'1px solid var(--border)' }}>
                <div className="skeleton" style={{ height:200 }}/>
                <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:10 }}>
                  <div className="skeleton" style={{ height:20, width:'75%' }}/>
                  <div className="skeleton" style={{ height:14, width:'90%' }}/>
                  <div className="skeleton" style={{ height:8, marginTop:6 }}/>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div className="skeleton" style={{ height:13, width:'40%' }}/>
                    <div className="skeleton" style={{ height:13, width:'25%' }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ textAlign:'center', padding:'4rem 1.5rem' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>⚠️</div>
            <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.25rem', color:'var(--text-primary)', marginBottom:'.5rem' }}>Something went wrong</h3>
            <p style={{ fontSize:'0.875rem', color:'var(--error-500)', marginBottom:'1.25rem' }}>{error}</p>
            <button onClick={refetch} className="btn btn-primary">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{
            textAlign:'center', padding:'clamp(3rem, 8vw, 5rem) 1.5rem',
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'var(--r-2xl)',
          }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>🌱</div>
            <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--text-primary)', marginBottom:'.5rem' }}>
              No campaigns found
            </h3>
            <p style={{ fontSize:'0.875rem', color:'var(--text-muted)', marginBottom:'1.5rem', maxWidth:400, margin:'0 auto 1.5rem' }}>
              {search ? `Nothing matches "${search}"` : 'Try adjusting your filters.'}
            </p>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center', flexWrap:'wrap' }}>
              {hasFilters && (
                <button onClick={clearFilters} className="btn btn-secondary">Clear filters</button>
              )}
              <button onClick={() => navigate('/campaign/create')} className="btn btn-primary">
                Create a campaign
              </button>
            </div>
          </div>
        )}

        {/* Campaign cards grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="campaign-grid">
            {filtered.map((campaign, i) => (
              <div key={campaign.contractAddress} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
                <CampaignCard campaign={campaign}/>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA for unauthenticated */}
        {!account && !loading && filtered.length > 0 && (
          <div style={{
            marginTop:'3rem', borderRadius:'var(--r-2xl)',
            background:'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
            padding:'clamp(1.75rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem)',
            display:'flex', flexWrap:'wrap', alignItems:'center',
            justifyContent:'space-between', gap:'1.5rem',
          }}>
            <div>
              <h3 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(1.35rem, 3vw, 1.7rem)', color:'#fff', margin:'0 0 .35rem' }}>
                Ready to make an impact?
              </h3>
              <p style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.55)', maxWidth:400, margin:0, lineHeight:1.65 }}>
                Connect your wallet to donate with ETH, or create an account to launch a verified campaign.
              </p>
            </div>
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              <button onClick={connectWallet} style={{
                padding:'11px 22px', borderRadius:'var(--r-full)', border:'none',
                background:'#fff', color:'var(--purple-700)',
                fontFamily:'var(--font-sans)', fontWeight:700, fontSize:'0.875rem',
                cursor:'pointer',
              }}>
                Connect wallet
              </button>
              <button onClick={() => navigate('/login')} style={{
                padding:'11px 22px', borderRadius:'var(--r-full)',
                background:'rgba(255,255,255,0.1)', border:'1.5px solid rgba(255,255,255,0.3)',
                color:'#fff', fontFamily:'var(--font-sans)', fontWeight:600, fontSize:'0.875rem',
                cursor:'pointer',
              }}>
                Create account
              </button>
            </div>
          </div>
        )}

        <div style={{ height:'3rem' }}/>
      </div>

      {/* Close sort dropdown on outside click */}
      {showSort && (
        <div style={{ position:'fixed', inset:0, zIndex:49 }} onClick={() => setShowSort(false)}/>
      )}
    </>
  )
}
