import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { account, connectWallet, isConnecting, disconnect } = useWallet()
  const { user, isAdmin, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { label: 'Explore',     path: '/app' },
    { label: 'My Campaigns', path: '/my-campaigns' },
    { label: 'My Donations', path: '/my-donations' },
  ]

  const shortAddr = (a) => `${a.slice(0,6)}…${a.slice(-4)}`

  return (
    <>
      <nav style={{
        background: 'rgba(253,250,245,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--cream-200)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 1.5rem',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}>

          {/* Logo */}
          <button onClick={() => navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(13,122,106,.3)',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--ink-900)', letterSpacing: '-.01em' }}>
              FundChain
            </span>
          </button>

          {/* Desktop nav links */}
          <div style={{ display:'flex', alignItems:'center', gap:4, flex:1, justifyContent:'center' }}
            className="desktop-nav">
            {navLinks.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                style={{
                  background: isActive(link.path) ? 'var(--teal-50)' : 'none',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '.875rem',
                  fontWeight: isActive(link.path) ? 500 : 400,
                  color: isActive(link.path) ? 'var(--teal-600)' : 'var(--ink-500)',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if(!isActive(link.path)) e.target.style.color = 'var(--ink-900)' }}
                onMouseLeave={e => { if(!isActive(link.path)) e.target.style.color = 'var(--ink-500)' }}
              >
                {link.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => navigate('/admin')}
                style={{
                  background: 'var(--amber-50)',
                  border: '1px solid var(--amber-100)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '.875rem',
                  fontWeight: 500,
                  color: 'var(--amber-500)',
                  cursor: 'pointer',
                }}>
                Admin
              </button>
            )}
          </div>

          {/* Right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <button onClick={() => navigate('/campaign/create')}
              className="btn-primary"
              style={{ fontSize: '.8rem', padding: '8px 16px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Campaign
            </button>

            {account ? (
              <button onClick={() => navigate('/profile')}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  background: 'var(--cream-100)',
                  border: '1px solid var(--cream-200)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 12px 6px 6px',
                  cursor:'pointer',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-200)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--cream-100)'}>
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  overflow:'hidden',
                }}>
                  {user?.profilePhoto
                    ? <img src={user.profilePhoto} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontFamily:'var(--font-sans)',fontSize:'.7rem',color:'#fff',fontWeight:600}}>
                        {user?.name?.slice(0,1)?.toUpperCase() || account.slice(2,3).toUpperCase()}
                      </span>
                  }
                </div>
                <span style={{fontFamily:'var(--font-sans)',fontSize:'.8rem',color:'var(--ink-700)',fontWeight:500}}>
                  {user?.name?.split(' ')[0] || shortAddr(account)}
                </span>
              </button>
            ) : (
              <button onClick={connectWallet} disabled={isConnecting}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'var(--cream-100)',
                  border:'1px solid var(--cream-200)',
                  borderRadius:'var(--radius-full)',
                  padding:'8px 14px',
                  fontFamily:'var(--font-sans)',
                  fontSize:'.8rem',
                  fontWeight:500,
                  color:'var(--ink-700)',
                  cursor:'pointer',
                  transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='var(--cream-200)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--cream-100)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
                </svg>
                {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
