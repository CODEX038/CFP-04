import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

// ── Pages that manage their own full-screen layout (no navbar/padding) ────────
const STANDALONE_PATHS = ['/', '/login', '/admin-login', '/verify/email', '/verify/phone']

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}

function App() {
  const { user, isAdmin } = useAuth()

  return (
    <Router>
      <Routes>
        {/* ── Standalone pages (manage their own layout) ── */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"       element={<UserLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/verify/email" element={<EmailVerification />} />
        <Route path="/verify/phone" element={<PhoneVerification />} />

        {/* ── App pages (use shared navbar + layout) ── */}
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

        {/* ── 404 fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
