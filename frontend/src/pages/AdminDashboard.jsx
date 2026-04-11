import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import ProgressBar from '../components/ProgressBar'
import RefundManagementPanel from '../components/RefundManagementPanel'

const API      = import.meta.env.VITE_API_URL
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

const resolveDocUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

const DocumentViewer = ({ url }) => {
  const resolved = resolveDocUrl(url)
  if (!resolved) return <p className="text-xs text-gray-400 italic mt-2">No file uploaded</p>

  const lower   = resolved.toLowerCase()
  const isPDF   = lower.endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/.test(lower)

  return (
    <div className="mt-3">
      {isImage && (
        <img src={resolved} alt="Document"
          className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50 mb-2"
          onError={(e) => { e.target.style.display = 'none' }} />
      )}
      {isPDF && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p className="text-xs text-red-700 font-medium">PDF — {resolved.split('/').pop()}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => window.open(resolved, '_blank', 'noopener,noreferrer')}
          className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-700">
          {isPDF ? 'Open PDF' : 'View document'}
        </button>
      </div>
    </div>
  )
}

const AdminNavbar = ({ onSignOut }) => (
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-lg">FundChain Admin</span>
        <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-medium ml-2">
          Admin mode
        </span>
      </div>
      <button onClick={onSignOut}
        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 border border-red-200 px-4 py-2 rounded-xl transition-colors hover:bg-red-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign out
      </button>
    </div>
  </nav>
)

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
)

const DocStatusBadge = ({ status }) => {
  const styles = {
    verified: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-600 border-red-200',
    pending:  'bg-amber-100 text-amber-700 border-amber-200',
  }
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border capitalize ${styles[status] || styles.pending}`}>
      {status || 'pending'}
    </span>
  )
}

const VerifStatusBadge = ({ status }) => {
  const styles = {
    verified:   'bg-green-100 text-green-700',
    rejected:   'bg-red-100 text-red-600',
    pending:    'bg-amber-100 text-amber-700',
    unverified: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${styles[status] || styles.unverified}`}>
      {status || 'unverified'}
    </span>
  )
}

