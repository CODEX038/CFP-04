import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import CampaignCard from '../components/CampaignCard'

const Home = () => {
  const { account, connectWallet } = useWallet()
  const { campaigns, loading, error, refetch } = useCampaigns()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const filtered = campaigns.filter((c) => {
    // ── Only show verified campaigns on public home page ──────────────────────
    if (c.verificationStatus !== 'verified') return false
    if (c.paused) return false

    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const pct     = (parseFloat(c.amountRaised) / parseFloat(c.goal)) * 100
    const expired = Date.now() > c.deadline

    if (filter === 'active')   return matchSearch && !expired
    if (filter === 'funded')   return matchSearch && pct >= 100
    if (filter === 'expiring') return matchSearch && !expired &&
      (c.deadline - Date.now()) < 1000 * 60 * 60 * 24 * 7
    return matchSearch
  })

  return (
    <div>
      <div className="text-center py-12 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Fund ideas that matter
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
          Transparent, trustless crowdfunding on the blockchain. Every transaction is on-chain.
        </p>
        {!account && (
          <button
            onClick={connectWallet}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-purple-700 transition-colors"
          >
            Connect wallet to start
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-400"
        />
        <div className="flex gap-2">
          {['all', 'active', 'expiring', 'funded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading campaigns...
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={refetch} className="text-sm text-purple-600 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          {campaigns.filter(c => c.verificationStatus === 'verified').length === 0
            ? 'No verified campaigns yet.'
            : 'No campaigns match your search.'}
        </div>
      )}

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
    </div>
  )
}

export default Home
