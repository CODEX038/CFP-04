import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useCampaigns } from '../hooks/useCampaigns'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'
import VerificationBadge, { DocumentStatusBadge } from '../components/VerificationBadge'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Small helpers ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, sub }) => (
  <div className="bg-gray-50 rounded-xl p-4 text-center">
    <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
)

const InfoRow = ({ label, value, mono, badge }) => {
  if (!value && !badge) return null
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 shrink-0 w-40">{label}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {badge || value}
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

const VerifBadge = ({ ok, label }) => (
  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
    ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
  }`}>
    {ok ? '✓' : '✗'} {label}
  </span>
)

const getStatus = (c) => {
  const nowMs = Date.now()
  const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
  const expired = nowMs > deadlineMs
  const funded = parseFloat(c.amountRaised) >= parseFloat(c.goal)
  const expiring = !expired && (deadlineMs - nowMs) < 1000 * 60 * 60 * 24 * 7
  if (funded) return 'funded'
  if (expired) return 'expired'
  if (expiring) return 'expiring'
  return 'active'
}

const formatDate = (val) => {
  if (!val) return null
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return String(val) }
}

const formatDateTime = (val) => {
  if (!val) return null
  try {
    return new Date(val).toLocaleString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return String(val) }
}

const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'

// ── Main component ────────────────────────────────────────────────────────────
const Profile = () => {
  const { account, connectWallet, chainId } = useWallet()
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('details')
  const [fullUser, setFullUser] = useState(null)
  const [myDonations, setMyDonations] = useState([])
  const [loadingDonations, setLoadingDonations] = useState(false)
  const { campaigns, loading } = useCampaigns()

  // Campaigns created by this wallet
  const created = campaigns.filter(
    (c) => c.owner?.toLowerCase() === account?.toLowerCase()
  )

  // ── ETH/UPI stats ─────────────────────────────────────────────────────────
  const ethCampaigns = created.filter(c => c.paymentType !== 'fiat')
  const fiatCampaigns = created.filter(c => c.paymentType === 'fiat')

  const totalEthRaised = ethCampaigns.reduce((s, c) => s + (parseFloat(c.amountRaised) || 0), 0)
  const totalUpiRaised = fiatCampaigns.reduce((s, c) => s + (parseFloat(c.amountRaised) || 0), 0)

  // ── Donated stats (as a donor) ────────────────────────────────────────────
  const paidDonations = myDonations.filter(d => d.status === 'paid')
  const totalDonated = paidDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)

  const fundedCount = created.filter(
    (c) => parseFloat(c.amountRaised) >= parseFloat(c.goal)
  ).length
  const successRate = created.length > 0
    ? Math.round((fundedCount / created.length) * 100)
    : 0

  // Network info
  const networkName = chainId === 11155111 ? 'Sepolia Testnet'
    : chainId === 1 ? 'Ethereum Mainnet'
      : chainId === 31337 ? 'Anvil Local'
        : chainId ? `Chain ${chainId}`
          : 'Unknown'
  const networkColor = chainId === 11155111 ? 'text-blue-600'
    : chainId === 1 ? 'text-green-600'
      : 'text-gray-500'

  // Fetch full user profile
  useEffect(() => {
    if (!token) return
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => setFullUser(data))
      .catch(() => { })
  }, [token])

  // Fetch user's donations
  useEffect(() => {
    if (!token) return
    setLoadingDonations(true)
    axios.get(`${API}/donations/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        setMyDonations(data.data || [])
      })
      .catch((err) => {
        console.error('Failed to fetch donations:', err)
      })
      .finally(() => {
        setLoadingDonations(false)
      })
  }, [token])

  const displayUser = fullUser || user

  if (!account) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <p className="text-gray-500">Connect your wallet to view your profile.</p>
      <button onClick={connectWallet}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700">
        Connect wallet
      </button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Profile header ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5 mb-6">

          {/* Avatar */}
          <div className="shrink-0">
            {displayUser?.profilePhoto ? (
              <img src={displayUser.profilePhoto} alt="profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-2xl border-2 border-purple-200">
                {displayUser?.name
                  ? displayUser.name.slice(0, 2).toUpperCase()
                  : account.slice(2, 4).toUpperCase()}
              </div>
            )}
            <div className="flex items-center justify-center mt-2">
              {displayUser?.isVerified ? (
                <VerificationBadge user={displayUser} size="sm" />
              ) : displayUser?.document?.status && displayUser.document.status !== 'verified' ? (
                <DocumentStatusBadge status={displayUser.document.status} size="xs" />
              ) : null}
            </div>
          </div>

          {/* Name & details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {displayUser?.name || <span className="font-mono">{short(account)}</span>}
                </h1>
                {displayUser?.username && (
                  <p className="text-sm text-purple-600 font-medium">@{displayUser.username}</p>
                )}
                {displayUser?.email && (
                  <p className="text-sm text-gray-500 mt-0.5">{displayUser.email}</p>
                )}
                {displayUser?.location && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {displayUser.location}
                  </p>
                )}
                {/* Verification pills */}
                {displayUser && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <VerifBadge ok={displayUser.emailVerified} label="Email" />
                    <VerifBadge ok={displayUser.phoneVerified} label="Phone" />
                    {displayUser.isAdmin && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        Admin
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => { logout(); navigate('/') }}
                className="shrink-0 text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Campaigns" value={created.length} />
          <StatCard label="Funded" value={fundedCount} color="text-green-600" />
          <StatCard
            label="ETH raised"
            value={`${totalEthRaised.toFixed(4)}`}
            sub="ETH"
            color="text-purple-600"
          />
          <StatCard
            label="UPI raised"
            value={`₹${totalUpiRaised.toLocaleString('en-IN')}`}
            color="text-blue-600"
          />
          <StatCard
            label="Total donated"
            value={`₹${totalDonated.toLocaleString('en-IN')}`}
            color="text-green-600"
          />
        </div>

        {/* Success rate bar */}
        {created.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Campaign success rate</span>
              <span className={successRate >= 50 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                {successRate}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {['details', 'wallet', 'campaigns', 'donations', 'documents'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
            {t}
            {t === 'donations' && paidDonations.length > 0 && (
              <span className="ml-1 text-xs opacity-70">({paidDonations.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ── */}
      {tab === 'details' && (
        <div className="space-y-4">

          {/* Personal info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Personal information
            </h2>
            {displayUser ? (
              <div>
                <InfoRow label="Full name" value={displayUser.name} />
                <InfoRow label="Username" value={displayUser.username ? `@${displayUser.username}` : null} />
                <InfoRow label="Email" value={displayUser.email} />
                <InfoRow label="Phone" value={displayUser.phone} />
                <InfoRow label="Date of birth" value={formatDate(displayUser.dob)} />
                <InfoRow label="Location" value={displayUser.location} />
                <InfoRow label="Wallet" value={account} mono />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p className="mb-2">No personal details found.</p>
                <button onClick={() => navigate('/login')}
                  className="text-purple-600 hover:text-purple-700 font-medium">
                  Sign in to see your details →
                </button>
              </div>
            )}
          </div>

          {/* Account info */}
          {displayUser && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Account information
              </h2>
              <InfoRow
                label="Account created"
                value={formatDateTime(displayUser.createdAt)}
              />
              <InfoRow
                label="Last updated"
                value={formatDateTime(displayUser.updatedAt)}
              />
              <InfoRow
                label="Account ID"
                value={displayUser._id || displayUser.id}
                mono
              />
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-sm text-gray-400 w-40">Verification status</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  <VerifBadge ok={displayUser.emailVerified} label="Email" />
                  <VerifBadge ok={displayUser.phoneVerified} label="Phone" />
                  <VerifBadge ok={displayUser.isVerified} label="Identity" />
                </div>
              </div>
              {displayUser.isAdmin && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-400 w-40">Role</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    Admin
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Raised breakdown */}
          {created.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Fundraising summary
              </h2>

              {/* ETH */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 320 512" fill="#7c3aed">
                        <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Crypto campaigns</p>
                      <p className="text-xs text-gray-400">{ethCampaigns.length} campaign{ethCampaigns.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {totalEthRaised.toFixed(4)} <span className="text-sm font-normal text-gray-400">ETH</span>
                  </p>
                </div>
                {ethCampaigns.length > 0 && (
                  <div className="h-1.5 bg-purple-50 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${Math.min((totalEthRaised / Math.max(...ethCampaigns.map(c => parseFloat(c.goal) || 1))) * 100, 100)}%` }} />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                        <rect x="2" y="5" width="20" height="14" rx="3" />
                        <path d="M2 10h20" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">UPI / Card campaigns</p>
                      <p className="text-xs text-gray-400">{fiatCampaigns.length} campaign{fiatCampaigns.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    ₹{totalUpiRaised.toLocaleString('en-IN')}
                  </p>
                </div>
                {fiatCampaigns.length > 0 && (
                  <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${Math.min((totalUpiRaised / Math.max(...fiatCampaigns.map(c => parseFloat(c.goal) || 1))) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Donation summary */}
          {paidDonations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Donation summary
              </h2>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Total donated to campaigns</p>
                    <p className="text-xs text-gray-400">{paidDonations.length} donation{paidDonations.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ₹{totalDonated.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WALLET TAB ── */}
      {tab === 'wallet' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
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
              Your wallet address is your identity on the blockchain. All ETH campaigns you create are linked to this address.
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS TAB ── */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          {/* ETH / UPI split summary */}
          {created.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{ethCampaigns.length}</p>
                <p className="text-xs text-gray-400 mt-1">ETH campaigns</p>
                <p className="text-xs font-medium text-purple-500 mt-0.5">{totalEthRaised.toFixed(4)} ETH raised</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{fiatCampaigns.length}</p>
                <p className="text-xs text-gray-400 mt-1">UPI campaigns</p>
                <p className="text-xs font-medium text-blue-500 mt-0.5">₹{totalUpiRaised.toLocaleString('en-IN')} raised</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading...
            </div>
          ) : created.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-2xl">
              <p className="mb-4">You haven't created any campaigns yet.</p>
              <button onClick={() => navigate('/campaign/create')}
                className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
                Create your first campaign
              </button>
            </div>
          ) : (
            created.map((c) => {
              const pct = Math.min((parseFloat(c.amountRaised) / parseFloat(c.goal)) * 100, 100)
              const status = getStatus(c)
              const isFiat = c.paymentType === 'fiat'
              return (
                <div key={c.contractAddress}
                  onClick={() => navigate(`/campaign/${c.contractAddress}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-purple-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate hover:text-purple-700">
                          {c.title}
                        </h3>
                        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${isFiat ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                          }`}>
                          {isFiat ? 'UPI' : 'ETH'}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-gray-400">{short(c.contractAddress)}</p>
                      {c.category && (
                        <span className="inline-block mt-1 text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full capitalize">
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
                        {isFiat
                          ? `₹${parseFloat(c.amountRaised).toLocaleString('en-IN')}`
                          : `${parseFloat(c.amountRaised).toFixed(4)} ETH`
                        }
                      </span>
                      <span className="text-gray-400">
                        {' / '}
                        {isFiat
                          ? `₹${parseFloat(c.goal).toLocaleString('en-IN')}`
                          : `${c.goal} ETH`
                        }
                      </span>
                    </span>
                    <CountdownTimer deadline={c.deadline} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── DONATIONS TAB (NEW) ── */}
      {tab === 'donations' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">My Donations</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {paidDonations.length} paid
              </span>
            </div>

            {loadingDonations ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading donations...</p>
              </div>
            ) : myDonations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-40">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p className="text-sm mb-1">No donations yet</p>
                <p className="text-xs">Support a campaign to make a difference!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDonations.map((d) => {
                  const statusConfig = {
                    paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
                    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
                    failed: { bg: 'bg-red-100', text: 'text-red-600', label: 'Failed' },
                    refund_requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Refund Requested' },
                    refunded: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Refunded' },
                  }
                  const status = statusConfig[d.status] || statusConfig.pending

                  return (
                    <div key={d._id} className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {d.campaign?.title || 'Campaign'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(d.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-bold text-gray-900">₹{d.amount?.toLocaleString('en-IN')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      {d.message && (
                        <p className="text-xs text-gray-500 italic mt-2 truncate">"{d.message}"</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {paidDonations.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-green-600 mb-1">
                ₹{totalDonated.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-600">Total donated to {paidDonations.length} campaign{paidDonations.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {tab === 'documents' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Document verification
          </h2>
          {displayUser?.document?.hash || displayUser?.document?.url ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {displayUser.document.type || 'Document'} submitted
                  </p>
                  {displayUser.document.hash && (
                    <p className="font-mono text-xs text-gray-400 mt-1">{displayUser.document.hash}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {displayUser.isVerified
                    ? <VerificationBadge user={displayUser} size="md" />
                    : <DocumentStatusBadge status={displayUser.document.status} size="sm" />
                  }
                </div>
              </div>

              {displayUser.isVerified && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  ✓ Your identity has been verified. You can now create campaigns.
                </div>
              )}
              {displayUser.document.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                  ✕ Your document was rejected. Please contact support or re-register with a valid document.
                </div>
              )}
              {displayUser.document.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  ⏳ Your document is under review. This usually takes 1–2 business days.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
                className="mx-auto mb-3 opacity-40">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="14 2 14 9 20 9" />
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