const AdminDashboard = () => {
  const { token, logout } = useAuth()
  const navigate          = useNavigate()

  const [tab, setTab]               = useState('campaigns')
  const [campaigns, setCampaigns]   = useState([])
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [campFilter, setCampFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [docFilter, setDocFilter]   = useState('pending')
  const [confirm, setConfirm]       = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [campRes, userRes] = await Promise.all([
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/auth/users`, { headers }),
      ])
      setCampaigns(campRes.data)
      setUsers(userRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Campaign pause/resume ─────────────────────────────────────────────────
  const togglePause = async (campaign) => {
    setActionLoading(true)
    try {
      const { data } = await axios.patch(
        `${API}/campaigns/${campaign.contractAddress}`,
        { paused: !campaign.paused },
        { headers }
      )
      setCampaigns(prev => prev.map(c => c.contractAddress === campaign.contractAddress ? data : c))
      setConfirm(null)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Campaign verification ─────────────────────────────────────────────────
  const verifyCampaign = async (campaignId, action, note = '') => {
    setActionLoading(true)
    try {
      const endpoint = action === 'verified'
        ? `${API}/campaign-verification/${campaignId}/verify`
        : `${API}/campaign-verification/${campaignId}/reject`

      const body = action === 'verified'
        ? { note: note || 'Verified by admin.' }
        : { reason: note || 'Rejected by admin.' }

      const { data } = await axios.patch(endpoint, body, { headers })
      setCampaigns(prev => prev.map(c => c._id === campaignId ? { ...c, ...data.data } : c))
      setSelectedCampaign(null)
      setRejectNote('')
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── User document verification ────────────────────────────────────────────
  const verifyUserDocument = async (userId, newStatus) => {
    setActionLoading(true)
    try {
      const { data } = await axios.patch(
        `${API}/auth/users/${userId}/verify-document`,
        { status: newStatus },
        { headers }
      )
      
      // Update user in local state
      setUsers(prev => prev.map(u => u._id === userId ? data : u))
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRaised         = campaigns.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const activeCamps         = campaigns.filter(c => !c.paused && Date.now() < c.deadline * 1000).length
  const pendingCampaignDocs = campaigns.filter(c => c.verificationStatus === 'pending' && c.documents?.length > 0).length
  const pendingUserDocs     = users.filter(u => u.document?.url && (!u.document?.status || u.document?.status === 'pending')).length

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredCampaigns = campaigns.filter(c => {
    const q     = search.toLowerCase()
    const match = c.title?.toLowerCase().includes(q) || c.owner?.toLowerCase().includes(q) || c.ownerName?.toLowerCase().includes(q)
    if (!match) return false
    if (campFilter === 'active')   return !c.paused && Date.now() < c.deadline * 1000
    if (campFilter === 'paused')   return c.paused
    if (campFilter === 'funded')   return parseFloat(c.amountRaised) >= parseFloat(c.goal)
    if (campFilter === 'expired')  return Date.now() > c.deadline * 1000
    if (campFilter === 'pending')  return c.verificationStatus === 'pending'
    if (campFilter === 'verified') return c.verificationStatus === 'verified'
    return true
  })

  const campaignsWithDocs = campaigns.filter(c => {
    if (!c.documents?.length) return false
    const q     = search.toLowerCase()
    const match = !q || c.title?.toLowerCase().includes(q) || c.ownerName?.toLowerCase().includes(q)
    if (!match) return false
    if (docFilter === 'pending')  return c.verificationStatus === 'pending'
    if (docFilter === 'verified') return c.verificationStatus === 'verified'
    if (docFilter === 'rejected') return c.verificationStatus === 'rejected'
    return true
  })

  const filteredUsers = users.filter(u => {
    const q     = search.toLowerCase()
    const match = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    if (!match) return false
    if (userFilter === 'verified')   return u.isVerified
    if (userFilter === 'unverified') return !u.isVerified
    if (userFilter === 'doc-pending') return u.document?.url && (!u.document?.status || u.document?.status === 'pending')
    return true
  })

  const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onSignOut={() => { logout(); navigate('/') }} />

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          <StatCard label="Total campaigns" value={campaigns.length} color="bg-purple-100"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>} />
          <StatCard label="Active" value={activeCamps} color="bg-green-100"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>} />
          <StatCard label="ETH raised" value={totalRaised.toFixed(2)} color="bg-blue-100"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
          <StatCard label="Total users" value={users.length} color="bg-amber-100"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
          <StatCard label="Pending docs" value={pendingCampaignDocs + pendingUserDocs} color="bg-red-100"
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
          {[
            { key: 'campaigns', label: 'Campaigns', count: campaigns.length,                      badge: false },
            { key: 'users',     label: 'Users',     count: users.length,                          badge: false },
            { key: 'documents', label: 'Documents', count: pendingCampaignDocs,                   badge: true  },
            { key: 'refunds',   label: 'Refunds',   count: 0,                                     badge: false },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch('') }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === t.key ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.badge && t.count > 0
                ? <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
                : <span className={`text-xs ${tab === t.key ? 'opacity-70' : 'text-gray-400'}`}>({t.count})</span>
              }
            </button>
          ))}
        </div>

        {/* Search + filters */}
        {tab !== 'refunds' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input type="text" placeholder={`Search ${tab}...`} value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 bg-white" />

            {tab === 'campaigns' && (
              <div className="flex gap-2 flex-wrap">
                {['all', 'active', 'paused', 'pending', 'verified', 'funded', 'expired'].map(f => (
                  <button key={f} onClick={() => setCampFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                      campFilter === f ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>{f}</button>
                ))}
              </div>
            )}
            {tab === 'users' && (
              <div className="flex gap-2 flex-wrap">
                {['all', 'verified', 'unverified', 'doc-pending'].map(f => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                      userFilter === f ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>{f === 'doc-pending' ? 'Pending docs' : f}</button>
                ))}
              </div>
            )}
            {tab === 'documents' && (
              <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'verified', 'rejected'].map(f => (
                  <button key={f} onClick={() => setDocFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                      docFilter === f ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>{f}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading...
          </div>
        ) : (
          <div>

            {/* ── CAMPAIGNS TAB ── */}
            {tab === 'campaigns' && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">No campaigns found.</div>
                ) : (
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-[25%]">Campaign</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-[16%]">Owner</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-[20%]">Progress</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-[10%]">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-[14%]">Verification</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 w-[15%]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map(c => {
                        const pct = Math.min((parseFloat(c.amountRaised || 0) / parseFloat(c.goal || 1)) * 100, 100)
                        return (
                          <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span onClick={() => navigate(`/campaign/${c.contractAddress}`)}
                                className="font-medium text-gray-900 truncate block cursor-pointer hover:text-purple-600 text-sm">
                                {c.title}
                              </span>
                              <p className="font-mono text-xs text-gray-400 truncate">{short(c.contractAddress)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-gray-700 truncate">{c.ownerName || '—'}</p>
                              {c.ownerUsername && <p className="text-xs text-purple-500">@{c.ownerUsername}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <ProgressBar percent={pct} />
                              <p className="text-xs text-gray-400 mt-1">{c.amountRaised || 0} / {c.goal} ETH</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full capitalize">
                                {c.category || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <VerifStatusBadge status={c.verificationStatus} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => setConfirm(c)}
                                  className={`text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors ${
                                    c.paused ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-500 hover:bg-red-50'
                                  }`}>
                                  {c.paused ? 'Resume' : 'Pause'}
                                </button>
                                {c.documents?.length > 0 && (
                                  <button onClick={() => setSelectedCampaign(c)}
                                    className="text-xs px-2 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 font-medium">
                                    Docs
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── DOCUMENTS TAB ── */}
            {tab === 'documents' && (
              <div className="space-y-4">
                {campaignsWithDocs.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl">
                    No campaign documents found.
                  </div>
                ) : (
                  campaignsWithDocs.map(c => (
                    <div key={c._id} className="bg-white border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{c.title}</p>
                            <VerifStatusBadge status={c.verificationStatus} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            by {c.ownerName || c.owner} · {c.category} · {c.documents?.length || 0} document(s)
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {c.verificationStatus !== 'verified' && (
                            <button onClick={() => verifyCampaign(c._id, 'verified')} disabled={actionLoading}
                              className="text-xs px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium">
                              ✓ Approve
                            </button>
                          )}
                          {c.verificationStatus !== 'rejected' && (
                            <button onClick={() => setSelectedCampaign(c)} disabled={actionLoading}
                              className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 font-medium">
                              ✕ Reject
                            </button>
                          )}
                          {c.verificationStatus === 'verified' && (
                            <button onClick={() => verifyCampaign(c._id, 'rejected', 'Verification revoked by admin.')} disabled={actionLoading}
                              className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium">
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {c.documents.map(doc => (
                          <div key={doc.docId} className="border border-gray-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-gray-800">{doc.name}</p>
                              <DocStatusBadge status={doc.status} />
                            </div>
                            <DocumentViewer url={doc.url} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm bg-white border border-gray-200 rounded-2xl">
                    No users found.
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const docStatus = u.document?.status || 'pending'
                    
                    return (
                      <div key={u._id} className="bg-white border border-gray-200 rounded-2xl p-5">
                        {/* User info row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0 overflow-hidden">
                              {u.profilePhoto
                                ? <img src={u.profilePhoto} alt={u.name} className="w-full h-full object-cover" />
                                : (u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase())
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900">{u.name || '—'}</p>
                                {u.isVerified && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                    Verified
                                  </span>
                                )}
                                {!u.isVerified && u.document?.url && (
                                  <DocStatusBadge status={docStatus} />
                                )}
                              </div>
                              {u.username && <p className="text-xs text-purple-500">@{u.username}</p>}
                              <p className="text-sm text-gray-500">{u.email}</p>
                              {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 shrink-0">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Identity document section */}
                        {u.document?.url ? (
                          <div className="mt-4 border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-700 capitalize">
                                  {u.document.type || 'Identity'} document
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Submitted for identity verification
                                </p>
                              </div>
                              
                              {/* FIXED: Proper button logic based on current status */}
                              <div className="flex gap-2">
                                {docStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => verifyUserDocument(u._id, 'verified')}
                                      disabled={actionLoading}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                                    >
                                      ✓ Verify user
                                    </button>
                                    <button
                                      onClick={() => verifyUserDocument(u._id, 'rejected')}
                                      disabled={actionLoading}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 font-medium transition-colors"
                                    >
                                      ✕ Reject
                                    </button>
                                  </>
                                )}
                                
                                {docStatus === 'verified' && (
                                  <button
                                    onClick={() => verifyUserDocument(u._id, 'pending')}
                                    disabled={actionLoading}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 font-medium transition-colors"
                                  >
                                    ↻ Revoke verification
                                  </button>
                                )}
                                
                                {docStatus === 'rejected' && (
                                  <>
                                    <button
                                      onClick={() => verifyUserDocument(u._id, 'verified')}
                                      disabled={actionLoading}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                                    >
                                      ✓ Approve now
                                    </button>
                                    <button
                                      onClick={() => verifyUserDocument(u._id, 'pending')}
                                      disabled={actionLoading}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium transition-colors"
                                    >
                                      ↻ Reset to pending
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <DocumentViewer url={u.document.url} />
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 italic">No identity document submitted</p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── REFUNDS TAB ── */}
            {tab === 'refunds' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <RefundManagementPanel />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pause/Resume confirm modal ── */}
      {confirm && (
        <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.5)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">
              {confirm.paused ? 'Resume campaign?' : 'Pause campaign?'}
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">"{confirm.title}"</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => togglePause(confirm)} disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${
                  confirm.paused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {actionLoading ? 'Processing...' : confirm.paused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign reject modal ── */}
      {selectedCampaign && selectedCampaign.verificationStatus !== 'verified' && (
        <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.5)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setSelectedCampaign(null); setRejectNote('') } }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Reject campaign</h2>
            <p className="text-sm text-gray-500">"{selectedCampaign.title}"</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (required)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-300 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setSelectedCampaign(null); setRejectNote('') }}
                className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => verifyCampaign(selectedCampaign._id, 'rejected', rejectNote)}
                disabled={actionLoading || !rejectNote.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
