import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import CampaignDetail from './pages/CampaignDetail'
import CreateCampaign from './pages/CreateCampaign'
import MyCampaigns from './pages/MyCampaigns'
import MyDonations from './pages/MyDonations'
import Profile from './pages/Profile'
import UserLogin from './pages/UserLogin'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import LandingPage from './pages/LandingPage'
import EmailVerification from './pages/verify/EmailVerification'
import PhoneVerification from './pages/verify/PhoneVerification'

/* ── Theme Context ── */
export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('fc-theme') || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fc-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/* ── App Layout (with Navbar) ── */
function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: 'clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
      }}>
        {children}
      </main>
    </div>
  )
}

function App() {
  const { user, isAdmin } = useAuth()

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* ── Standalone (self-contained layout) ── */}
          <Route path="/"             element={<LandingPage />} />
          <Route path="/login"        element={<UserLogin />} />
          <Route path="/admin-login"  element={<AdminLogin />} />
          <Route path="/verify/email" element={<EmailVerification />} />
          <Route path="/verify/phone" element={<PhoneVerification />} />

          {/* ── App pages ── */}
          <Route path="/app" element={
            <AppLayout><Home /></AppLayout>
          } />

          <Route path="/campaign/:id" element={
            <AppLayout><CampaignDetail /></AppLayout>
          } />

          <Route path="/campaign/create" element={
            user
              ? <AppLayout><CreateCampaign /></AppLayout>
              : <Navigate to="/login" replace />
          } />

          <Route path="/my-campaigns" element={
            user
              ? <AppLayout><MyCampaigns /></AppLayout>
              : <Navigate to="/login" replace />
          } />

          <Route path="/my-donations" element={
            user
              ? <AppLayout><MyDonations /></AppLayout>
              : <Navigate to="/login" replace />
          } />

          <Route path="/profile" element={
            user
              ? <AppLayout><Profile /></AppLayout>
              : <Navigate to="/login" replace />
          } />

          {/* ── Admin ── */}
          <Route path="/admin" element={
            isAdmin
              ? <AdminDashboard />
              : <Navigate to="/admin-login" replace />
          } />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
