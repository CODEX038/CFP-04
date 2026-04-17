import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminLogin = () => {
  const { login, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (isAdmin) navigate('/admin')
  }, [isAdmin, navigate])

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .al-page {
          min-height: 100dvh;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #faf5ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(1rem, 4vw, 2rem);
          font-family: 'Poppins', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        /* Decorative blobs */
        .al-blob-1 {
          position: absolute;
          top: -10%;
          right: -5%;
          width: clamp(200px, 40vw, 400px);
          height: clamp(200px, 40vw, 400px);
          background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .al-blob-2 {
          position: absolute;
          bottom: -10%;
          left: -5%;
          width: clamp(150px, 30vw, 300px);
          height: clamp(150px, 30vw, 300px);
          background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .al-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(124,58,237,0.12), 0 4px 16px rgba(0,0,0,0.06);
          padding: clamp(2rem, 6vw, 3rem) clamp(1.5rem, 5vw, 2.5rem);
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(124,58,237,0.08);
          animation: al-rise 0.4s ease both;
        }
        @keyframes al-rise {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .al-icon-wrap {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 8px 24px rgba(249,115,22,0.35);
        }

        .al-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(1.5rem, 4vw, 1.9rem);
          font-weight: 400;
          color: #111827;
          text-align: center;
          margin: 0 0 0.375rem;
          letter-spacing: -0.01em;
        }
        .al-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
          margin: 0 0 2rem;
        }

        /* Admin badge */
        .al-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249,115,22,0.08);
          border: 1px solid rgba(249,115,22,0.2);
          color: #c2410c;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin: 0 auto 1.75rem;
          width: fit-content;
          display: flex;
        }

        /* Form */
        .al-form { display: flex; flex-direction: column; gap: 1.1rem; }

        .al-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.375rem;
        }

        .al-input-wrap { position: relative; }

        .al-input {
          width: 100%;
          padding: 0.8125rem 1rem;
          padding-right: 2.75rem;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 0.9rem;
          color: #111827;
          outline: none;
          transition: all 0.18s;
          box-sizing: border-box;
          min-height: 48px;
        }
        .al-input::placeholder { color: #9ca3af; }
        .al-input:focus {
          border-color: #f97316;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }

        .al-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .al-eye-btn:hover { color: #6b7280; }

        .al-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 0.82rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .al-btn-primary {
          width: 100%;
          padding: 0.875rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
          box-shadow: 0 4px 14px rgba(249,115,22,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          margin-top: 0.25rem;
        }
        .al-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(249,115,22,0.45);
        }
        .al-btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .al-spin {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: al-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes al-spin { to { transform: rotate(360deg); } }

        .al-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.5rem 0 1.25rem;
        }
        .al-divider-line {
          flex: 1;
          height: 1px;
          background: #f3f4f6;
        }
        .al-divider-text {
          font-size: 0.75rem;
          color: #d1d5db;
          white-space: nowrap;
        }

        .al-footer {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .al-link {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: #7c3aed;
          transition: color 0.15s;
          padding: 4px;
        }
        .al-link:hover { color: #6d28d9; text-decoration: underline; }

        .al-back-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Poppins', system-ui, sans-serif;
          font-size: 0.82rem;
          color: #9ca3af;
          transition: color 0.15s;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .al-back-btn:hover { color: #6b7280; }

        /* Security note */
        .al-security {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 10px 14px;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #92400e;
        }
      `}</style>

      <div className="al-page">
        <div className="al-blob-1"/>
        <div className="al-blob-2"/>

        <div className="al-card">

          {/* Icon */}
          <div className="al-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          {/* Header */}
          <h1 className="al-title">Admin login</h1>
          <p className="al-subtitle">Sign in with your admin credentials</p>

          <div className="al-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Restricted access
          </div>

          {/* Error */}
          {error && (
            <div className="al-error" style={{ marginBottom:'1.25rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <div className="al-form">
            <div>
              <label className="al-label">Email address</label>
              <div className="al-input-wrap">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@fundchain.com"
                  className="al-input"
                  autoComplete="email"
                  style={{ paddingRight:'1rem' }}
                />
              </div>
            </div>

            <div>
              <label className="al-label">Password</label>
              <div className="al-input-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="al-input"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="al-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="al-btn-primary"
            >
              {loading ? (
                <><span className="al-spin"/> Signing in…</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Sign in as admin
                </>
              )}
            </button>
          </div>

          {/* Security note */}
          <div className="al-security">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            All admin actions are logged and auditable.
          </div>

          {/* Divider + links */}
          <div className="al-divider">
            <div className="al-divider-line"/>
            <span className="al-divider-text">not an admin?</span>
            <div className="al-divider-line"/>
          </div>

          <div className="al-footer">
            <button className="al-link" onClick={() => navigate('/login')}>
              User login →
            </button>
            <button className="al-back-btn" onClick={() => navigate('/')}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminLogin
