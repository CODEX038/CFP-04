import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import Home from './pages/Home'
import CreateCampaign from './pages/CreateCampaign'
import CampaignDetail from './pages/CampaignDetail'
import Profile from './pages/Profile'
import MyCampaigns from './pages/MyCampaigns'
import MyDonations from './pages/MyDonations'   // ✅ NEW
import AdminDashboard from './pages/AdminDashboard'
import UserLogin from './pages/UserLogin'
import AdminLogin from './pages/AdminLogin'
import EmailVerification from './pages/verify/EmailVerification'
import PhoneVerification from './pages/verify/PhoneVerification'

const ProtectedRoute = ({ children }) => {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/admin-login" replace />
}

const AppLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <main className="max-w-7xl mx-auto px-4 py-8">
      {children}
    </main>
  </div>
)

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<UserLogin />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route path="/app" element={<AppLayout><Home /></AppLayout>} />
      <Route path="/campaign/create" element={<AppLayout><CreateCampaign /></AppLayout>} />
      <Route path="/campaign/:id" element={<AppLayout><CampaignDetail /></AppLayout>} />
      <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
      <Route path="/my-campaigns" element={<AppLayout><MyCampaigns /></AppLayout>} />

      {/* ✅ NEW ROUTE */}
      <Route path="/my-donations" element={<AppLayout><MyDonations /></AppLayout>} />

      <Route path="/admin" element={
        <ProtectedRoute><AdminDashboard /></ProtectedRoute>
      } />

      {/* Verification Pages */}
      <Route path="/verify/email" element={<EmailVerification />} />
      <Route path="/verify/phone" element={<PhoneVerification />} />
    </Routes>
  )
}

export default App