import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const FILTERS = ['all', 'active', 'expiring', 'funded']

const CATEGORIES = ['All', 'Education', 'Health', 'Technology', 'Environment', 'Community', 'Arts']

const Home = () => {
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [category, setCategory]   = useState('All')
  const navigate = useNavigate()

  const filtered = campaigns.filter((c) => {
    if (c.verificationStatus !== 'verified') return false
    if (c.paused) return false

    const q          = search.toLowerCase()
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
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80"
            alt="hero"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/88 via-purple-900/80 to-indigo-900/88" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {verifiedCount} verified campaigns live
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
              Fund ideas that
              <span className="block bg-gradient-to-r from-violet-300 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                change the world
              </span>
            </h1>

            <p className="text-white/65 text-lg mb-8 leading-relaxed max-w-lg">
              Browse verified campaigns. Support with ETH or UPI. Every rupee and wei tracked transparently on-chain.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {!account ? (
                <button onClick={connectWallet}
                  className="px-7 py-3.5 bg-white text-violet-700 rounded-2xl font-bold hover:bg-violet-50 transition-all shadow-xl shadow-black/20 flex items-center gap-2 w-fit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="7" width="20" height="14" rx="3"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    <line x1="12" y1="12" x2="12" y2="16"/>
                    <line x1="10" y1="14" x2="14" y2="14"/>
                  </svg>
                  Connect wallet to donate
                </button>
              ) : (
                <button onClick={() => navigate('/campaign/create')}
                  className="px-7 py-3.5 bg-white text-violet-700 rounded-2xl font-bold hover:bg-violet-50 transition-all shadow-xl shadow-black/20 flex items-center gap-2 w-fit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                  Start a campaign
                </button>
              )}
              <button onClick={() => document.getElementById('campaigns-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-7 py-3.5 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/20 flex items-center gap-2 w-fit">
                Browse campaigns ↓
              </button>
            </div>
          </div>

          {/* Mini stats */}
          <div className="mt-10 flex items-center gap-6 flex-wrap">
            {[
              { label: 'Campaigns', value: `${verifiedCount}+` },
              { label: 'ETH raised', value: `${totalRaised.toFixed(2)}` },
              { label: 'Refund protected', value: '100%' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <p className="text-white font-black text-lg">{s.value}</p>
                <p className="text-white/50 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search & Filters ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search campaigns by title or description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    filter === f
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  category === cat
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div id="campaigns-grid" className="max-w-7xl mx-auto px-6 py-10">

        {/* Results header */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-400">
                {filtered.length === 0
                  ? 'No campaigns found'
                  : `${filtered.length} campaign${filtered.length !== 1 ? 's' : ''} found`}
                {search && <span> for "<span className="text-gray-600 font-medium">{search}</span>"</span>}
                {category !== 'All' && <span> in <span className="text-violet-600 font-medium">{category}</span></span>}
              </p>
            </div>
            {(search || filter !== 'all' || category !== 'All') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); setCategory('All') }}
                className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1">
                Clear filters
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-3 border-violet-100 rounded-full" />
              <div className="w-14 h-14 border-3 border-t-violet-600 rounded-full animate-spin absolute inset-0" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-semibold">Loading campaigns</p>
              <p className="text-sm text-gray-400 mt-1">Fetching from blockchain...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-1">Something went wrong</p>
            <p className="text-red-400 text-sm mb-5">{error}</p>
            <button onClick={refetch}
              className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <path d="M8 11h6M11 8v6" opacity=".4"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No campaigns found</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              {verifiedCount === 0
                ? 'No verified campaigns yet. Be the first to create one!'
                : 'Try adjusting your search or filters to find what you\'re looking for.'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {(search || filter !== 'all' || category !== 'All') && (
                <button
                  onClick={() => { setSearch(''); setFilter('all'); setCategory('All') }}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Clear all filters
                </button>
              )}
              <button onClick={() => navigate('/campaign/create')}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                Create a campaign
              </button>
            </div>
          </div>
        )}

        {/* Campaign grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((campaign) => (
              <CampaignCard
                key={campaign.contractAddress}
                campaign={campaign}
                onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA for non-connected users */}
        {!account && !loading && (
          <div className="mt-16 relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&q=80"
                alt="cta"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-900/95 to-purple-900/85" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-10">
              <div>
                <h3 className="text-2xl font-black text-white mb-2">Ready to make an impact?</h3>
                <p className="text-white/60 text-sm max-w-sm">
                  Connect your wallet to donate with ETH, or sign up to accept UPI payments for your campaign.
                </p>
              </div>
              <div className="flex gap-3 shrink-0 flex-wrap">
                <button onClick={connectWallet}
                  className="px-6 py-3 bg-white text-violet-700 rounded-xl font-bold text-sm hover:bg-violet-50 transition-all shadow-lg">
                  Connect wallet
                </button>
                <button onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all">
                  Create account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
