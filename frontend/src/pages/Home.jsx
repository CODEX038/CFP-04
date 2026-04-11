import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const FILTERS    = ['all', 'active', 'expiring', 'funded']
const CATEGORIES = ['All', 'Education', 'Health', 'Technology', 'Environment', 'Community', 'Arts']

const Home = () => {
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [category, setCategory] = useState('All')
  const navigate = useNavigate()

  const filtered = campaigns.filter((c) => {
    if (c.verificationStatus !== 'verified') return false
    if (c.paused) return false
    const q           = search.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (category !== 'All' && c.category !== category) return false
    const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
    const pct        = (parseFloat(c.amountRaised) / parseFloat(c.goal)) * 100
    const expired    = Date.now() > deadlineMs
    if (filter === 'active')   return !expired
    if (filter === 'funded')   return pct >= 100
    if (filter === 'expiring') return !expired && (deadlineMs - Date.now()) < 1000 * 60 * 60 * 24 * 7
    return true
  })

  const verifiedCount = campaigns.filter(c => c.verificationStatus === 'verified').length
  const totalRaised   = campaigns
    .filter(c => c.verificationStatus === 'verified')
    .reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Fixed full-page background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1542435503-ec7b0f6b5d3c?w=1800&q=85"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(15,5,40,0.97) 0%, rgba(45,15,80,0.94) 50%, rgba(15,20,65,0.97) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        {/* Glow blobs */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.18] blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10">

        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto px-6 pt-10 pb-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">

            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-5 border"
                style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                {verifiedCount} verified campaigns · Live on Ethereum
              </div>

              <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-[1.08] tracking-tight">
                Fund ideas that<br/>
                <span style={{ background: 'linear-gradient(90deg, #c4b5fd 0%, #a78bfa 50%, #f0abfc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  change the world
                </span>
              </h1>

              <p className="text-base leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Browse verified campaigns. Donate with ETH or UPI.
                Every transaction is transparent and immutably on-chain.
              </p>

              <div className="flex gap-3 flex-wrap">
                {!account ? (
                  <button onClick={connectWallet}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 28px rgba(124,58,237,0.45)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    Connect wallet
                  </button>
                ) : (
                  <button onClick={() => navigate('/campaign/create')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.03]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 28px rgba(124,58,237,0.45)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                    </svg>
                    Start a campaign
                  </button>
                )}
                <button
                  onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.03]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)' }}>
                  Browse campaigns ↓
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="flex flex-row lg:flex-col gap-3">
              {[
                { icon: '🚀', label: 'Live campaigns',    value: `${verifiedCount}+` },
                { icon: '⟠',  label: 'ETH raised',        value: `${totalRaised.toFixed(3)}` },
                { icon: '🔒', label: 'Refund protected',  value: '100%' },
              ].map(s => (
                <div key={s.label}
                  className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}>
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-white font-black text-lg leading-none">{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sticky filter bar ── */}
        <div
          className="sticky top-0 z-40 px-6 py-4"
          style={{ background: 'rgba(15,5,40,0.75)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-7xl mx-auto space-y-3">

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="15" height="15"
                  viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 text-sm rounded-xl outline-none placeholder-shown:text-gray-500 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Status filter */}
              <div className="flex gap-1 p-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={filter === f
                      ? { background: 'rgba(124,58,237,0.85)', color: '#fff', boxShadow: '0 2px 10px rgba(124,58,237,0.4)' }
                      : { color: 'rgba(255,255,255,0.45)' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={category === cat
                    ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', boxShadow: '0 4px 14px rgba(124,58,237,0.5)' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Campaign grid ── */}
        <div id="grid" className="max-w-7xl mx-auto px-6 py-8">

          {/* Results header */}
          {!loading && !error && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {filtered.length === 0
                  ? 'No campaigns found'
                  : <><span className="text-white font-bold">{filtered.length}</span> campaign{filtered.length !== 1 ? 's' : ''} found</>}
                {category !== 'All' && (
                  <> in <span style={{ color: '#a78bfa', fontWeight: 600 }}>{category}</span></>
                )}
              </p>
              {(search || filter !== 'all' || category !== 'All') && (
                <button onClick={() => { setSearch(''); setFilter('all'); setCategory('All') }}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: '#a78bfa' }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full"
                  style={{ border: '3px solid rgba(124,58,237,0.15)' }} />
                <div className="absolute inset-0 rounded-full animate-spin"
                  style={{ border: '3px solid transparent', borderTopColor: '#7c3aed' }} />
              </div>
              <p className="text-white font-semibold">Loading campaigns...</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Fetching from blockchain</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <p className="font-semibold text-white mb-1">Something went wrong</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(239,68,68,0.75)' }}>{error}</p>
              <button onClick={refetch}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.3">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No campaigns found</h3>
              <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {verifiedCount === 0 ? 'No verified campaigns yet. Be the first!' : 'Try adjusting your search or filters.'}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {(search || filter !== 'all' || category !== 'All') && (
                  <button onClick={() => { setSearch(''); setFilter('all'); setCategory('All') }}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}>
                    Clear filters
                  </button>
                )}
                <button onClick={() => navigate('/campaign/create')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                  Create a campaign
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((campaign) => (
                <CampaignCard
                  key={campaign.contractAddress}
                  campaign={campaign}
                  onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                />
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          {!account && !loading && (
            <div className="mt-14 relative overflow-hidden rounded-3xl"
              style={{ border: '1px solid rgba(124,58,237,0.35)' }}>
              <img
                src="https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(15,5,40,0.94), rgba(55,20,90,0.9))' }} />
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-10">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">Ready to make an impact?</h3>
                  <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Connect your wallet to donate with ETH, or create an account to launch your own campaign.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 flex-wrap">
                  <button onClick={connectWallet}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 6px 24px rgba(124,58,237,0.5)' }}>
                    Connect wallet
                  </button>
                  <button onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.03]"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)' }}>
                    Create account
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="h-14" />
        </div>
      </div>
    </div>
  )
}

export default Home
