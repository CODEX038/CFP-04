import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../App'

/* ── Icons ── */
const IconMenu    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
const IconX       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
const IconSun     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
const IconMoon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
const IconWallet  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
const IconPlus    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconShield  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

const NAV_LINKS = [
  { label: 'Browse',       path: '/app' },
  { label: 'My Campaigns', path: '/my-campaigns' },
  { label: 'My Donations', path: '/my-donations' },
  { label: 'Profile',      path: '/profile' },
]

export default function Navbar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { account, connectWallet, disconnectWallet, isConnecting } = useWallet()
  const { user, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled,   setScrolled]   = useState(false)

  const isActive  = (path) => location.pathname === path
  const shortAddr = (a) => `${a.slice(0,6)}…${a.slice(-4)}`
  const isDark    = theme === 'dark'

  /* Close drawer on route change */
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  /* Scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* Lock body scroll when drawer open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const styles = {
    nav: {
      height: 'var(--navbar-h)',
      background: isDark
        ? `rgba(26,29,39,${scrolled ? 0.97 : 0.9})`
        : `rgba(255,255,255,${scrolled ? 0.97 : 0.92})`,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
      boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'all 0.25s ease',
    },
    inner: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 clamp(1rem, 4vw, 2rem)',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      flexShrink: 0,
    },
    logoIcon: {
      width: 34, height: 34,
      background: 'linear-gradient(135deg, var(--purple-600), var(--purple-800))',
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
    },
    logoText: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1.15rem',
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em',
    },
    desktopNav: {
      display: 'none',
      alignItems: 'center',
      gap: '2px',
      flex: 1,
      justifyContent: 'center',
    },
    navLink: (active) => ({
      background: active ? 'var(--purple-50)' : 'none',
      border: 'none', padding: '7px 14px', borderRadius: 'var(--r-full)',
      fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--purple-700)' : 'var(--text-muted)',
      cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }),
    rightSide: {
      display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
    },
    hamburger: {
      width: 40, height: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-muted)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--r-md)',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      transition: 'all 0.15s',
    },
    addrChip: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--teal-50)',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 'var(--r-full)',
      padding: '5px 12px',
    },
    drawer: {
      position: 'fixed', inset: 0, zIndex: 200,
      display: mobileOpen ? 'flex' : 'none',
    },
    drawerBackdrop: {
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    },
    drawerPanel: {
      position: 'relative',
      width: 'min(300px, 85vw)',
      height: '100%',
      background: 'var(--bg-card)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
      boxShadow: 'var(--shadow-xl)',
    },
    drawerHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.25rem 1.25rem 1rem',
      borderBottom: '1px solid var(--border)',
    },
    drawerNav: {
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '1rem 0.75rem',
      flex: 1,
    },
    drawerLink: (active) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', borderRadius: 'var(--r-md)',
      background: active ? 'var(--purple-50)' : 'transparent',
      border: 'none', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: '0.95rem',
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--purple-700)' : 'var(--text-secondary)',
      textAlign: 'left', transition: 'all 0.15s',
      width: '100%',
    }),
    drawerFooter: {
      padding: '1rem 1.25rem',
      borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    },
  }

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.inner}>

          {/* Logo */}
          <button style={styles.logo} onClick={() => navigate('/')}>
            <div style={styles.logoIcon}>
              <span style={{ fontFamily:'var(--font-serif)', color:'#fff', fontSize:'.8rem' }}>FC</span>
            </div>
            <span style={styles.logoText}>FundChain</span>
          </button>

          {/* Desktop nav links (hidden on mobile) */}
          <div style={{ ...styles.desktopNav, display: window.innerWidth >= 768 ? 'flex' : 'none' }} className="desktop-nav">
            {NAV_LINKS.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)} style={styles.navLink(isActive(link.path))}>
                {link.label}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => navigate('/admin')} style={{
                ...styles.navLink(isActive('/admin')),
                background: 'rgba(251,146,60,0.1)',
                color: '#c2410c',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <IconShield/> Admin
              </button>
            )}
          </div>

          {/* Right side */}
          <div style={styles.rightSide}>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme"
              style={{
                width: 38, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-muted)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--r-full)',
                cursor: 'pointer', color: 'var(--text-muted)',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
              {isDark ? <IconSun/> : <IconMoon/>}
            </button>

            {/* New campaign button — desktop */}
            <button
              onClick={() => navigate('/campaign/create')}
              className="btn btn-primary btn-sm"
              style={{ display: 'none', gap: 6 }}
              id="create-btn"
            >
              <IconPlus/> New Campaign
            </button>

            {/* Wallet / profile — desktop only */}
            {account ? (
              <div style={{ display: 'none', alignItems: 'center', gap: 8 }} id="wallet-section">
                <div style={styles.addrChip}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--teal-500)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }}/>
                  <span style={{ fontFamily: 'monospace', fontSize: '.73rem', color: 'var(--teal-700)', fontWeight: 600 }}>
                    {shortAddr(account)}
                  </span>
                </div>
                <button onClick={() => navigate('/profile')} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--purple-600), var(--purple-700))',
                  border: '2px solid var(--purple-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                }}>
                  {user?.profilePhoto
                    ? <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <span style={{ color: '#fff', fontSize: '.72rem', fontWeight: 700 }}>
                        {(user?.name?.[0] || account[2]).toUpperCase()}
                      </span>
                  }
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} disabled={isConnecting}
                className="btn btn-secondary btn-sm"
                style={{ display: 'none', gap: 6 }}
                id="connect-btn">
                <IconWallet/> {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            )}

            {/* Hamburger — mobile */}
            <button style={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu" className="hamburger-btn">
              <IconMenu/>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      <div style={styles.drawer} role="dialog" aria-modal="true">
        <div style={styles.drawerBackdrop} onClick={() => setMobileOpen(false)}/>
        <div style={styles.drawerPanel}>

          {/* Drawer header */}
          <div style={styles.drawerHeader}>
            <button style={{ ...styles.logo, gap: 8 }} onClick={() => navigate('/')}>
              <div style={{ ...styles.logoIcon, width: 30, height: 30 }}>
                <span style={{ fontFamily:'var(--font-serif)', color:'#fff', fontSize:'.72rem' }}>FC</span>
              </div>
              <span style={{ ...styles.logoText, fontSize: '1rem' }}>FundChain</span>
            </button>
            <button onClick={() => setMobileOpen(false)} style={{
              background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}>
              <IconX/>
            </button>
          </div>

          {/* Wallet status in drawer */}
          {account ? (
            <div style={{
              margin: '0.75rem', padding: '0.875rem',
              background: 'var(--teal-50)', borderRadius: 'var(--r-lg)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--purple-600),var(--purple-700))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '.7rem', fontWeight: 700 }}>
                    {(user?.name?.[0] || account[2]).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {user?.name || 'Connected'}
                  </p>
                  <p style={{ fontSize: '.72rem', fontFamily: 'monospace', color: 'var(--teal-700)', margin: 0 }}>
                    {shortAddr(account)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem' }}>
              <button onClick={connectWallet} disabled={isConnecting}
                className="btn btn-secondary"
                style={{ width: '100%', gap: 8 }}>
                <IconWallet/> {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </div>
          )}

          {/* Nav links */}
          <nav style={styles.drawerNav}>
            {NAV_LINKS.map(link => (
              <button key={link.path} onClick={() => navigate(link.path)} style={styles.drawerLink(isActive(link.path))}>
                <span style={{ fontSize: '0.95rem' }}>{link.label}</span>
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => navigate('/admin')} style={{
                ...styles.drawerLink(false),
                background: 'rgba(251,146,60,0.08)',
                color: '#c2410c',
              }}>
                <IconShield/> Admin Dashboard
              </button>
            )}
          </nav>

          {/* Drawer footer */}
          <div style={styles.drawerFooter}>
            <button onClick={() => navigate('/campaign/create')} className="btn btn-primary" style={{ width: '100%', gap: 6 }}>
              <IconPlus/> Create Campaign
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                {isDark ? 'Dark mode' : 'Light mode'}
              </span>
              <button onClick={toggleTheme} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
                borderRadius: 'var(--r-full)', padding: '5px 12px',
                cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)', fontWeight: 500,
              }}>
                {isDark ? <><IconSun/> Light</> : <><IconMoon/> Dark</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive CSS to show/hide elements */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .hamburger-btn { display: none !important; }
          #create-btn { display: inline-flex !important; }
          #wallet-section { display: flex !important; }
          #connect-btn { display: inline-flex !important; }
        }
        .theme-toggle:hover { background: var(--purple-50) !important; border-color: var(--purple-200) !important; color: var(--purple-600) !important; }
        button[style*="navLink"]:hover { color: var(--purple-700) !important; background: var(--purple-50) !important; }
      `}</style>
    </>
  )
}
