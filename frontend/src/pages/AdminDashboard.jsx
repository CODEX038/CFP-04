import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import ProgressBar from '../components/ProgressBar'
import RefundManagementPanel from '../components/RefundManagementPanel'

const API      = import.meta.env.VITE_API_URL
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

/* ── helpers ── */
const resolveDocUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    /* Fix Cloudinary PDFs — force fl_attachment flag so browser downloads
       instead of failing to render, and use /raw/upload/ for non-image files */
    if (url.includes('res.cloudinary.com') && url.toLowerCase().endsWith('.pdf')) {
      return url.replace('/image/upload/', '/raw/upload/')
    }
    return url
  }
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

const short = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '—'

/* ── Sub-components ── */
const DocumentViewer = ({ url }) => {
  const resolved = resolveDocUrl(url)
  if (!resolved) return <p style={{ fontSize:'0.75rem', color:'#9ca3af', fontStyle:'italic', marginTop:8 }}>No file uploaded</p>
  const lower   = resolved.toLowerCase()
  const isPDF   = lower.endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/.test(lower)
  return (
    <div style={{ marginTop:10 }}>
      {isImage && (
        <img src={resolved} alt="Document"
          style={{ width:'100%', maxHeight:160, objectFit:'contain', borderRadius:10, border:'1px solid #e5e7eb', background:'#f9fafb', marginBottom:8 }}
          onError={e => e.target.style.display='none'}/>
      )}
      {isPDF && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style={{ fontSize:'0.75rem', color:'#b91c1b', fontWeight:600, margin:0 }}>PDF — {resolved.split('/').pop()}</p>
        </div>
      )}
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={() => window.open(resolved, '_blank', 'noopener,noreferrer')}
          style={{
            flex:1, padding:'8px', borderRadius:10,
            background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer',
            fontSize:'0.75rem', fontWeight:600, fontFamily:"'Poppins',sans-serif",
          }}>
          {isPDF ? '📄 Open PDF' : '🖼 View document'}
        </button>
        {isPDF && (
          <button
            onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(resolved)}&embedded=false`, '_blank', 'noopener,noreferrer')}
            style={{
              flex:1, padding:'8px', borderRadius:10,
              background:'#1a73e8', color:'#fff', border:'none', cursor:'pointer',
              fontSize:'0.75rem', fontWeight:600, fontFamily:"'Poppins',sans-serif",
            }}>
            📋 Google Viewer
          </button>
        )}
      </div>
    </div>
  )
}

const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:'1.125rem',
    display:'flex', flexDirection:'column', gap:10,
  }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <p style={{ fontSize:'0.72rem', color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:0 }}>{label}</p>
      <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:color, fontSize:'1rem' }}>{icon}</div>
    </div>
    <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.75rem', color:'#111827', margin:0, lineHeight:1 }}>{value}</p>
  </div>
)

const DocStatusBadge = ({ status }) => {
  const styles = {
    verified: { bg:'#ecfdf5', color:'#065f46', border:'#bbf7d0' },
    rejected: { bg:'#fef2f2', color:'#991b1b', border:'#fecaca' },
    pending:  { bg:'#fffbeb', color:'#92400e', border:'#fde68a' },
  }
  const s = styles[status] || styles.pending
  return (
    <span style={{
      fontSize:'0.7rem', fontWeight:700, padding:'2px 9px', borderRadius:999,
      background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:'capitalize',
    }}>{status || 'pending'}</span>
  )
}

const VerifStatusBadge = ({ status }) => {
  const styles = {
    verified:   { bg:'#ecfdf5', color:'#065f46' },
    rejected:   { bg:'#fef2f2', color:'#991b1b' },
    pending:    { bg:'#fffbeb', color:'#92400e' },
    unverified: { bg:'#f3f4f6', color:'#6b7280' },
  }
  const s = styles[status] || styles.unverified
  return (
    <span style={{
      fontSize:'0.7rem', fontWeight:700, padding:'2px 9px', borderRadius:999,
      background:s.bg, color:s.color, textTransform:'capitalize',
    }}>{status || 'unverified'}</span>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]             = useState('campaigns')
  const [campaigns, setCampaigns] = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [campFilter, setCampFilter]       = useState('all')
  const [userFilter, setUserFilter]       = useState('all')
  const [userDocFilter, setUserDocFilter] = useState('pending')
  const [campDocFilter, setCampDocFilter] = useState('pending')
  const [confirm, setConfirm]             = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [rejectNote, setRejectNote]       = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg]         = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const headers = { Authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [campRes, userRes] = await Promise.all([
        axios.get(`${API}/campaigns`),
        axios.get(`${API}/auth/users`, { headers }),
      ])
      setCampaigns(Array.isArray(campRes.data) ? campRes.data : campRes.data.data || [])
      setUsers(Array.isArray(userRes.data) ? userRes.data : userRes.data.data || [])
    } catch(err) { console.error(err) }
    finally { setLoading(false) }
  }

  const syncEthRaised = async () => {
    setSyncing(true)
    try {
      /* Fire sync requests — don't await sync-funders (it takes time with chunked queries) */
      await axios.post(`${API}/campaigns/sync-raised`, {}, { headers })
      /* sync-funders runs in background — don't block UI on it */
      axios.post(`${API}/campaigns/sync-funders`, {}, { headers }).catch(() => {})
      /* Wait 3 seconds for sync-raised to propagate then refetch */
      await new Promise(r => setTimeout(r, 3000))
      await fetchAll()
      setLastSynced(new Date())
    } catch (err) {
      try { await fetchAll() } catch {}
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { syncEthRaised() }, [])

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

  const togglePause = async (campaign) => {
    setActionLoading(true)
    try {
      const { data } = await axios.patch(
        `${API}/campaigns/${campaign.contractAddress}`,
        { paused: !campaign.paused }, { headers }
      )
      setCampaigns(prev => prev.map(c => c.contractAddress === campaign.contractAddress ? data : c))
      setConfirm(null)
      showMsg(`Campaign ${data.paused ? 'paused' : 'resumed'}.`)
    } catch(err) { console.error(err) }
    finally { setActionLoading(false) }
  }

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
      setSelectedCampaign(null); setRejectNote('')
      showMsg(`Campaign ${action}.`)
    } catch(err) { console.error(err) }
    finally { setActionLoading(false) }
  }

  const verifyUserDocument = async (userId, status) => {
    setActionLoading(true)
    try {
      const { data } = await axios.patch(
        `${API}/auth/users/${userId}/verify-document`, { status }, { headers }
      )
      setUsers(prev => prev.map(u =>
        u._id === userId ? { ...u, isVerified: data.isVerified, document: data.document } : u
      ))
      showMsg(`Document ${status} successfully.`)
    } catch(err) { console.error(err); showMsg('Failed to update.') }
    finally { setActionLoading(false) }
  }

  /* Derived stats — deadline may be stored as unix seconds OR ms */
  const toMs = (d) => d > 1e10 ? d : d * 1000
  const ethCampaigns    = campaigns.filter(c => c.paymentType !== 'fiat')
  const fiatCampaigns   = campaigns.filter(c => c.paymentType === 'fiat')
  const totalEthRaised  = ethCampaigns.reduce((s, c) => s + parseFloat(c.amountRaised || 0), 0)
  const totalInrRaised  = fiatCampaigns.reduce((s, c) => s + parseFloat(c.amountRaised || c.raised || 0), 0)
  const activeCamps     = campaigns.filter(c => !c.paused && Date.now() < toMs(c.deadline)).length
  const pendingCampDocs = campaigns.filter(c => c.verificationStatus === 'pending' && c.documents?.length > 0).length
  const pendingUserDocs = users.filter(u => u.document?.url && (!u.document?.status || u.document?.status === 'pending')).length

  const q = search.toLowerCase()

  const filteredCampaigns = campaigns.filter(c => {
    const match = c.title?.toLowerCase().includes(q) || c.owner?.toLowerCase().includes(q) || c.ownerName?.toLowerCase().includes(q)
    if (!match) return false
    if (campFilter === 'active')   return !c.paused && Date.now() < c.deadline * 1000
    if (campFilter === 'paused')   return c.paused
    if (campFilter === 'funded')   return parseFloat(c.amountRaised || c.raised || 0) >= parseFloat(c.goal || 1)
    if (campFilter === 'expired')  return Date.now() > c.deadline * 1000
    if (campFilter === 'pending')  return c.verificationStatus === 'pending'
    if (campFilter === 'verified') return c.verificationStatus === 'verified'
    return true
  })

  const filteredUsers = users.filter(u => {
    const match = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    if (!match) return false
    if (userFilter === 'verified')   return u.isVerified
    if (userFilter === 'unverified') return !u.isVerified
    return true
  })

  const filteredUserDocs = users.filter(u => {
    if (!u.document?.url) return false
    const match = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    if (!match) return false
    const s = u.document?.status || 'pending'
    if (userDocFilter === 'pending')  return !u.document?.status || s === 'pending'
    if (userDocFilter === 'verified') return s === 'verified'
    if (userDocFilter === 'rejected') return s === 'rejected'
    return true
  })

  const filteredCampDocs = campaigns.filter(c => {
    if (!c.documents?.length) return false
    const match = !q || c.title?.toLowerCase().includes(q) || c.ownerName?.toLowerCase().includes(q)
    if (!match) return false
    if (campDocFilter === 'pending')  return c.verificationStatus === 'pending'
    if (campDocFilter === 'verified') return c.verificationStatus === 'verified'
    if (campDocFilter === 'rejected') return c.verificationStatus === 'rejected'
    return true
  })

  const TABS = [
    { key:'campaigns',     label:'Campaigns',    count:campaigns.length,  badge:false },
    { key:'users',         label:'Users',         count:users.length,      badge:false },
    { key:'user-docs',     label:'User Docs',     count:pendingUserDocs,   badge:pendingUserDocs>0 },
    { key:'campaign-docs', label:'Campaign Docs', count:pendingCampDocs,   badge:pendingCampDocs>0 },
    { key:'refunds',       label:'Refunds',       count:0,                 badge:false },
  ]

  return (
    <>
      <style>{`
        .adm { font-family: 'Poppins', system-ui, sans-serif; min-height: 100dvh; background: #f8f9fc; }

        /* Navbar */
        .adm-nav {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky; top:0; z-index:100;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .adm-nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2rem);
          height: 60px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .adm-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Serif Display', serif; font-size: 1.1rem; color: #111827;
          flex-shrink: 0;
        }
        .adm-logo-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(249,115,22,0.3);
        }
        .adm-badge {
          font-size: 0.68rem; font-weight: 700; padding: 3px 10px;
          background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;
          border-radius: 999px; white-space: nowrap; font-family: 'Poppins',sans-serif;
        }
        .adm-signout {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 10px;
          border: 1px solid #fecaca; background: none;
          font-family: 'Poppins',sans-serif; font-size: 0.8rem; font-weight: 600;
          color: #dc2626; cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .adm-signout:hover { background: #fef2f2; }

        /* Content */
        .adm-body {
          max-width: 1280px; margin: 0 auto;
          padding: clamp(1.25rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) 4rem;
        }

        /* Stats grid */
        .adm-stats {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        /* Tabs */
        .adm-tabs {
          display: flex; gap: 3px;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 4px;
          margin-bottom: 1.25rem;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .adm-tabs::-webkit-scrollbar { display: none; }
        .adm-tab {
          flex-shrink: 0; padding: 8px 16px; border-radius: 10px; border: none;
          font-family: 'Poppins',sans-serif; font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
        }
        .adm-tab-active { background: #7c3aed; color: #fff; box-shadow: 0 2px 8px rgba(124,58,237,.3); }
        .adm-tab-inactive { background: transparent; color: #6b7280; }
        .adm-tab-inactive:hover { color: #374151; background: #f9fafb; }

        /* Search + filters row */
        .adm-controls {
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.25rem;
        }
        .adm-controls-row {
          display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
        }
        .adm-search {
          flex: 1; min-width: 180px;
          padding: 9px 14px;
          background: #fff; border: 1.5px solid #e5e7eb; border-radius: 999px;
          font-family: 'Poppins',sans-serif; font-size: 0.85rem; color: #111827;
          outline: none; transition: all 0.18s; min-height: 40px;
        }
        .adm-search:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
        .adm-filter-btn {
          padding: 7px 14px; border-radius: 999px; border: 1.5px solid #e5e7eb;
          background: #fff; font-family: 'Poppins',sans-serif; font-size: 0.75rem;
          font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap;
          color: #6b7280; min-height: 36px;
        }
        .adm-filter-btn:hover { border-color: #7c3aed; color: #7c3aed; }
        .adm-filter-btn-active { background: #7c3aed !important; border-color: #7c3aed !important; color: #fff !important; }

        /* Table — scrollable on mobile */
        .adm-table-wrap {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;
          overflow-x: auto; -webkit-overflow-scrolling: touch;
        }
        .adm-table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 0.85rem; }
        .adm-table th {
          text-align: left; padding: 11px 14px;
          font-size: 0.72rem; font-weight: 600; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.04em;
          background: #f9fafb; border-bottom: 1px solid #f3f4f6;
        }
        .adm-table td {
          padding: 12px 14px; border-bottom: 1px solid #f9fafb;
          vertical-align: middle; color: #374151;
        }
        .adm-table tr:last-child td { border-bottom: none; }
        .adm-table tr:hover td { background: #fafafa; }

        /* Cards */
        .adm-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
          padding: clamp(1rem, 3vw, 1.375rem);
          transition: border-color 0.15s;
        }
        .adm-card:hover { border-color: #ddd6fe; }

        /* Toast */
        .adm-toast {
          background: #f0fdf4; border: 1px solid #bbf7d0; color: #065f46;
          font-size: 0.875rem; padding: 10px 14px; border-radius: 12px;
          margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;
          animation: adm-fade 0.3s ease;
        }
        @keyframes adm-fade { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        /* Modal */
        .adm-modal-backdrop {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .adm-modal {
          background: #fff; border-radius: 20px; padding: clamp(1.25rem, 4vw, 1.75rem);
          width: 100%; max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: adm-rise 0.25s ease;
        }
        @keyframes adm-rise { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }

        .adm-empty {
          text-align: center; padding: clamp(2.5rem, 6vw, 4rem) 1.5rem;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
        }

        /* Loading */
        .adm-loading {
          text-align: center; padding: 4rem;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .adm-spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid #ede9fe; border-top-color: #7c3aed;
          animation: adm-spin 0.7s linear infinite;
        }
        @keyframes adm-spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .adm-nav-text { display: none; }
          .adm-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="adm">

        {/* ── Navbar ── */}
        <nav className="adm-nav">
          <div className="adm-nav-inner">
            <div className="adm-logo">
              <div className="adm-logo-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <span className="adm-nav-text">FundChain Admin</span>
              <span className="adm-badge">Admin mode</span>
            </div>
            <button onClick={() => { logout(); navigate('/') }} className="adm-signout">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </nav>

        <div className="adm-body">

          {/* ── Stat cards ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.75rem', flexWrap:'wrap', gap:8 }}>
            <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:'.75rem', color:'#9ca3af', margin:0 }}>
              {lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : 'Syncing chain data…'}
            </p>
            <button onClick={syncEthRaised} disabled={syncing} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
              borderRadius:999, border:'1.5px solid #e5e7eb', background:'#fff',
              fontFamily:"'Poppins',sans-serif", fontSize:'.75rem', fontWeight:600,
              color:'#374151', cursor:'pointer', transition:'all .15s',
              opacity:syncing?.6:1,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: syncing ? 'adm-spin .7s linear infinite' : 'none' }}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              {syncing ? 'Syncing…' : 'Sync Chain Data'}
            </button>
          </div>
          <div className="adm-stats">
            <StatCard label="Total Campaigns" value={campaigns.length}              icon="📋" color="#ede9fe"/>
            <StatCard label="Active"           value={activeCamps}                  icon="📈" color="#dcfce7"/>
            <StatCard label="ETH Raised"       value={`${totalEthRaised.toFixed(4)} ETH`} icon="⟠" color="#dbeafe"/>
            <StatCard label="UPI / Card Raised" value={`₹${totalInrRaised.toLocaleString('en-IN')}`} icon="💳" color="#fef9c3"/>
            <StatCard label="Total Users"      value={users.length}                 icon="👥" color="#fef3c7"/>
            <StatCard label="Pending Docs"     value={pendingCampDocs + pendingUserDocs} icon="📄" color="#fee2e2"/>
          </div>

          {/* ── Toast ── */}
          {actionMsg && (
            <div className="adm-toast">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              {actionMsg}
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="adm-tabs">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch('') }}
                className={`adm-tab ${tab===t.key?'adm-tab-active':'adm-tab-inactive'}`}>
                {t.label}
                {t.badge
                  ? <span style={{ background:'#ef4444', color:'#fff', fontSize:'0.65rem', padding:'1px 6px', borderRadius:999 }}>{t.count}</span>
                  : <span style={{ fontSize:'0.72rem', opacity:0.65 }}>({t.count})</span>
                }
              </button>
            ))}
          </div>

          {/* ── Controls ── */}
          {tab !== 'refunds' && (
            <div className="adm-controls">
              <div className="adm-controls-row">
                <input
                  type="text"
                  placeholder={`Search ${tab}...`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="adm-search"
                />
              </div>
              <div className="adm-controls-row">
                {tab === 'campaigns' && (
                  ['all','active','paused','pending','verified','funded','expired'].map(f => (
                    <button key={f} onClick={() => setCampFilter(f)}
                      className={`adm-filter-btn ${campFilter===f?'adm-filter-btn-active':''}`}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))
                )}
                {tab === 'users' && (
                  ['all','verified','unverified'].map(f => (
                    <button key={f} onClick={() => setUserFilter(f)}
                      className={`adm-filter-btn ${userFilter===f?'adm-filter-btn-active':''}`}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))
                )}
                {tab === 'user-docs' && (
                  ['all','pending','verified','rejected'].map(f => (
                    <button key={f} onClick={() => setUserDocFilter(f)}
                      className={`adm-filter-btn ${userDocFilter===f?'adm-filter-btn-active':''}`}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))
                )}
                {tab === 'campaign-docs' && (
                  ['all','pending','verified','rejected'].map(f => (
                    <button key={f} onClick={() => setCampDocFilter(f)}
                      className={`adm-filter-btn ${campDocFilter===f?'adm-filter-btn-active':''}`}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Content ── */}
          {loading ? (
            <div className="adm-loading">
              <div className="adm-spinner"/>
              <p style={{ fontSize:'0.875rem', color:'#9ca3af' }}>Loading...</p>
            </div>
          ) : (
            <>

              {/* CAMPAIGNS */}
              {tab === 'campaigns' && (
                filteredCampaigns.length === 0
                  ? <div className="adm-empty"><p style={{ color:'#9ca3af' }}>No campaigns found.</p></div>
                  : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Campaign</th>
                            <th>Owner</th>
                            <th>Progress</th>
                            <th>Category</th>
                            <th>Verification</th>
                            <th style={{ textAlign:'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCampaigns.map(c => {
                            const pct = Math.min((parseFloat(c.amountRaised||c.raised||0)/parseFloat(c.goal||1))*100, 100)
                            return (
                              <tr key={c._id}>
                                <td style={{ minWidth:180 }}>
                                  <span onClick={() => navigate(`/campaign/${c.contractAddress}`)}
                                    style={{ fontWeight:600, color:'#111827', cursor:'pointer', display:'block', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'0.875rem' }}
                                    onMouseEnter={e => e.target.style.color='#7c3aed'}
                                    onMouseLeave={e => e.target.style.color='#111827'}>
                                    {c.title}
                                  </span>
                                  <span style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'#9ca3af' }}>{short(c.contractAddress)}</span>
                                </td>
                                <td style={{ minWidth:130 }}>
                                  <p style={{ fontWeight:500, color:'#374151', margin:'0 0 2px', fontSize:'0.82rem' }}>{c.ownerName||'—'}</p>
                                  {c.ownerUsername && <p style={{ fontSize:'0.72rem', color:'#7c3aed', margin:0 }}>@{c.ownerUsername}</p>}
                                </td>
                                <td style={{ minWidth:160 }}>
                                  <ProgressBar percent={pct}/>
                                  {c.paymentType === 'fiat'
                                    ? <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'4px 0 0' }}>₹{Number(c.amountRaised||c.raised||0).toLocaleString('en-IN')} / ₹{Number(c.goal).toLocaleString('en-IN')}</p>
                                    : <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'4px 0 0' }}>{c.amountRaised||0} / {c.goal} ETH</p>
                                  }
                                </td>
                                <td>
                                  <span style={{ fontSize:'0.72rem', background:'#f5f3ff', color:'#7c3aed', padding:'2px 9px', borderRadius:999, textTransform:'capitalize' }}>
                                    {c.category||'—'}
                                  </span>
                                </td>
                                <td><VerifStatusBadge status={c.verificationStatus}/></td>
                                <td style={{ textAlign:'right', minWidth:120 }}>
                                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                                    <button onClick={() => setConfirm(c)} style={{
                                      fontSize:'0.72rem', padding:'5px 10px', borderRadius:8, cursor:'pointer',
                                      border: c.paused?'1px solid #bbf7d0':'1px solid #fecaca',
                                      color: c.paused?'#065f46':'#dc2626',
                                      background: c.paused?'#ecfdf5':'#fef2f2', fontFamily:"'Poppins',sans-serif", fontWeight:600,
                                    }}>
                                      {c.paused?'Resume':'Pause'}
                                    </button>
                                    {c.documents?.length > 0 && (
                                      <button onClick={() => setSelectedCampaign(c)} style={{
                                        fontSize:'0.72rem', padding:'5px 10px', borderRadius:8, cursor:'pointer',
                                        border:'1px solid #ddd6fe', color:'#7c3aed', background:'#f5f3ff',
                                        fontFamily:"'Poppins',sans-serif", fontWeight:600,
                                      }}>Docs</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
              )}

              {/* USERS */}
              {tab === 'users' && (
                filteredUsers.length === 0
                  ? <div className="adm-empty"><p style={{ color:'#9ca3af' }}>No users found.</p></div>
                  : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
                      {filteredUsers.map(u => (
                        <div key={u._id} className="adm-card">
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                              <div style={{
                                width:44, height:44, borderRadius:'50%', flexShrink:0, overflow:'hidden',
                                background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center',
                                fontWeight:700, fontSize:'1rem', color:'#7c3aed',
                              }}>
                                {u.profilePhoto
                                  ? <img src={u.profilePhoto} alt={u.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                  : (u.name||u.email).slice(0,2).toUpperCase()
                                }
                              </div>
                              <div>
                                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
                                  <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.9rem' }}>{u.name||'—'}</p>
                                  {u.isVerified
                                    ? <span style={{ fontSize:'0.68rem', background:'#ecfdf5', color:'#065f46', padding:'1px 7px', borderRadius:999 }}>Verified</span>
                                    : <span style={{ fontSize:'0.68rem', background:'#f3f4f6', color:'#6b7280', padding:'1px 7px', borderRadius:999 }}>Unverified</span>
                                  }
                                  {u.document?.url && <DocStatusBadge status={u.document?.status||'pending'}/>}
                                </div>
                                {u.username && <p style={{ fontSize:'0.75rem', color:'#7c3aed', margin:'0 0 2px' }}>@{u.username}</p>}
                                <p style={{ fontSize:'0.8rem', color:'#6b7280', margin:0 }}>{u.email}</p>
                              </div>
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <p style={{ fontSize:'0.72rem', color:'#9ca3af', margin:'0 0 4px' }}>
                                Joined {new Date(u.createdAt).toLocaleDateString()}
                              </p>
                              <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'flex-end' }}>
                                {u.emailVerified && <span style={{ fontSize:'0.65rem', background:'#eff6ff', color:'#1d4ed8', padding:'1px 6px', borderRadius:6 }}>Email ✓</span>}
                                {u.phoneVerified && <span style={{ fontSize:'0.65rem', background:'#eff6ff', color:'#1d4ed8', padding:'1px 6px', borderRadius:6 }}>Phone ✓</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              )}

              {/* USER DOCS */}
              {tab === 'user-docs' && (
                filteredUserDocs.length === 0
                  ? <div className="adm-empty"><p style={{ color:'#9ca3af' }}>No user documents found.</p></div>
                  : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                      {filteredUserDocs.map(u => (
                        <div key={u._id} className="adm-card">
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:38, height:38, borderRadius:'50%', background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#7c3aed', overflow:'hidden', flexShrink:0 }}>
                                {u.profilePhoto
                                  ? <img src={u.profilePhoto} alt={u.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                  : (u.name||u.email).slice(0,2).toUpperCase()
                                }
                              </div>
                              <div>
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <p style={{ fontWeight:600, fontSize:'0.875rem', color:'#111827', margin:0 }}>{u.name||'—'}</p>
                                  {u.isVerified
                                    ? <span style={{ fontSize:'0.65rem', background:'#ecfdf5', color:'#065f46', padding:'1px 7px', borderRadius:999 }}>Verified</span>
                                    : <span style={{ fontSize:'0.65rem', background:'#f3f4f6', color:'#6b7280', padding:'1px 7px', borderRadius:999 }}>Unverified</span>
                                  }
                                </div>
                                <p style={{ fontSize:'0.75rem', color:'#9ca3af', margin:0 }}>{u.email}</p>
                              </div>
                            </div>
                            <DocStatusBadge status={u.document?.status||'pending'}/>
                          </div>

                          <div style={{ background:'#f9fafb', borderRadius:12, padding:'1rem', marginBottom:12 }}>
                            <p style={{ fontSize:'0.75rem', fontWeight:700, color:'#374151', textTransform:'capitalize', margin:'0 0 8px' }}>
                              {u.document?.type||'Identity'} document
                            </p>
                            <DocumentViewer url={u.document?.url}/>
                          </div>

                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            {u.document?.status !== 'verified' && (
                              <button onClick={() => verifyUserDocument(u._id,'verified')} disabled={actionLoading}
                                style={{
                                  flex:1, minWidth:100, padding:'9px', borderRadius:10,
                                  background:'#059669', color:'#fff', border:'none', cursor:'pointer',
                                  fontFamily:"'Poppins',sans-serif", fontSize:'0.82rem', fontWeight:600,
                                  opacity:actionLoading?.5:1,
                                }}>
                                ✓ Verify
                              </button>
                            )}
                            {u.document?.status !== 'rejected' && (
                              <button onClick={() => verifyUserDocument(u._id,'rejected')} disabled={actionLoading}
                                style={{
                                  flex:1, minWidth:100, padding:'9px', borderRadius:10,
                                  border:'1px solid #fecaca', color:'#dc2626', background:'#fef2f2', cursor:'pointer',
                                  fontFamily:"'Poppins',sans-serif", fontSize:'0.82rem', fontWeight:600,
                                  opacity:actionLoading?.5:1,
                                }}>
                                ✕ Reject
                              </button>
                            )}
                            {u.document?.status === 'verified' && (
                              <button onClick={() => verifyUserDocument(u._id,'pending')} disabled={actionLoading}
                                style={{
                                  flex:1, padding:'9px', borderRadius:10,
                                  border:'1px solid #e5e7eb', color:'#6b7280', background:'#fff', cursor:'pointer',
                                  fontFamily:"'Poppins',sans-serif", fontSize:'0.82rem', fontWeight:600,
                                  opacity:actionLoading?.5:1,
                                }}>
                                ↩ Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              )}

              {/* CAMPAIGN DOCS */}
              {tab === 'campaign-docs' && (
                filteredCampDocs.length === 0
                  ? <div className="adm-empty"><p style={{ color:'#9ca3af' }}>No campaign documents found.</p></div>
                  : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                      {filteredCampDocs.map(c => (
                        <div key={c._id} className="adm-card">
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12, flexWrap:'wrap' }}>
                            <div>
                              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                                <p style={{ fontWeight:600, color:'#111827', margin:0, fontSize:'0.9rem' }}>{c.title}</p>
                                <VerifStatusBadge status={c.verificationStatus}/>
                              </div>
                              <p style={{ fontSize:'0.75rem', color:'#9ca3af', margin:0 }}>
                                by {c.ownerName||c.owner} · {c.category} · {c.documents?.length||0} document(s)
                              </p>
                            </div>
                            <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                              {c.verificationStatus !== 'verified' && (
                                <button onClick={() => verifyCampaign(c._id,'verified')} disabled={actionLoading}
                                  style={{ fontSize:'0.75rem', padding:'6px 12px', borderRadius:8, background:'#059669', color:'#fff', border:'none', cursor:'pointer', fontFamily:"'Poppins',sans-serif", fontWeight:600 }}>
                                  ✓ Approve
                                </button>
                              )}
                              {c.verificationStatus !== 'rejected' && (
                                <button onClick={() => setSelectedCampaign(c)} disabled={actionLoading}
                                  style={{ fontSize:'0.75rem', padding:'6px 12px', borderRadius:8, border:'1px solid #fecaca', color:'#dc2626', background:'#fef2f2', cursor:'pointer', fontFamily:"'Poppins',sans-serif", fontWeight:600 }}>
                                  ✕ Reject
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'0.75rem' }}>
                            {c.documents?.map(doc => (
                              <div key={doc.docId||doc._id} style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:'0.875rem' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                                  <p style={{ fontSize:'0.8rem', fontWeight:600, color:'#374151', margin:0 }}>{doc.name}</p>
                                  <DocStatusBadge status={doc.status}/>
                                </div>
                                <DocumentViewer url={doc.url}/>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              )}

              {/* REFUNDS */}
              {tab === 'refunds' && (
                <div style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 20,
                  padding: 'clamp(1.25rem, 4vw, 2rem)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <RefundManagementPanel/>
                </div>
              )}

            </>
          )}
        </div>

        {/* ── Pause/Resume Modal ── */}
        {confirm && (
          <div className="adm-modal-backdrop" onClick={e => { if(e.target===e.currentTarget) setConfirm(null) }}>
            <div className="adm-modal">
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem', color:'#111827', textAlign:'center', marginBottom:6 }}>
                {confirm.paused ? 'Resume campaign?' : 'Pause campaign?'}
              </h2>
              <p style={{ fontSize:'0.875rem', color:'#6b7280', textAlign:'center', marginBottom:'1.5rem' }}>
                "{confirm.title}"
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button onClick={() => setConfirm(null)} style={{
                  padding:'11px', borderRadius:12, border:'1px solid #e5e7eb', background:'#fff',
                  fontFamily:"'Poppins',sans-serif", fontSize:'0.875rem', fontWeight:600, color:'#6b7280', cursor:'pointer',
                }}>Cancel</button>
                <button onClick={() => togglePause(confirm)} disabled={actionLoading} style={{
                  padding:'11px', borderRadius:12, border:'none', cursor:'pointer',
                  fontFamily:"'Poppins',sans-serif", fontSize:'0.875rem', fontWeight:700, color:'#fff',
                  background: confirm.paused ? '#059669' : '#ef4444',
                  opacity: actionLoading?.5:1,
                }}>
                  {actionLoading ? 'Processing…' : confirm.paused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reject Campaign Modal ── */}
        {selectedCampaign && selectedCampaign.verificationStatus !== 'verified' && (
          <div className="adm-modal-backdrop" onClick={e => { if(e.target===e.currentTarget){ setSelectedCampaign(null); setRejectNote('') } }}>
            <div className="adm-modal" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem', color:'#111827', margin:0 }}>
                Reject campaign
              </h2>
              <p style={{ fontSize:'0.875rem', color:'#6b7280', margin:0 }}>"{selectedCampaign.title}"</p>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Reason for rejection (required)"
                rows={3}
                style={{
                  width:'100%', padding:'10px 14px', resize:'none', outline:'none',
                  border:'1.5px solid #e5e7eb', borderRadius:12, fontFamily:"'Poppins',sans-serif",
                  fontSize:'0.875rem', color:'#111827', boxSizing:'border-box', transition:'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor='#ef4444'}
                onBlur={e  => e.target.style.borderColor='#e5e7eb'}
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button onClick={() => { setSelectedCampaign(null); setRejectNote('') }} style={{
                  padding:'11px', borderRadius:12, border:'1px solid #e5e7eb', background:'#fff',
                  fontFamily:"'Poppins',sans-serif", fontSize:'0.875rem', fontWeight:600, color:'#6b7280', cursor:'pointer',
                }}>Cancel</button>
                <button
                  onClick={() => verifyCampaign(selectedCampaign._id,'rejected',rejectNote)}
                  disabled={actionLoading || !rejectNote.trim()}
                  style={{
                    padding:'11px', borderRadius:12, border:'none', cursor:'pointer',
                    background:'#ef4444', color:'#fff',
                    fontFamily:"'Poppins',sans-serif", fontSize:'0.875rem', fontWeight:700,
                    opacity: (actionLoading||!rejectNote.trim())?.5:1,
                  }}>
                  {actionLoading ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

export default AdminDashboard
