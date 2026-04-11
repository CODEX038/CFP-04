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

/* ── helpers ── */
const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'

const formatDate = (val) => {
  if (!val) return null
  try { return new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return String(val) }
}
const formatDateTime = (val) => {
  if (!val) return null
  try { return new Date(val).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(val) }
}

const getStatus = (c) => {
  const deadlineMs = c.deadline > 1e12 ? c.deadline : c.deadline * 1000
  const funded = parseFloat(c.amountRaised) >= parseFloat(c.goal)
  if (funded) return 'funded'
  if (Date.now() > deadlineMs) return 'expired'
  if ((deadlineMs - Date.now()) < 864e5 * 7) return 'expiring'
  return 'active'
}

/* ── sub-components ── */
const InfoRow = ({ label, value, mono }) => {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.85rem', color: '#9CA3AF', flexShrink: 0, width: 160 }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : 'var(--font-sans)', fontSize: mono ? '.75rem' : '.875rem', color: '#111827', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

const VerifBadge = ({ ok, label }) => (
  <span style={{
    fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 600,
    padding: '3px 9px', borderRadius: 'var(--radius-full)',
    background: ok ? '#ECFDF5' : '#F3F4F6',
    color: ok ? '#059669' : '#9CA3AF',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }}>
    {ok ? '✓' : '✗'} {label}
  </span>
)

const StatusPill = ({ status }) => {
  const map = {
    active:   { bg: '#F5F3FF', color: '#6D28D9' },
    funded:   { bg: '#ECFDF5', color: '#059669' },
    expiring: { bg: '#FFF7ED', color: '#C2410C' },
    expired:  { bg: '#F3F4F6', color: '#6B7280' },
  }
  const s = map[status] || map.active
  return (
    <span style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-sans)', fontSize: '.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
export default function Profile() {
  const { account, connectWallet, chainId } = useWallet()
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]                       = useState('details')
  const [fullUser, setFullUser]             = useState(null)
  const [myDonations, setMyDonations]       = useState([])
  const [loadingDonations, setLoadingDonations] = useState(false)
  const { campaigns, loading }              = useCampaigns()

  const created     = campaigns.filter(c => c.owner?.toLowerCase() === account?.toLowerCase())
  const ethCampaigns  = created.filter(c => c.paymentType !== 'fiat')
  const fiatCampaigns = created.filter(c => c.paymentType === 'fiat')
  const totalEthRaised = ethCampaigns.reduce((s, c) => s + (parseFloat(c.amountRaised) || 0), 0)
  const totalUpiRaised = fiatCampaigns.reduce((s, c) => s + (parseFloat(c.amountRaised) || 0), 0)
  const paidDonations  = myDonations.filter(d => d.status === 'paid')
  const totalDonated   = paidDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
  const fundedCount    = created.filter(c => parseFloat(c.amountRaised) >= parseFloat(c.goal)).length
  const successRate    = created.length > 0 ? Math.round((fundedCount / created.length) * 100) : 0

  const networkName  = chainId === 11155111 ? 'Sepolia Testnet' : chainId === 1 ? 'Ethereum Mainnet' : chainId ? `Chain ${chainId}` : 'Unknown'

  useEffect(() => {
    if (!token) return
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setFullUser(data)).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoadingDonations(true)
    axios.get(`${API}/donations/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setMyDonations(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingDonations(false))
  }, [token])

  const displayUser = fullUser || user

  /* Not connected */
  if (!account) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', color: '#9CA3AF' }}>Connect your wallet to view your profile.</p>
      <button onClick={connectWallet} className="btn-primary">Connect wallet</button>
    </div>
  )

  const TABS = ['details', 'wallet', 'campaigns', 'donations', 'documents']

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>

      {/* ── Purple hero header (matching landing page style) ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e1040 0%, #2d1260 50%, #1a1050 100%)',
        padding: '2.5rem 1.5rem 5rem',
      }}>
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }}/>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-30%', left: '60%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.2) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }}/>

        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,.2)',
                overflow: 'hidden', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {displayUser?.profilePhoto
                  ? <img src={displayUser.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <span style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                      {displayUser?.name ? displayUser.name.slice(0, 2).toUpperCase() : account.slice(2, 4).toUpperCase()}
                    </span>
                }
              </div>
              {displayUser?.isVerified && (
                <div style={{
                  position: 'absolute', bottom: 2, right: 2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#10B981', border: '2px solid #1e1040',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </div>

            {/* Name / info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 400, color: '#fff', margin: '0 0 4px', lineHeight: 1.2 }}>
                    {displayUser?.name || <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{short(account)}</span>}
                  </h1>
                  {displayUser?.username && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: '#A78BFA', margin: '0 0 6px', fontWeight: 500 }}>@{displayUser.username}</p>
                  )}
                  {displayUser?.email && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.8rem', color: 'rgba(255,255,255,.5)', margin: '0 0 8px' }}>{displayUser.email}</p>
                  )}
                  {displayUser?.location && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: 'rgba(255,255,255,.4)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {displayUser.location}
                    </p>
                  )}
                  {displayUser && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <VerifBadge ok={displayUser.emailVerified} label="Email"/>
                      <VerifBadge ok={displayUser.phoneVerified} label="Phone"/>
                      {displayUser.isVerified && (
                        <span style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                          Verified
                        </span>
                      )}
                      {displayUser.isAdmin && (
                        <span style={{ background: 'rgba(251,146,60,.15)', color: '#FB923C', fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)' }}>Admin</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => { logout(); navigate('/') }} style={{
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 'var(--radius-md)', padding: '7px 14px', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: '.78rem', fontWeight: 600,
                  color: 'rgba(255,255,255,.6)', flexShrink: 0, transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; e.currentTarget.style.color = '#FCA5A5' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.6)' }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: 'Campaigns',    value: created.length,                                  color: '#fff'     },
              { label: 'Funded',       value: fundedCount,                                     color: '#10B981'  },
              { label: 'ETH raised',   value: `${totalEthRaised.toFixed(4)} ETH`,              color: '#A78BFA'  },
              { label: 'UPI raised',   value: `₹${totalUpiRaised.toLocaleString('en-IN')}`,    color: '#60A5FA'  },
              { label: 'Total donated',value: `₹${totalDonated.toLocaleString('en-IN')}`,      color: '#34D399'  },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px', textAlign: 'center',
                backdropFilter: 'blur(8px)',
              }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: s.color, margin: '0 0 4px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.7rem', color: 'rgba(255,255,255,.35)', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Success rate */}
          {created.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'rgba(255,255,255,.35)' }}>Campaign success rate</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', fontWeight: 600, color: successRate >= 50 ? '#34D399' : 'rgba(255,255,255,.4)' }}>{successRate}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${successRate}%`, background: 'linear-gradient(90deg, #7C3AED, #10B981)', borderRadius: 'var(--radius-full)', transition: 'width .6s' }}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar + content (overlapping the hero) ── */}
      <div style={{ maxWidth: 800, margin: '-2.5rem auto 0', padding: '0 1.5rem 5rem', position: 'relative', zIndex: 2 }}>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, background: '#fff',
          border: '1px solid #E5E7EB', borderRadius: 'var(--radius-xl)',
          padding: 5, marginBottom: '1.25rem',
          boxShadow: '0 4px 16px rgba(0,0,0,.08)',
          overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '.82rem', fontWeight: tab === t ? 700 : 500,
              whiteSpace: 'nowrap', transition: 'all .15s',
              background: tab === t ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'transparent',
              color: tab === t ? '#fff' : '#9CA3AF',
              boxShadow: tab === t ? '0 2px 8px rgba(124,58,237,.35)' : 'none',
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'donations' && paidDonations.length > 0 && (
                <span style={{ marginLeft: 5, opacity: .75 }}>({paidDonations.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── DETAILS ── */}
        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <Section title="Personal information">
              <InfoRow label="Full name"    value={displayUser?.name}/>
              <InfoRow label="Username"     value={displayUser?.username ? `@${displayUser.username}` : null}/>
              <InfoRow label="Email"        value={displayUser?.email}/>
              <InfoRow label="Phone"        value={displayUser?.phone}/>
              <InfoRow label="Date of birth"value={formatDate(displayUser?.dob)}/>
              <InfoRow label="Location"     value={displayUser?.location}/>
              <InfoRow label="Wallet"       value={account} mono/>
            </Section>

            {displayUser && (
              <Section title="Account information">
                <InfoRow label="Account ID"      value={displayUser._id || displayUser.id} mono/>
                <InfoRow label="Member since"    value={formatDateTime(displayUser.createdAt)}/>
                <InfoRow label="Last updated"    value={formatDateTime(displayUser.updatedAt)}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.85rem', color: '#9CA3AF', width: 160 }}>Verification status</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <VerifBadge ok={displayUser.emailVerified} label="Email"/>
                    <VerifBadge ok={displayUser.phoneVerified} label="Phone"/>
                    <VerifBadge ok={displayUser.isVerified}    label="Identity"/>
                  </div>
                </div>
              </Section>
            )}

            {created.length > 0 && (
              <Section title="Fundraising summary">
                <RaiseRow icon="eth" label="Crypto campaigns" sub={`${ethCampaigns.length} campaign${ethCampaigns.length !== 1 ? 's' : ''}`} value={`${totalEthRaised.toFixed(4)} ETH`} color="#7C3AED" pct={Math.min((totalEthRaised / Math.max(...ethCampaigns.map(c => parseFloat(c.goal)||1))) * 100, 100)} barColor="#A78BFA"/>
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginTop: 4 }}>
                  <RaiseRow icon="upi" label="UPI / Card campaigns" sub={`${fiatCampaigns.length} campaign${fiatCampaigns.length !== 1 ? 's' : ''}`} value={`₹${totalUpiRaised.toLocaleString('en-IN')}`} color="#2563EB" pct={Math.min((totalUpiRaised / Math.max(...fiatCampaigns.map(c => parseFloat(c.goal)||1))) * 100, 100)} barColor="#60A5FA"/>
                </div>
              </Section>
            )}

            {paidDonations.length > 0 && (
              <Section title="Donation summary">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>Total donated to campaigns</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: '#9CA3AF', margin: 0 }}>{paidDonations.length} donation{paidDonations.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#059669' }}>₹{totalDonated.toLocaleString('en-IN')}</p>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── WALLET ── */}
        {tab === 'wallet' && (
          <Section title="Wallet details">
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '1rem', marginBottom: 12 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: '#9CA3AF', margin: '0 0 6px' }}>Connected address</p>
              <p style={{ fontFamily: 'monospace', fontSize: '.8rem', color: '#111827', margin: 0, wordBreak: 'break-all' }}>{account}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', animation: 'pulse 2s infinite' }}/>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', fontWeight: 600, color: '#1D4ED8' }}>Connected</span>
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.8rem', fontWeight: 600, color: '#2563EB' }}>{networkName}</span>
            </div>
            {chainId !== 11155111 && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: '.8rem', color: '#92400E' }}>
                ⚠ Switch to Sepolia Test Network in MetaMask to create and fund ETH campaigns.
              </div>
            )}
            <div style={{ background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: 12, padding: '12px 16px', marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: '.8rem', color: '#5B21B6' }}>
              🔗 Your wallet address is your identity on the blockchain.
            </div>
          </Section>
        )}

        {/* ── CAMPAIGNS ── */}
        {tab === 'campaigns' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {created.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'ETH campaigns', count: ethCampaigns.length, sub: `${totalEthRaised.toFixed(4)} ETH raised`, bg: '#F5F3FF', color: '#7C3AED' },
                  { label: 'UPI campaigns', count: fiatCampaigns.length, sub: `₹${totalUpiRaised.toLocaleString('en-IN')} raised`, bg: '#EFF6FF', color: '#2563EB' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center', border: '1px solid rgba(0,0,0,.05)' }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: s.color, margin: '0 0 4px' }}>{s.count}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: '#9CA3AF', margin: '0 0 4px' }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 600, color: s.color, margin: 0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                <div style={{ width: 32, height: 32, border: '2px solid #E9D5FF', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }}/>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem' }}>Loading...</p>
              </div>
            ) : created.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-sans)', color: '#9CA3AF', marginBottom: '1rem' }}>You haven't created any campaigns yet.</p>
                <button onClick={() => navigate('/campaign/create')} className="btn-primary">Create your first campaign</button>
              </div>
            ) : (
              created.map(c => {
                const pct = Math.min((parseFloat(c.amountRaised)/parseFloat(c.goal))*100, 100)
                const status = getStatus(c)
                const isFiat = c.paymentType === 'fiat'
                return (
                  <div key={c.contractAddress} onClick={() => navigate(`/campaign/${c.contractAddress}`)}
                    style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 'var(--radius-xl)', padding: '1.25rem', cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#A78BFA'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '.95rem', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</h3>
                          <span style={{ background: isFiat ? '#EFF6FF' : '#F5F3FF', color: isFiat ? '#2563EB' : '#7C3AED', fontFamily: 'var(--font-sans)', fontSize: '.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
                            {isFiat ? 'UPI' : 'ETH'}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'monospace', fontSize: '.72rem', color: '#9CA3AF', margin: 0 }}>{short(c.contractAddress)}</p>
                      </div>
                      <StatusPill status={status}/>
                    </div>
                    <ProgressBar percent={pct}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: '.82rem' }}>
                      <span>
                        <strong style={{ color: '#111827' }}>{isFiat ? `₹${parseFloat(c.amountRaised).toLocaleString('en-IN')}` : `${parseFloat(c.amountRaised).toFixed(4)} ETH`}</strong>
                        <span style={{ color: '#9CA3AF' }}> / {isFiat ? `₹${parseFloat(c.goal).toLocaleString('en-IN')}` : `${c.goal} ETH`}</span>
                      </span>
                      <CountdownTimer deadline={c.deadline}/>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── DONATIONS ── */}
        {tab === 'donations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Section title={`My Donations${paidDonations.length > 0 ? ` · ${paidDonations.length} paid` : ''}`}>
              {loadingDonations ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                  <div style={{ width: 28, height: 28, border: '2px solid #E9D5FF', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 10px' }}/>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem' }}>Loading...</p>
                </div>
              ) : myDonations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9CA3AF' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💜</div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', margin: '0 0 .5rem' }}>No donations yet</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', marginBottom: '1.25rem' }}>Support a campaign to make a difference!</p>
                  <button onClick={() => navigate('/app')} className="btn-primary" style={{ fontSize: '.82rem', padding: '8px 18px' }}>Browse campaigns</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myDonations.map(d => {
                    const sc = { paid: { bg: '#ECFDF5', color: '#059669', label: 'Paid' }, pending: { bg: '#FFFBEB', color: '#D97706', label: 'Pending' }, failed: { bg: '#FEF2F2', color: '#DC2626', label: 'Failed' }, refund_requested: { bg: '#FFFBEB', color: '#D97706', label: 'Refund Req.' }, refunded: { bg: '#EFF6FF', color: '#2563EB', label: 'Refunded' } }
                    const s = sc[d.status] || sc.pending
                    return (
                      <div key={d._id} style={{ border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px 14px', transition: 'border-color .15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#E9D5FF'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#F3F4F6'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: d.message ? 6 : 0 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '.875rem', color: '#111827', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {d.campaign?.title || 'Campaign'}
                            </p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: '#9CA3AF', margin: 0 }}>{formatDate(d.createdAt)}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '.95rem', color: '#111827', margin: '0 0 4px' }}>₹{d.amount?.toLocaleString('en-IN')}</p>
                            <span style={{ background: s.bg, color: s.color, fontFamily: 'var(--font-sans)', fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{s.label}</span>
                          </div>
                        </div>
                        {d.message && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>"{d.message}"</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {paidDonations.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #1e1040, #2d1260)',
                border: '1px solid rgba(124,58,237,.3)', borderRadius: 'var(--radius-xl)',
                padding: '1.5rem', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }}/>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#34D399', margin: '0 0 4px', position: 'relative' }}>
                  ₹{totalDonated.toLocaleString('en-IN')}
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.85rem', color: 'rgba(255,255,255,.45)', margin: 0, position: 'relative' }}>
                  donated across {paidDonations.length} campaign{paidDonations.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === 'documents' && (
          <Section title="Document verification">
            {displayUser?.document?.hash || displayUser?.document?.url ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 12, padding: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '.875rem', color: '#111827', margin: '0 0 4px', textTransform: 'capitalize' }}>
                      {displayUser.document.type || 'Document'} submitted
                    </p>
                    {displayUser.document.hash && (
                      <p style={{ fontFamily: 'monospace', fontSize: '.72rem', color: '#9CA3AF', margin: 0 }}>{displayUser.document.hash.slice(0, 40)}...</p>
                    )}
                  </div>
                  {displayUser.isVerified
                    ? <span style={{ background: '#ECFDF5', color: '#059669', fontFamily: 'var(--font-sans)', fontSize: '.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        Verified
                      </span>
                    : <span style={{ background: '#FFFBEB', color: '#D97706', fontFamily: 'var(--font-sans)', fontSize: '.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 'var(--radius-full)' }}>Pending review</span>
                  }
                </div>
                {displayUser.isVerified && <Alert type="success">✓ Your identity has been verified. You can now create campaigns.</Alert>}
                {displayUser.document.status === 'rejected' && <Alert type="error">✕ Your document was rejected. Please contact support or re-register.</Alert>}
                {displayUser.document.status === 'pending' && <Alert type="warning">⏳ Your document is under review. This usually takes 1–2 business days.</Alert>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1" style={{ margin: '0 auto 12px', display: 'block' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 2 14 9 20 9"/>
                </svg>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: '#9CA3AF', margin: '0 0 4px' }}>No document submitted</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: '#D1D5DB' }}>Submit during registration to get verified.</p>
              </div>
            )}
          </Section>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

/* ── mini helpers ── */
function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{title}</h2>
      <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 12, paddingTop: 4 }}>{children}</div>
    </div>
  )
}

function RaiseRow({ icon, label, sub, value, color, pct, barColor }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon === 'eth'
              ? <svg width="12" height="12" viewBox="0 0 320 512" fill={color}><path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg>
            }
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '.875rem', color: '#111827', margin: 0 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: '#9CA3AF', margin: 0 }}>{sub}</p>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color, margin: 0 }}>{value}</p>
      </div>
      <div style={{ height: 5, background: color + '15', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 'var(--radius-full)', transition: 'width .6s' }}/>
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const map = { success: { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46' }, error: { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B' }, warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' } }
  const s = map[type]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 16px', fontFamily: 'var(--font-sans)', fontSize: '.85rem', color: s.color }}>
      {children}
    </div>
  )
}
