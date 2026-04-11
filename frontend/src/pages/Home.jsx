import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const CATEGORIES = ['All', 'Medical', 'Education', 'Environment', 'Animals', 'Community', 'Disaster', 'Arts', 'Sports', 'Technology']
const FILTERS = ['all', 'active', 'expiring', 'funded']
const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'trending', label: 'Most funded' },
  { value: 'ending',   label: 'Ending soon' },
  { value: 'goal',     label: 'Biggest goal' },
]

export default function Home() {
  const navigate = useNavigate()
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()

  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [category, setCategory] = useState('All')
  const [sort, setSort]         = useState('newest')

  /* ── Derived data ── */
  const verifiedCampaigns = useMemo(() =>
    campaigns.filter(c => c.verificationStatus === 'verified' && !c.paused),
  [campaigns])

  const featuredCampaign = useMemo(() =>
    [...verifiedCampaigns]
      .filter(c => Date.now() < (c.deadline > 1e12 ? c.deadline : c.deadline * 1000))
      .sort((a, b) => parseFloat(b.amountRaised || 0) - parseFloat(a.amountRaised || 0))[0],
  [verifiedCampaigns])

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

    if (category !== 'All') {
      list = list.filter(c => c.category?.toLowerCase() === category.toLowerCase())
    }

    list = list.filter(c => {
      const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
      const pct        = (parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100
      const expired    = Date.now() > deadlineMs
      if (filter === 'active')   return !expired
      if (filter === 'funded')   return pct >= 100
      if (filter === 'expiring') return !expired && (deadlineMs - Date.now()) < 1000 * 60 * 60 * 24 * 7
      return true
    })

    switch (sort) {
      case 'trending': list.sort((a, b) => parseFloat(b.amountRaised || 0) - parseFloat(a.amountRaised || 0)); break
      case 'ending':   list.sort((a, b) => (a.deadline > 1e12 ? a.deadline : a.deadline * 1000) - (b.deadline > 1e12 ? b.deadline : b.deadline * 1000)); break
      case 'goal':     list.sort((a, b) => parseFloat(b.goal || 0) - parseFloat(a.goal || 0)); break
      default:         list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }

    return list
  }, [verifiedCampaigns, search, category, filter, sort])

  const hasActiveFilters = search || filter !== 'all' || category !== 'All'

  const clearFilters = () => { setSearch(''); setFilter('all'); setCategory('All') }

  /* ── Progress helper ── */
  const pct = (c) => Math.min((parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100, 100)

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ══ Fixed background ══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(145deg, #0a0a14 0%, #0f0a1e 35%, #0a1020 65%, #080c18 100%)',
        }}/>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}/>
        {/* Atmospheric glows */}
        <div style={{
          position: 'absolute', top: '-10%', left: '20%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}/>
        <div style={{
          position: 'absolute', top: '30%', right: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}/>
        <div style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}/>
      </div>

      {/* ══ Page content ══ */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ══ Hero ══ */}
        <section style={{
          maxWidth: 1200, margin: '0 auto',
          padding: 'clamp(3rem, 8vw, 5.5rem) 1.5rem clamp(2rem, 5vw, 3.5rem)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          gap: '3.5rem',
          alignItems: 'center',
        }}>

          {/* Left copy */}
          <div style={{ animation: 'fadeUp .6s ease both' }}>

            {/* Live badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 100, padding: '5px 14px', marginBottom: '1.5rem',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#10b981', animation: 'pulse 2s infinite',
              }}/>
              <span style={{ fontSize: '.75rem', color: '#10b981', fontWeight: 600, letterSpacing: '.05em' }}>
                {verifiedCampaigns.length} VERIFIED CAMPAIGNS · LIVE ON CHAIN
              </span>
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2.6rem, 5.5vw, 4rem)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-.025em',
              color: '#fff',
              margin: '0 0 1.25rem',
            }}>
              Fund ideas that<br/>
              <em style={{
                fontStyle: 'italic',
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>change the world</em>
            </h1>

            <p style={{
              fontSize: 'clamp(.95rem, 2vw, 1.05rem)',
              color: 'rgba(255,255,255,0.48)',
              lineHeight: 1.75,
              marginBottom: '2rem',
              maxWidth: 460,
            }}>
              FundChain connects people to causes through transparent,
              blockchain-verified fundraising. Every donation tracked. Every rupee accountable.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              {!account ? (
                <button onClick={connectWallet} style={styles.btnPrimary}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="7" width="20" height="14" rx="3"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                  Connect wallet
                </button>
              ) : (
                <button onClick={() => navigate('/campaign/create')} style={styles.btnPrimary}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                  </svg>
                  Start a campaign
                </button>
              )}
              <button
                onClick={() => document.getElementById('campaigns-grid')?.scrollIntoView({ behavior: 'smooth' })}
                style={styles.btnGhost}>
                Browse campaigns
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { val: `${verifiedCampaigns.length}+`, lbl: 'Live campaigns', icon: '🚀' },
                { val: `${totalRaised.toFixed(2)} ETH`, lbl: 'Total raised', icon: '⟠' },
                { val: '100%', lbl: 'Refund protected', icon: '🔒' },
              ].map(s => (
                <div key={s.lbl}>
                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.45rem', fontWeight: 700,
                    color: '#fff', lineHeight: 1,
                  }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: '.73rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Featured campaign card */}
          <div style={{ position: 'relative', animation: 'fadeUp .6s .12s ease both' }}>
            {/* Decorative rings */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 260, height: 260, borderRadius: '50%',
              border: '1px solid rgba(16,185,129,0.12)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              position: 'absolute', top: -55, right: -55,
              width: 320, height: 320, borderRadius: '50%',
              border: '1px solid rgba(16,185,129,0.06)',
              pointerEvents: 'none',
            }}/>

            {loading ? (
              <div style={{ ...styles.featuredCard, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
                <Spinner />
              </div>
            ) : featuredCampaign ? (
              <div
                style={styles.featuredCard}
                onClick={() => navigate(`/campaign/${featuredCampaign.contractAddress}`)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Image */}
                <div style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
                  {featuredCampaign.imageHash ? (
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${featuredCampaign.imageHash}`}
                      alt={featuredCampaign.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(245,158,11,0.1))',
                    }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: 'rgba(255,255,255,0.2)' }}>
                        Featured
                      </span>
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                    background: 'linear-gradient(transparent, rgba(10,10,20,0.8))',
                  }}/>
                  <span style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(16,185,129,0.9)', color: '#fff',
                    fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
                    padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase',
                  }}>
                    ✦ Top Funded
                  </span>
                  {featuredCampaign.category && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '.68rem', fontWeight: 600,
                      padding: '3px 10px', borderRadius: 100,
                    }}>
                      {featuredCampaign.category}
                    </span>
                  )}
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.1rem', fontWeight: 600,
                    color: '#fff', margin: '0 0 .75rem', lineHeight: 1.35,
                  }}>
                    {featuredCampaign.title}
                  </h3>

                  {/* Progress bar */}
                  <div style={{
                    height: 5, background: 'rgba(255,255,255,0.08)',
                    borderRadius: 100, overflow: 'hidden', marginBottom: 10,
                  }}>
                    <div style={{
                      height: '100%', width: `${pct(featuredCampaign)}%`,
                      background: 'linear-gradient(90deg, #10b981, #f59e0b)',
                      borderRadius: 100, transition: 'width .6s ease',
                    }}/>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      {featuredCampaign.paymentType === 'fiat'
                        ? `₹${parseFloat(featuredCampaign.amountRaised || 0).toLocaleString('en-IN')}`
                        : `${parseFloat(featuredCampaign.amountRaised || 0).toFixed(3)} ETH`} raised
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {featuredCampaign.funders || 0} supporters
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                ...styles.featuredCard,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 280, cursor: 'default',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🌱</div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '.85rem' }}>No campaigns yet</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ Sticky filter bar ══ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(10,10,20,0.82)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 1.5rem',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Row 1: search + status filters + sort */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Search */}
              <div style={{ position: 'relative', flex: '1', minWidth: 180 }}>
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search campaigns…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: search ? 36 : 14,
                    paddingTop: 9, paddingBottom: 9,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 100, outline: 'none',
                    fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '.85rem',
                    color: '#fff', boxSizing: 'border-box',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Status filters */}
              <div style={{
                display: 'flex', gap: 2, padding: 3,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
              }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: '.78rem', fontWeight: 600, textTransform: 'capitalize',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all .15s',
                    ...(filter === f
                      ? { background: 'rgba(16,185,129,0.85)', color: '#fff', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)' })
                  }}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 100, padding: '8px 16px', outline: 'none', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif", fontSize: '.8rem',
                  color: 'rgba(255,255,255,0.7)',
                }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#0f0a1e' }}>{o.label}</option>)}
              </select>
            </div>

            {/* Row 2: category pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  flexShrink: 0, padding: '5px 14px', borderRadius: 100, border: 'none',
                  cursor: 'pointer', fontSize: '.75rem', fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all .15s',
                  ...(category === cat
                    ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 3px 12px rgba(16,185,129,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' })
                }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Campaigns grid ══ */}
        <section id="campaigns-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

          {/* Results header */}
          {!loading && !error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 8 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '.875rem', margin: 0 }}>
                {filtered.length === 0
                  ? 'No campaigns found'
                  : <><span style={{ color: '#fff', fontWeight: 700 }}>{filtered.length}</span>{' '}campaign{filtered.length !== 1 ? 's' : ''} found</>
                }
                {category !== 'All' && (
                  <> in <span style={{ color: '#10b981', fontWeight: 600 }}>{category}</span></>
                )}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: '#10b981', fontSize: '.8rem', fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{ height: 186, background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s infinite' }}/>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={styles.skeletonLine(80)}/>
                    <div style={styles.skeletonLine(50)}/>
                    <div style={{ height: 5, ...styles.skeletonLine(100), marginTop: 8 }}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={styles.skeletonLine(35)}/>
                      <div style={styles.skeletonLine(25)}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <p style={{ color: '#fff', fontWeight: 600, marginBottom: '.5rem' }}>Something went wrong</p>
              <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: '.875rem', marginBottom: '1.5rem' }}>{error}</p>
              <button onClick={refetch} style={styles.btnPrimary}>Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '5rem 1.5rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20, margin: '0 auto 1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.3">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.4rem', color: '#fff', marginBottom: '.5rem',
              }}>
                No campaigns found
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '.875rem', marginBottom: '1.5rem', maxWidth: 300, margin: '0 auto 1.5rem' }}>
                {search ? `Nothing matches "${search}"` : verifiedCampaigns.length === 0 ? 'No verified campaigns yet. Be the first!' : 'Try adjusting your filters.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {hasActiveFilters && (
                  <button onClick={clearFilters} style={styles.btnGhost}>Clear filters</button>
                )}
                <button onClick={() => navigate('/campaign/create')} style={styles.btnPrimary}>
                  Create a campaign
                </button>
              </div>
            </div>
          )}

          {/* Campaign grid */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}>
              {filtered.map((campaign, i) => (
                <div key={campaign.contractAddress} style={{
                  animation: `fadeUp .5s ${Math.min(i, 8) * 55}ms ease both`,
                }}>
                  <CampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          )}

          {/* Bottom CTA for unauthenticated users */}
          {!account && !loading && (
            <div style={{
              marginTop: '4rem', position: 'relative', overflow: 'hidden',
              borderRadius: 24, border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(10,30,25,0.95) 50%, rgba(10,10,20,0.97) 100%)',
              }}/>
              {/* Glow */}
              <div style={{
                position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
                width: 400, height: 300, borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}/>
              <div style={{
                position: 'relative', zIndex: 1, padding: '2.5rem 2rem',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                justifyContent: 'space-between', gap: '1.5rem',
              }}>
                <div>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.7rem', color: '#fff', margin: '0 0 .5rem',
                  }}>
                    Ready to make an impact?
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '.9rem', maxWidth: 380, margin: 0 }}>
                    Connect your wallet to donate with ETH, or create an account to launch your own verified campaign.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
                  <button onClick={connectWallet} style={styles.btnPrimary}>Connect wallet</button>
                  <button onClick={() => navigate('/login')} style={styles.btnGhost}>Create account</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ height: 60 }}/>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .35; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { opacity: .5; }
          50%  { opacity: .8; }
          100% { opacity: .5; }
        }

        input::placeholder { color: rgba(255,255,255,0.28); }
        input[type="text"] { caret-color: #10b981; }

        @media (max-width: 768px) {
          section:first-of-type {
            grid-template-columns: 1fr !important;
          }
          section:first-of-type > div:last-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Shared style objects ── */
const styles = {
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 24px', borderRadius: 100, border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff', fontFamily: "'DM Sans', sans-serif",
    fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(16,185,129,0.35)',
    transition: 'transform .15s, box-shadow .15s',
  },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '11px 24px', borderRadius: 100,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif",
    fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
    backdropFilter: 'blur(12px)', transition: 'all .15s',
  },
  featuredCard: {
    position: 'relative', zIndex: 1, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    transition: 'transform .25s ease, box-shadow .25s ease',
  },
  skeletonLine: (w) => ({
    height: 14, width: `${w}%`, borderRadius: 8,
    background: 'rgba(255,255,255,0.07)',
    animation: 'shimmer 1.5s infinite',
  }),
}

function Spinner() {
  return (
    <div style={{ position: 'relative', width: 40, height: 40 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid rgba(16,185,129,0.15)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid transparent', borderTopColor: '#10b981',
        animation: 'spin .8s linear infinite',
      }}/>
    </div>
  )
}
