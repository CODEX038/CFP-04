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
import EmailVerification from './pages/verify/EmailVerification'
import PhoneVerification from './pages/verify/PhoneVerification'

function App() {
  const { user, adminUser } = useAuth()

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            {/* Public routes */}
            <Route path="/"             element={<Home />} />
            <Route path="/login"        element={<UserLogin />} />
            <Route path="/admin-login"  element={<AdminLogin />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />

            {/* Verification routes */}
            <Route path="/verify/email" element={<EmailVerification />} />
            <Route path="/verify/phone" element={<PhoneVerification />} />

            {/* Protected user routes */}
            <Route path="/app"
              element={user ? <Home /> : <Navigate to="/login" />}
            />
            <Route path="/campaign/create"
              element={user ? <CreateCampaign /> : <Navigate to="/login" />}
            />
            <Route path="/my-campaigns"
              element={user ? <MyCampaigns /> : <Navigate to="/login" />}
            />
            <Route path="/my-donations"
              element={user ? <MyDonations /> : <Navigate to="/login" />}
            />
            <Route path="/profile"
              element={user ? <Profile /> : <Navigate to="/login" />}
            />

            {/* Protected admin routes */}
            <Route path="/admin"
              element={adminUser ? <AdminDashboard /> : <Navigate to="/admin-login" />}
            />

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
