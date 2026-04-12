import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const CATEGORIES   = ['All', 'Education', 'Health', 'Technology', 'Environment', 'Community', 'Arts']
const FILTERS      = ['All', 'Active', 'Expiring', 'Funded']
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
  const [filter,   setFilter]   = useState('All')
  const [category, setCategory] = useState('All')
  const [sort,     setSort]     = useState('newest')

  /* ── derived data ── */
  const verified = useMemo(() =>
    campaigns.filter(c => c.verificationStatus === 'verified' && !c.paused),
  [campaigns])

  const totalRaised = useMemo(() =>
    verified.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0),
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

    const f = filter.toLowerCase()
    list = list.filter(c => {
      const ms  = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
      const pct = (parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100
      const exp = Date.now() > ms
      if (f === 'active')   return !exp
      if (f === 'funded')   return pct >= 100
      if (f === 'expiring') return !exp && (ms - Date.now()) < 864e5 * 7
      return true
    })

    switch (sort) {
      case 'trending': list.sort((a, b) => parseFloat(b.amountRaised || 0) - parseFloat(a.amountRaised || 0)); break
      case 'ending':   list.sort((a, b) => (a.deadline > 1e12 ? a.deadline : a.deadline * 1000) - (b.deadline > 1e12 ? b.deadline : b.deadline * 1000)); break
      case 'goal':     list.sort((a, b) => parseFloat(b.goal || 0) - parseFloat(a.goal || 0)); break
      default:         list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }
    return list
  }, [verified, search, category, filter, sort])

  const hasFilters   = search || filter !== 'All' || category !== 'All'
  const clearFilters = () => { setSearch(''); setFilter('All'); setCategory('All') }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        /* ── Hero ── */
        .fc-hero {
          position: relative;
          min-height: 520px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .fc-hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .fc-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            100deg,
            rgba(88, 28, 135, 0.88) 0%,
            rgba(109, 40, 217, 0.75) 35%,
            rgba(124, 58, 237, 0.60) 60%,
            rgba(139, 92, 246, 0.45) 100%
          );
        }
        .fc-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(3rem, 8vw, 5rem) clamp(1.25rem, 4vw, 2rem);
        }

        /* Hero badge */
        .fc-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 999px;
          padding: 5px 14px;
          margin-bottom: 1.4rem;
          font-size: .8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: .03em;
          backdrop-filter: blur(6px);
        }
        .fc-badge-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #4ade80;
          animation: fcPulse 2s infinite;
          flex-shrink: 0;
        }

        /* Hero headline */
        .fc-h1 {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -.02em;
          color: #fff;
          margin: 0 0 1.1rem;
        }
        .fc-h1-accent {
          color: #c4b5fd;
        }

        /* Hero sub */
        .fc-sub {
          font-size: clamp(.95rem, 2vw, 1.05rem);
          color: rgba(255,255,255,0.72);
          line-height: 1.75;
          max-width: 520px;
          margin: 0 0 2rem;
        }

        /* Hero CTA row */
        .fc-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }
        .fc-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 26px;
          border: none;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
          border: 2px solid rgba(255,255,255,0.6);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .95rem;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background .18s, border-color .18s, transform .15s;
          white-space: nowrap;
        }
        .fc-btn-primary:hover {
          background: rgba(255,255,255,0.28);
          transform: translateY(-1px);
        }
        .fc-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 26px;
          border-radius: 999px;
          background: rgba(109,40,217,0.5);
          border: 2px solid rgba(255,255,255,0.25);
          color: rgba(255,255,255,0.9);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .95rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background .18s, transform .15s;
          white-space: nowrap;
        }
        .fc-btn-ghost:hover {
          background: rgba(109,40,217,0.7);
          transform: translateY(-1px);
        }

        /* Hero inline stats row */
        .fc-stats-row {
          display: flex;
          gap: 2.5rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .fc-stat {
          display: flex;
          align-items: baseline;
          gap: 7px;
        }
        .fc-stat-val {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 400;
          color: #fff;
          line-height: 1;
        }
        .fc-stat-lbl {
          font-size: .82rem;
          color: rgba(255,255,255,0.55);
          font-weight: 500;
        }

        /* ── Filter bar — light (matching screenshot 2) ── */
        .fc-filterbar {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px clamp(1.25rem, 4vw, 2rem);
          position: sticky;
          top: 0;
          z-index: 40;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        }
        .fc-filterbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fc-search-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .fc-search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .fc-search {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 1.5px solid #e5e7eb;
          border-radius: 999px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .875rem;
          color: #111;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
          background: #fff;
        }
        .fc-search::placeholder { color: #9ca3af; }
        .fc-search:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.12);
        }

        /* Filter pill tabs (purple, right side) */
        .fc-tabs {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          border-radius: 999px;
          padding: 4px;
          flex-shrink: 0;
        }
        .fc-tab {
          padding: 7px 18px;
          border: none;
          border-radius: 999px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .18s;
          white-space: nowrap;
        }
        .fc-tab-active {
          background: #7c3aed;
          color: #fff;
          box-shadow: 0 2px 8px rgba(124,58,237,.35);
        }
        .fc-tab-inactive {
          background: transparent;
          color: #6b7280;
        }
        .fc-tab-inactive:hover { background: #e5e7eb; color: #374151; }

        /* Category pills (below search row, outline style) */
        .fc-cats {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .fc-cats::-webkit-scrollbar { display: none; }
        .fc-cat {
          flex-shrink: 0;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1.5px solid #d1d5db;
          background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .8rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all .18s;
          white-space: nowrap;
        }
        .fc-cat:hover { border-color: #7c3aed; color: #7c3aed; }
        .fc-cat-active {
          background: #7c3aed;
          border-color: #7c3aed;
          color: #fff;
          font-weight: 700;
        }

        /* ── Grid section — light bg ── */
        .fc-grid-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem clamp(1.25rem, 4vw, 2rem) 5rem;
          background: transparent;
        }

        /* Campaign grid */
        .fc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(390px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 880px) {
          .fc-grid { grid-template-columns: 1fr; }
        }

        /* ── Skeleton ── */
        .fc-skel {
          background: linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: fcSkelWave 1.6s ease infinite;
          border-radius: 8px;
        }
        @keyframes fcSkelWave {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Animations ── */
        @keyframes fcPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fcFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fc-fade-up { animation: fcFadeUp .5s ease both; }

        /* ── Bottom CTA ── */
        .fc-cta-box {
          margin-top: 3.5rem;
          border-radius: 24px;
          background: linear-gradient(135deg, #581c87 0%, #6d28d9 50%, #7c3aed 100%);
          padding: 2.5rem 2rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }
        .fc-cta-btn {
          padding: 12px 26px;
          border-radius: 999px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform .15s;
          white-space: nowrap;
          border: none;
        }
        .fc-cta-btn:hover { transform: translateY(-1px); }
        .fc-cta-btn-white {
          background: #fff;
          color: #6d28d9;
        }
        .fc-cta-btn-outline {
          background: rgba(255,255,255,0.1);
          border: 1.5px solid rgba(255,255,255,0.3) !important;
          color: #fff;
        }

        @media (max-width: 640px) {
          .fc-hero { min-height: 420px; }
          .fc-stats-row { gap: 1.5rem; }
          .fc-cta-box { flex-direction: column; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          HERO (matching screenshot 1)
      ══════════════════════════════════════ */}
      <section className="fc-hero">
        {/* Background photo */}
        <img
          className="fc-hero-img"
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1800&q=80"
          alt=""
        />
        <div className="fc-hero-overlay" />

        <div className="fc-hero-content fc-fade-up">

          {/* Live badge */}
          <div className="fc-badge">
            <span className="fc-badge-dot" />
            {verified.length} verified campaigns live
          </div>

          {/* Headline */}
          <h1 className="fc-h1">
            Fund ideas that<br />
            <span className="fc-h1-accent">change the world</span>
          </h1>

          {/* Sub */}
          <p className="fc-sub">
            Browse verified campaigns. Support with ETH or UPI. Every
            rupee and wei tracked transparently on-chain.
          </p>

          {/* CTA buttons */}
          <div className="fc-cta-row">
            {account ? (
              <button className="fc-btn-primary" onClick={() => navigate('/campaign/create')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                </svg>
                Start a campaign
              </button>
            ) : (
              <button className="fc-btn-primary" onClick={connectWallet}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                </svg>
                Start a campaign
              </button>
            )}
            <button
              className="fc-btn-ghost"
              onClick={() => document.getElementById('fc-grid')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Browse campaigns ↓
            </button>
          </div>

          {/* Inline stats row (matching screenshot 1 bottom of hero) */}
          <div className="fc-stats-row">
            <div className="fc-stat">
              <span className="fc-stat-val">{verified.length}+</span>
              <span className="fc-stat-lbl">Campaigns</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-val">{totalRaised.toFixed(2)}</span>
              <span className="fc-stat-lbl">ETH raised</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-val">100%</span>
              <span className="fc-stat-lbl">Refund protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FILTER BAR — light (matching screenshot 2)
      ══════════════════════════════════════ */}
      <div className="fc-filterbar">
        <div className="fc-filterbar-inner">

          {/* Row 1: search + filter tabs */}
          <div className="fc-search-row">

            {/* Search */}
            <div className="fc-search-wrap">
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="fc-search"
                placeholder="Search campaigns by title or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter tabs (purple pills, right side — matching screenshot 2) */}
            <div className="fc-tabs">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`fc-tab ${filter === f ? 'fc-tab-active' : 'fc-tab-inactive'}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Category pills */}
          <div className="fc-cats">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`fc-cat ${category === cat ? 'fc-cat-active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CAMPAIGN GRID — light bg (matching screenshot 2)
      ══════════════════════════════════════ */}
      <div style={{ background: '#f9fafb', minHeight: 400 }}>
        <div id="fc-grid" className="fc-grid-section">

          {/* Results count */}
          {!loading && !error && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8,
            }}>
              <p style={{ fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: '.875rem', color: '#6b7280', margin: 0 }}>
                {filtered.length === 0
                  ? 'No campaigns found'
                  : <><strong style={{ color: '#111', fontWeight: 700 }}>{filtered.length}</strong>{' '}campaign{filtered.length !== 1 ? 's' : ''} found</>
                }
                {category !== 'All' && (
                  <> in <span style={{ color: '#7c3aed', fontWeight: 600 }}>{category}</span></>
                )}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: "'DM Sans',system-ui,sans-serif", fontSize: '.82rem',
                  fontWeight: 600, color: '#7c3aed',
                }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="fc-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                }}>
                  <div className="fc-skel" style={{ height: 200 }} />
                  <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="fc-skel" style={{ height: 20, width: '75%' }} />
                    <div className="fc-skel" style={{ height: 14, width: '90%' }} />
                    <div className="fc-skel" style={{ height: 14, width: '70%' }} />
                    <div className="fc-skel" style={{ height: 6, marginTop: 6 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="fc-skel" style={{ height: 13, width: '40%' }} />
                      <div className="fc-skel" style={{ height: 13, width: '20%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fef2f2', border: '1px solid #fecdd3',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p style={{ fontFamily: "'DM Sans',system-ui", fontWeight: 700, color: '#111', marginBottom: '.4rem' }}>
                Something went wrong
              </p>
              <p style={{ color: '#e11d48', fontSize: '.875rem', marginBottom: '1.25rem' }}>{error}</p>
              <button onClick={refetch} style={{
                padding: '10px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
                fontFamily: "'DM Sans',system-ui", fontWeight: 700,
              }}>
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '4rem 1.5rem',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 20,
            }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '1rem' }}>🌱</div>
              <h3 style={{
                fontFamily: "'DM Serif Display',Georgia,serif",
                fontSize: '1.35rem', color: '#111', marginBottom: '.5rem',
              }}>
                No campaigns found
              </h3>
              <p style={{
                fontFamily: "'DM Sans',system-ui", color: '#9ca3af',
                fontSize: '.9rem', marginBottom: '1.5rem',
              }}>
                {search
                  ? `Nothing matches "${search}"`
                  : verified.length === 0
                    ? 'No verified campaigns yet. Be the first to launch one!'
                    : 'Try adjusting your search or filters.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {hasFilters && (
                  <button onClick={clearFilters} style={{
                    padding: '10px 22px', borderRadius: 999,
                    border: '1.5px solid #d1d5db', background: '#fff',
                    fontFamily: "'DM Sans',system-ui", fontWeight: 600,
                    fontSize: '.875rem', color: '#374151', cursor: 'pointer',
                  }}>
                    Clear filters
                  </button>
                )}
                <button onClick={() => navigate('/campaign/create')} style={{
                  padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
                  fontFamily: "'DM Sans',system-ui", fontWeight: 700, fontSize: '.875rem',
                }}>
                  Create a campaign
                </button>
              </div>
            </div>
          )}

          {/* Campaign grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="fc-grid">
              {filtered.map((campaign, i) => (
                <div
                  key={campaign.contractAddress}
                  className="fc-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <CampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          )}

          {/* Bottom CTA for unauthenticated */}
          {!account && !loading && filtered.length > 0 && (
            <div className="fc-cta-box">
              <div>
                <h3 style={{
                  fontFamily: "'DM Serif Display',Georgia,serif",
                  fontSize: '1.7rem', color: '#fff', margin: '0 0 .4rem',
                }}>
                  Ready to make an impact?
                </h3>
                <p style={{
                  fontFamily: "'DM Sans',system-ui", color: 'rgba(255,255,255,.55)',
                  fontSize: '.92rem', maxWidth: 400, margin: 0, lineHeight: 1.65,
                }}>
                  Connect your wallet to donate with ETH, or create an account to launch a verified campaign.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={connectWallet} className="fc-cta-btn fc-cta-btn-white">
                  Connect wallet
                </button>
                <button onClick={() => navigate('/login')} className="fc-cta-btn fc-cta-btn-outline">
                  Create account
                </button>
              </div>
            </div>
          )}

          <div style={{ height: 60 }} />
        </div>
      </div>
    </>
  )
}
