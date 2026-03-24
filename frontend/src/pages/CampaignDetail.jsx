import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaign } from '../hooks/useCampaigns'
import { useCampaignContract } from '../hooks/useContract'
import DonationPanel from '../components/DonationPanel'

// ── Verification status banner ────────────────────────────────────────────────
const VerificationBanner = ({ status }) => {
  if (status === 'verified') return null

  const config = {
    pending: {
      bg:   'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: '⏳',
      msg:  'This campaign is pending admin verification. Donations will be enabled once approved.',
    },
    rejected: {
      bg:   'bg-red-50 border-red-200',
      text: 'text-red-600',
      icon: '✕',
      msg:  'This campaign has been rejected by admin and is not accepting donations.',
    },
    unverified: {
      bg:   'bg-gray-50 border-gray-200',
      text: 'text-gray-500',
      icon: 'ℹ',
      msg:  'This campaign has not been submitted for verification yet.',
    },
  }

  const c = config[status] || config.unverified

  return (
    <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${c.bg} ${c.text} flex items-start gap-2`}>
      <span className="shrink-0">{c.icon}</span>
      <span>{c.msg}</span>
    </div>
  )
}

const CampaignDetail = () => {
  const { id: contractAddress } = useParams()
  const navigate                = useNavigate()
  const { account }             = useWallet()

  const { campaign, loading, error, refetch } = useCampaign(contractAddress)
  const contract = useCampaignContract(contractAddress, true)

  const [txStatus, setTxStatus] = useState(null)

  const handleRefund = async () => {
    setTxStatus('pending')
    try {
      const tx = await contract.refund()
      await tx.wait()
      setTxStatus('refunded')
      await refetch()
      setTimeout(() => setTxStatus(null), 4000)
    } catch (err) {
      console.error(err)
      setTxStatus('error')
      setTimeout(() => setTxStatus(null), 4000)
    }
  }

  const handleWithdraw = async () => {
    setTxStatus('pending')
    try {
      const tx = await contract.withdraw()
      await tx.wait()
      setTxStatus('withdrawn')
      await refetch()
      setTimeout(() => setTxStatus(null), 4000)
    } catch (err) {
      console.error(err)
      setTxStatus('error')
      setTimeout(() => setTxStatus(null), 4000)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !campaign) return (
    <div className="text-center py-32 text-gray-400">
      {error || 'Campaign not found.'}
    </div>
  )

  const isExpired   = Date.now() > campaign.deadline
  const isGoalMet   = parseFloat(campaign.amountRaised) >= parseFloat(campaign.goal)
  const isVerified  = campaign.verificationStatus === 'verified'
  const isOwner     = account?.toLowerCase() === campaign.owner?.toLowerCase()

  return (
    <div className="max-w-4xl mx-auto">

      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to campaigns
      </button>

      {/* Tx status banner */}
      {txStatus && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
          txStatus === 'pending'   ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          txStatus === 'refunded'  ? 'bg-blue-50 text-blue-700 border border-blue-200'       :
          txStatus === 'withdrawn' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                     'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {txStatus === 'pending'   && '⏳ Waiting for transaction confirmation...'}
          {txStatus === 'refunded'  && '✓ Refund processed successfully.'}
          {txStatus === 'withdrawn' && '✓ Funds withdrawn to your wallet.'}
          {txStatus === 'error'     && '✗ Transaction failed. Please try again.'}
        </div>
      )}

      {/* Verification banner — shown to everyone when not verified */}
      <VerificationBanner status={campaign.verificationStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: image + info */}
        <div className="lg:col-span-2">
          <div className="w-full h-64 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl mb-6 flex items-center justify-center overflow-hidden">
            {campaign.imageHash ? (
              <img
                src={`https://gateway.pinata.cloud/ipfs/${campaign.imageHash}`}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-purple-300 text-sm">No image</span>
            )}
          </div>

          {/* Title + verification badge */}
          <div className="flex items-start gap-3 mb-3">
            <h1 className="text-2xl font-bold text-gray-900 flex-1">{campaign.title}</h1>
            {isVerified && (
              <span className="shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Verified
              </span>
            )}
            {campaign.verificationStatus === 'pending' && (
              <span className="shrink-0 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                Pending
              </span>
            )}
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{campaign.description}</p>

          {/* Refund — after deadline, goal not met */}
          {isExpired && !isGoalMet && isVerified && (
            <button onClick={handleRefund} disabled={txStatus === 'pending'}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {txStatus === 'pending' ? 'Processing...' : 'Claim Refund'}
            </button>
          )}

          {/* Withdraw — owner, goal met */}
          {isGoalMet && !campaign.claimed && isOwner && (
            <button onClick={handleWithdraw} disabled={txStatus === 'pending'}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              {txStatus === 'pending' ? 'Processing...' : 'Withdraw Funds'}
            </button>
          )}
        </div>

        {/* Right: donation panel — only shown when verified */}
        <div className="lg:col-span-1">
          {isVerified ? (
            <DonationPanel
              campaign={campaign}
              contract={contract}
              onSuccess={refetch}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Donations not available</p>
              <p className="text-xs text-gray-400">
                {campaign.verificationStatus === 'pending'
                  ? 'Waiting for admin verification'
                  : campaign.verificationStatus === 'rejected'
                  ? 'This campaign was rejected'
                  : 'Campaign not yet verified'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default CampaignDetail
