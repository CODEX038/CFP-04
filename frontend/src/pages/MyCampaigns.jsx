import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import { useCampaignContract } from '../hooks/useContract'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'

const StatusBadge = ({ status }) => {
  const styles = {
    active:   'bg-purple-100 text-purple-700',
    funded:   'bg-green-100 text-green-700',
    expiring: 'bg-amber-100 text-amber-700',
    expired:  'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] || styles.active}`}>
      {status}
    </span>
  )
}

// ── Verification badge ────────────────────────────────────────────────────────
const VerifBadge = ({ status }) => {
  if (!status || status === 'unverified') return null
  const styles = {
    pending:  'bg-amber-50 text-amber-600 border-amber-200',
    verified: 'bg-green-50 text-green-600 border-green-200',
    rejected: 'bg-red-50 text-red-500 border-red-200',
  }
  const labels = {
    pending:  '⏳ Pending verification',
    verified: '✓ Verified',
    rejected: '✕ Rejected',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

const getStatus = (c) => {
  const expired  = Date.now() > c.deadline
  const funded   = parseFloat(c.amountRaised) >= parseFloat(c.goal)
  const expiring = !expired && (c.deadline - Date.now()) < 1000 * 60 * 60 * 24 * 7
  if (funded)   return 'funded'
  if (expired)  return 'expired'
  if (expiring) return 'expiring'
  return 'active'
}

const WithdrawButton = ({ campaign, onSuccess }) => {
  const contract              = useCampaignContract(campaign.contractAddress, true)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const handleWithdraw = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try {
      const tx = await contract.withdraw()
      await tx.wait()
      setDone(true)
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Withdraw failed: ' + (err.reason || err.message))
    } finally {
      setLoading(false)
    }
  }

  if (done || campaign.claimed) return (
    <div className="mt-3 w-full bg-gray-100 text-gray-400 py-2.5 rounded-xl text-sm font-medium text-center">
      Funds successfully withdrawn
    </div>
  )

  return (
    <button onClick={handleWithdraw} disabled={loading}
      className="mt-3 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Withdrawing...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Withdraw funds
        </>
      )}
    </button>
  )
}

const MyCampaigns = () => {
  const { account, connectWallet } = useWallet()
  const navigate                   = useNavigate()
  const [filter, setFilter]        = useState('all')
  const { campaigns, loading, refetch } = useCampaigns()

  const mine = campaigns.filter(
    (c) => c.owner?.toLowerCase() === account?.toLowerCase()
  )

  const FILTERS = ['all', 'active', 'funded', 'expiring', 'expired']

  const filtered = mine.filter((c) => {
    if (filter === 'all') return true
    return getStatus(c) === filter
  })

  const totalRaised = mine.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const short = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!account) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <p className="text-gray-500">Connect your wallet to view your campaigns.</p>
      <button onClick={connectWallet}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700">
        Connect wallet
      </button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {mine.length} campaign{mine.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <button onClick={() => navigate('/campaign/create')}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          + New Campaign
        </button>
      </div>

      {/* Stats */}
      {mine.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {mine.filter(c => ['active', 'expiring'].includes(getStatus(c))).length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Active</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {mine.filter(c => getStatus(c) === 'funded').length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Funded</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-purple-600">{totalRaised.toFixed(2)} ETH</p>
            <p className="text-xs text-gray-400 mt-0.5">Total raised</p>
          </div>
        </div>
      )}

      {/* Pending verification notice */}
      {mine.some(c => c.verificationStatus === 'pending') && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          ⏳ You have campaigns pending admin verification. They will appear on the home page once approved.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => {
          const count = f === 'all' ? mine.length : mine.filter(c => getStatus(c) === f).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f}
              <span className={`ml-1.5 text-xs ${filter === f ? 'opacity-70' : 'text-gray-400'}`}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading campaigns...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">
            {filter === 'all' ? "You haven't created any campaigns yet." : `No ${filter} campaigns.`}
          </p>
          {filter === 'all' && (
            <button onClick={() => navigate('/campaign/create')}
              className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
              Create your first campaign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const pct       = Math.min((parseFloat(c.amountRaised) / parseFloat(c.goal)) * 100, 100)
            const status    = getStatus(c)
            const isFunded  = status === 'funded'
            const isExpired = status === 'expired'

            return (
              <div key={c.contractAddress}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-purple-200 transition-colors">
                <div className="cursor-pointer" onClick={() => navigate(`/campaign/${c.contractAddress}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <h3 className="font-semibold text-gray-900 truncate hover:text-purple-700">
                        {c.title}
                      </h3>
                      <p className="font-mono text-xs text-gray-400 mt-0.5">{short(c.contractAddress)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {c.category && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">
                            {c.category}
                          </span>
                        )}
                        {/* ── Verification badge ── */}
                        <VerifBadge status={c.verificationStatus} />
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <ProgressBar percent={pct} />

                  <div className="flex justify-between mt-2 text-sm">
                    <span>
                      <span className="font-semibold text-gray-900">{parseFloat(c.amountRaised).toFixed(4)}</span>
                      <span className="text-gray-400"> / {c.goal} ETH</span>
                    </span>
                    <span className={`font-medium ${pct >= 100 ? 'text-green-600' : 'text-purple-600'}`}>
                      {Math.round(pct)}%
                    </span>
                  </div>

                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>{c.funders || 0} funders</span>
                    <CountdownTimer deadline={c.deadline} />
                  </div>
                </div>

                {isFunded && !c.claimed && <WithdrawButton campaign={c} onSuccess={refetch} />}
                {isFunded && c.claimed && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500 text-center font-medium">
                    Funds successfully withdrawn
                  </div>
                )}
                {isExpired && !isFunded && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-600 text-center">
                    Goal not met — funders can claim their refunds
                  </div>
                )}
                {status === 'expiring' && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 text-center">
                    Expiring soon — share your campaign to reach the goal!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyCampaigns
