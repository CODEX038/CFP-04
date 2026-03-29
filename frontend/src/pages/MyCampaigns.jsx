import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaigns } from '../hooks/useCampaigns'
import { ethers } from 'ethers'
import { CAMPAIGN_ABI } from '../utils/constants'
import ProgressBar from '../components/ProgressBar'
import CountdownTimer from '../components/CountdownTimer'

const StatusBadge = ({ status }) => {
  const styles = {
    active:   'bg-purple-100 text-purple-700',
    funded:   'bg-green-100 text-green-700',
    expiring: 'bg-orange-100 text-orange-700',
    expired:  'bg-gray-100 text-gray-600',
    paused:   'bg-red-100 text-red-600',
  }

  const labels = {
    active:   'Active',
    funded:   'Funded',
    expiring: 'Expiring',
    expired:  'Expired',
    paused:   'Paused',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

const MyCampaigns = () => {
  const navigate = useNavigate()
  const { account, signer } = useWallet()
  const { campaigns: allCampaigns, loading } = useCampaigns()

  const [activeTab, setActiveTab] = useState('all')
  const [actionLoading, setActionLoading] = useState({})

  // Filter campaigns owned by current user
  const myCampaigns = allCampaigns.filter(
    c => c.owner.toLowerCase() === account?.toLowerCase()
  )

  // Calculate stats with multi-currency support
  const calculateStats = () => {
    const ethCampaigns = myCampaigns.filter(c => c.paymentType !== 'fiat')
    const fiatCampaigns = myCampaigns.filter(c => c.paymentType === 'fiat')

    const totalRaisedETH = ethCampaigns.reduce(
      (sum, c) => sum + parseFloat(c.amountRaised || 0),
      0
    )

    const totalRaisedINR = fiatCampaigns.reduce(
      (sum, c) => sum + parseFloat(c.amountRaised || 0),
      0
    )

    const activeCampaigns = myCampaigns.filter(
      c => !c.paused && Date.now() < c.deadline
    ).length

    const fundedCampaigns = myCampaigns.filter(
      c => parseFloat(c.amountRaised || 0) >= parseFloat(c.goal)
    ).length

    return { totalRaisedETH, totalRaisedINR, activeCampaigns, fundedCampaigns }
  }

  const stats = calculateStats()

  // Categorize campaigns
  const categorizedCampaigns = {
    all: myCampaigns,
    active: myCampaigns.filter(c => !c.paused && Date.now() < c.deadline && parseFloat(c.amountRaised) < parseFloat(c.goal)),
    funded: myCampaigns.filter(c => parseFloat(c.amountRaised) >= parseFloat(c.goal)),
    expiring: myCampaigns.filter(c => {
      const timeLeft = c.deadline - Date.now()
      const hoursLeft = timeLeft / (1000 * 60 * 60)
      return hoursLeft > 0 && hoursLeft <= 24 && parseFloat(c.amountRaised) < parseFloat(c.goal)
    }),
    expired: myCampaigns.filter(c => Date.now() >= c.deadline && parseFloat(c.amountRaised) < parseFloat(c.goal)),
  }

  // Get campaign status
  const getCampaignStatus = (campaign) => {
    if (campaign.paused) return 'paused'
    if (parseFloat(campaign.amountRaised) >= parseFloat(campaign.goal)) return 'funded'
    if (Date.now() >= campaign.deadline) return 'expired'
    
    const timeLeft = campaign.deadline - Date.now()
    const hoursLeft = timeLeft / (1000 * 60 * 60)
    if (hoursLeft <= 24) return 'expiring'
    
    return 'active'
  }

  // Handle pause/resume
  const handlePause = async (campaign) => {
    if (campaign.paymentType === 'fiat') {
      alert('Fiat campaigns cannot be paused from the frontend yet.')
      return
    }

    if (!signer) {
      alert('Please connect your wallet')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, [campaign.contractAddress]: 'pausing' }))
      
      // Create contract instance directly
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      
      // Call pause or resume based on current state
      const tx = campaign.paused ? await contract.resume() : await contract.pause()
      await tx.wait()
      
      alert(`Campaign ${campaign.paused ? 'resumed' : 'paused'} successfully!`)
      window.location.reload()
    } catch (error) {
      console.error('Error pausing/resuming campaign:', error)
      alert(`Failed to ${campaign.paused ? 'resume' : 'pause'} campaign: ${error.message}`)
    } finally {
      setActionLoading(prev => ({ ...prev, [campaign.contractAddress]: null }))
    }
  }

  // Handle claim funds
  const handleClaim = async (campaign) => {
    if (campaign.paymentType === 'fiat') {
      alert('Fiat campaign funds are processed separately. Contact support.')
      return
    }

    if (parseFloat(campaign.amountRaised) < parseFloat(campaign.goal)) {
      alert('Goal not reached yet!')
      return
    }

    if (campaign.claimed) {
      alert('Funds already claimed!')
      return
    }

    if (!signer) {
      alert('Please connect your wallet')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, [campaign.contractAddress]: 'claiming' }))
      
      // Create contract instance directly
      const contract = new ethers.Contract(campaign.contractAddress, CAMPAIGN_ABI, signer)
      
      const tx = await contract.claim()
      await tx.wait()
      
      alert('Funds claimed successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Error claiming funds:', error)
      alert(`Failed to claim funds: ${error.message}`)
    } finally {
      setActionLoading(prev => ({ ...prev, [campaign.contractAddress]: null }))
    }
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500">Please connect your wallet to view your campaigns</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Campaigns</h1>
          <p className="text-gray-500">Manage and track your fundraising campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Active Campaigns</span>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 text-xl">📊</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeCampaigns}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Funded</span>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.fundedCampaigns}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Raised</span>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xl">💰</span>
              </div>
            </div>
            <div className="space-y-1">
              {stats.totalRaisedETH > 0 && (
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalRaisedETH.toFixed(3)} ETH
                </p>
              )}
              {stats.totalRaisedINR > 0 && (
                <p className="text-2xl font-bold text-gray-900">
                  ₹{stats.totalRaisedINR.toLocaleString('en-IN')}
                </p>
              )}
              {stats.totalRaisedETH === 0 && stats.totalRaisedINR === 0 && (
                <p className="text-2xl font-bold text-gray-900">0.00</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-6">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {[
              { key: 'all', label: 'All', count: categorizedCampaigns.all.length },
              { key: 'active', label: 'Active', count: categorizedCampaigns.active.length },
              { key: 'funded', label: 'Funded', count: categorizedCampaigns.funded.length },
              { key: 'expiring', label: 'Expiring', count: categorizedCampaigns.expiring.length },
              { key: 'expired', label: 'Expired', count: categorizedCampaigns.expired.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading campaigns...</p>
          </div>
        ) : categorizedCampaigns[activeTab].length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'all'
                ? "You haven't created any campaigns yet"
                : `You don't have any ${activeTab} campaigns`}
            </p>
            <button
              onClick={() => navigate('/campaign/create')}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              + Create Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {categorizedCampaigns[activeTab].map(campaign => {
              const status = getCampaignStatus(campaign)
              const pct = Math.min(
                (parseFloat(campaign.amountRaised) / parseFloat(campaign.goal)) * 100,
                100
              )
              const isFiat = campaign.paymentType === 'fiat'
              const currency = isFiat ? 'INR' : 'ETH'
              const currencySymbol = isFiat ? '₹' : ''

              const formatAmount = (amount) => {
                const num = parseFloat(amount)
                return isFiat
                  ? num.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                  : num.toFixed(4)
              }

              return (
                <div
                  key={campaign.contractAddress}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image */}
                    <div
                      className="w-full lg:w-48 h-32 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
                      onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                    >
                      {campaign.imageHash ? (
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
                          alt={campaign.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="3"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-700 transition-colors">
                              {campaign.title}
                            </h3>
                            <StatusBadge status={status} />
                            {campaign.verificationStatus === 'verified' && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-1">
                            {campaign.contractAddress.slice(0, 10)}...{campaign.contractAddress.slice(-8)}
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      <ProgressBar percent={pct} />

                      <div className="flex items-center justify-between mt-2 mb-4">
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">
                            {currencySymbol}{formatAmount(campaign.amountRaised)} {currency}
                          </span>
                          <span className="text-gray-400">
                            {' '}/ {currencySymbol}{formatAmount(campaign.goal)} {currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{campaign.funders || 0} funders</span>
                          <span className={`font-medium ${pct >= 100 ? 'text-green-600' : 'text-purple-600'}`}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <CountdownTimer deadline={campaign.deadline} />

                        {status === 'expiring' && (
                          <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">
                            Expiring soon — share your campaign to reach the goal!
                          </div>
                        )}

                        <div className="flex gap-2">
                          {campaign.paymentType === 'eth' && (
                            <>
                              <button
                                onClick={() => handlePause(campaign)}
                                disabled={actionLoading[campaign.contractAddress] === 'pausing'}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                {actionLoading[campaign.contractAddress] === 'pausing'
                                  ? 'Pausing...'
                                  : campaign.paused
                                  ? 'Resume'
                                  : 'Pause'}
                              </button>

                              {pct >= 100 && !campaign.claimed && (
                                <button
                                  onClick={() => handleClaim(campaign)}
                                  disabled={actionLoading[campaign.contractAddress] === 'claiming'}
                                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading[campaign.contractAddress] === 'claiming'
                                    ? 'Claiming...'
                                    : 'Claim Funds'}
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => navigate(`/campaign/${campaign.contractAddress}`)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyCampaigns