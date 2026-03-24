import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../hooks/useCampaigns'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'
import axios from 'axios'

const StatCard = ({ label, value, color }) => (
  <div className="bg-gray-50 rounded-xl p-4 text-center">
    <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
)

const InfoRow = ({ label, value, mono }) => {
  if (!value) return null
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 shrink-0 w-32">{label}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

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

const getStatus = (c) => {
  const expired  = Date.now() > c.deadline
  const funded   = parseFloat(c.amountRaised) >= parseFloat(c.goal)
  const expiring = !expired && (c.deadline - Date.now()) < 1000 * 60 * 60 * 24 * 7
  if (funded)   return 'funded'
  if (expired)  return 'expired'
  if (expiring) return 'expiring'
  return 'active'
}

const Profile = () => {
  const { account, connectWallet, chainId } = useWallet()
  const { user, token, logout }             = useAuth()
  const navigate                            = useNavigate()
  const [tab, setTab]                       = useState('details')
  const [fullUser, setFullUser]             = useState(null)
  const { campaigns, loading }              = useCampaigns()

  const created = campaigns.filter(
    (c) => c.owner?.toLowerCase() === account?.toLowerCase()
  )

  // ── Stats — read amountRaised from live blockchain data ───────────────────
  const totalRaised = created.reduce(
    (s, c) => s + (parseFloat(c.amountRaised) || 0), 0
  )
  const fundedCount = created.filter(
    (c) => parseFloat(c.amountRaised) >= parseFloat(c.goal)
  ).length
  const successRate = created.length > 0
    ? Math.round((fundedCount / created.length) * 100)
    : 0

  // ── Network name from chainId ─────────────────────────────────────────────
  const networkName = chainId === 11155111 ? 'Sepolia Testnet'
                    : chainId === 1         ? 'Ethereum Mainnet'
                    : chainId === 31337     ? 'Anvil Local'
                    : chainId              ? `Chain ${chainId}`
                    : 'Unknown'

  const networkColor = chainId === 11155111 ? 'text-blue-600'
                     : chainId === 1         ? 'text-green-600'
                     : 'text-gray-500'

  // Fetch full user from backend
  useEffect(() => {
    if (!token) return
    axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => setFullUser(data))
      .catch(() => {})
  }, [token])

  const displayUser = fullUser || user

  const short = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const formatDob = (dob) => {
    if (!dob) return null
    try {
      return new Date(dob).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    } catch { return dob }
  }

  const docStatusColor = {
    verified: 'text-green-600 bg-green-50 border-green-200',
    rejected: 'text-red-600 bg-red-50 border-red-200',
    pending:  'text-amber-600 bg-amber-50 border-amber-200',
  }

  if (!account) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <p className="text-gray-500">Connect your wallet to view your profile.</p>
      <button
        onClick={connectWallet}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700"
      >
        Connect wallet
      </button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">

      {/* Profile header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5 mb-6">

          {/* Avatar */}
          <div className="shrink-0">
            {displayUser?.profilePhoto ? (
              <img
                src={displayUser.profilePhoto}
                alt="profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-2xl border-2 border-purple-200">
                {displayUser?.name
                  ? displayUser.name.slice(0, 2).toUpperCase()
                  : account.slice(2, 4).toUpperCase()
                }
              </div>
            )}
            {displayUser?.isVerified && (
              <div className="flex items-center justify-center mt-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Verified
                </span>
              </div>
            )}
          </div>

          {/* Name & details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                {displayUser?.name ? (
                  <h1 className="text-xl font-bold text-gray-900">{displayUser.name}</h1>
                ) : (
                  <h1 className="text-xl font-bold text-gray-900 font-mono">{short(account)}</h1>
                )}
                {displayUser?.username && (
                  <p className="text-sm text-purple-600 font-medium">@{displayUser.username}</p>
                )}
                {displayUser?.email && (
                  <p className="text-sm text-gray-500 mt-0.5">{displayUser.email}</p>
                )}
                {displayUser?.location && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {displayUser.location}
                  </p>
                )}
              </div>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="shrink-0 text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Campaigns"    value={created.length} />
          <StatCard label="Funded"       value={fundedCount}    color="text-green-600" />
          <StatCard
            label="ETH raised"
            value={`${totalRaised.toFixed(4)} ETH`}
            color="text-purple-600"
          />
          <StatCard
            label="Success rate"
            value={`${successRate}%`}
            color={successRate >= 50 ? 'text-green-600' : 'text-gray-900'}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {['details', 'wallet', 'campaigns', 'documents'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Personal information
          </h2>
          {displayUser ? (
            <div>
              <InfoRow label="Full name"     value={displayUser.name} />
              <InfoRow label="Username"      value={displayUser.username ? `@${displayUser.username}` : null} />
              <InfoRow label="Email"         value={displayUser.email} />
              <InfoRow label="Phone"         value={displayUser.phone} />
              <InfoRow label="Date of birth" value={formatDob(displayUser.dob)} />
              <InfoRow label="Location"      value={displayUser.location} />
              <InfoRow
                label="Member since"
                value={displayUser.createdAt
                  ? new Date(displayUser.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })
                  : null
                }
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p className="mb-2">No personal details found.</p>
              <button
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Sign in to see your details →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Wallet tab ── */}
      {tab === 'wallet' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Wallet details
          </h2>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Connected address</p>
              <p className="font-mono text-sm text-gray-800 break-all">{account}</p>
            </div>
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-700 font-medium">Connected</span>
              </div>
              <span className={`text-xs font-medium ${networkColor}`}>{networkName}</span>
            </div>
            {chainId !== 11155111 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠ You are not on Sepolia. Switch to Sepolia Test Network in MetaMask to create and fund campaigns.
              </div>
            )}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-xs text-purple-700">
              Your wallet address is your identity on the blockchain. All campaigns you create are
              linked to this address.
            </div>
          </div>
        </div>
      )}

      {/* ── Campaigns tab ── */}
      {tab === 'campaigns' && (
        <div>
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : created.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-2xl">
              <p className="mb-4">You haven't created any campaigns yet.</p>
              <button
                onClick={() => navigate('/campaign/create')}
                className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700"
              >
                Create your first campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {created.map((c) => {
                const pct    = Math.min(
                  (parseFloat(c.amountRaised) / parseFloat(c.goal)) * 100, 100
                )
                const status = getStatus(c)
                return (
                  <div
                    key={c.contractAddress}
                    onClick={() => navigate(`/campaign/${c.contractAddress}`)}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-4">
                        <h3 className="font-semibold text-gray-900 truncate hover:text-purple-700">
                          {c.title}
                        </h3>
                        <p className="font-mono text-xs text-gray-400 mt-0.5">
                          {short(c.contractAddress)}
                        </p>
                        {c.category && (
                          <span className="inline-block mt-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full capitalize">
                            {c.category}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <ProgressBar percent={pct} />
                    <div className="flex justify-between mt-2 text-sm">
                      <span>
                        <span className="font-semibold text-gray-900">
                          {parseFloat(c.amountRaised).toFixed(4)}
                        </span>
                        <span className="text-gray-400"> / {c.goal} ETH</span>
                      </span>
                      <CountdownTimer deadline={c.deadline} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Documents tab ── */}
      {tab === 'documents' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Document verification
          </h2>
          {displayUser?.document?.hash ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {displayUser.document.type || 'Document'} submitted
                  </p>
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    {displayUser.document.hash}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full border capitalize ${
                  docStatusColor[displayUser.document.status] || docStatusColor.pending
                }`}>
                  {displayUser.document.status || 'Pending'}
                </span>
              </div>
              {displayUser.document.status === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  Your identity has been verified. You can now create campaigns.
                </div>
              )}
              {displayUser.document.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                  Your document was rejected. Please contact support or re-register with a valid document.
                </div>
              )}
              {(!displayUser.document.status || displayUser.document.status === 'pending') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  Your document is under review. This usually takes 1–2 business days.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-40">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="14 2 14 9 20 9"/>
              </svg>
              <p className="text-sm mb-1">No document submitted</p>
              <p className="text-xs">Submit a document during registration to get verified.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Profile
