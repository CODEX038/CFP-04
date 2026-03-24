import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const {
    account, connectWallet, disconnectWallet,
    isConnecting, wrongNetwork, switchNetwork
  } = useWallet()
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname === '/admin') return null
  if (isAdmin) return null

  const short    = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Wrong network banner */}
      {wrongNetwork && (
        <div className="bg-red-500 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-3">
          Wrong network — switch to Sepolia Test Network
          <button
            onClick={switchNetwork}
            className="bg-white text-red-500 text-xs font-medium px-3 py-1 rounded-lg hover:bg-red-50"
          >
            Switch network
          </button>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">FundChain</span>
          </Link>

          {/* Center nav links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link to="/app"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/app') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              Home
            </Link>

            {account && (
              <>
                <Link to="/profile"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/profile') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  Profile
                </Link>

                <Link to="/my-campaigns"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/my-campaigns') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  My Campaigns
                </Link>

                {/* ── My Donations link ── */}
                <Link to="/my-donations"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/my-donations') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  My Donations
                </Link>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {account && !wrongNetwork && (
              <button
                onClick={() => navigate('/campaign/create')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                + New Campaign
              </button>
            )}

            {account ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                  <div className={`w-2 h-2 rounded-full ${wrongNetwork ? 'bg-red-500' : 'bg-green-500'}`} />
                  <span className="text-sm font-mono text-gray-700">{short(account)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-sm text-gray-500 hover:text-red-500 px-2 py-2 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin-login')}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Admin
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Login
                </button>
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
                  </svg>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>
    </>
  )
}

export default Navbar
