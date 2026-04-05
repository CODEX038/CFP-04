import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useCampaign } from '../hooks/useCampaigns'
import { useCampaignContract } from '../hooks/useContract'
import DonationPanel from '../components/DonationPanel'
import UpiDonationPanel from '../components/UpiDonationPanel'

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

const GoalProgress = ({ campaign }) => {
  const isETH  = campaign.paymentType === 'eth' || !campaign.paymentType
  const isFiat = campaign.paymentType === 'fiat'

  const raised = isFiat
    ? (campaign.raised || 0)
    : parseFloat(campaign.amountRaised || 0)

  const goal   = parseFloat(campaign.goal || 0)
  const pct    = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0

  const formatValue = (val) => {
    if (isFiat) return `₹${Number(val).toLocaleString('en-IN')}`
    return `${parseFloat(val).toFixed(4)} ETH`
  }

  return (
    <div className="mb-6">
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isFiat ? 'bg-blue-500' : 'bg-purple-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <span className={`font-semibold ${isFiat ? 'text-blue-600' : 'text-purple-600'}`}>
            {formatValue(raised)}
          </span>
          <span className="text-gray-400 ml-1">raised</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500">of </span>
          <span className="font-medium text-gray-800">{formatValue(goal)}</span>
          <span className="text-gray-400 ml-1">goal</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
        <span>{pct.toFixed(1)}% funded</span>
        {campaign.funders > 0 && <span>{campaign.funders} donor{campaign.funders !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}

const PaymentTypeBadge = ({ paymentType }) => {
  const isETH = paymentType === 'eth' || !paymentType

  if (isETH) return (
    <span className="shrink-0 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full flex items-center gap-1">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 12.5l8 4.5 8-4.5L12 2z"/>
      </svg>
      ETH
    </span>
  )

  return (
    <span className="shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full flex items-center gap-1">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="2" y="5" width="20" height="14" rx="3"/>
        <path d="M2 10h20"/>
      </svg>
      UPI / Card
    </span>
  )
}

const CampaignDetail = () => {
  const { id: contractAddress } = useParams()
  const navigate                = useNavigate()
  const { account }             = useWallet()

  const { campaign, loading, error, refetch } = useCampaign(contractAddress)

  // ✅ FIX: always pass contractAddress — hook handles invalid/fiat addresses internally
  const { donate, refund, claimFunds } = useCampaignContract(contractAddress)

  const [txStatus, setTxStatus] = useState(null)

  const handleRefund = async () => {
    if (!refund) { alert('Refund not available'); return }
    setTxStatus('pending')
    try {
      await refund()
      setTxStatus('refunded')
      await refetch()
      setTimeout(() => setTxStatus(null), 4000)
    } catch (err) {
      console.error('Refund error:', err)
      setTxStatus('error')
      setTimeout(() => setTxStatus(null), 4000)
    }
  }

  const handleWithdraw = async () => {
    if (!claimFunds) { alert('Withdraw not available'); return }
    setTxStatus('pending')
    try {
      await claimFunds()
      setTxStatus('withdrawn')
      await refetch()
      setTimeout(() => setTxStatus(null), 4000)
    } catch (err) {
      console.error('Withdraw error:', err)
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

  const isETH      = campaign.paymentType === 'eth' || !campaign.paymentType
  const isFiat     = campaign.paymentType === 'fiat'
  const raised     = isFiat ? (campaign.raised || 0) : parseFloat(campaign.amountRaised || 0)
  const isExpired  = Date.now() > campaign.deadline
  const isGoalMet  = raised >= parseFloat(campaign.goal)
  const isVerified = campaign.verificationStatus === 'verified'
  const isOwner    = account?.toLowerCase() === campaign.owner?.toLowerCase()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to campaigns
      </button>

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

      <VerificationBanner status={campaign.verificationStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

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

          <div className="flex items-start gap-3 mb-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 flex-1">{campaign.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <PaymentTypeBadge paymentType={campaign.paymentType} />
              {isVerified && (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Verified
                </span>
              )}
              {campaign.verificationStatus === 'pending' && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                  Pending
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">{campaign.description}</p>

          <GoalProgress campaign={campaign} />

          {isETH && (
            <div className="flex gap-3 mt-4">
              {isExpired && !isGoalMet && isVerified && (
                <button onClick={handleRefund} disabled={txStatus === 'pending' || !refund}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {txStatus === 'pending' ? 'Processing...' : 'Claim Refund'}
                </button>
              )}
              {isGoalMet && !campaign.claimed && isOwner && (
                <button onClick={handleWithdraw} disabled={txStatus === 'pending' || !claimFunds}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {txStatus === 'pending' ? 'Processing...' : 'Withdraw Funds'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {isVerified ? (
            isETH ? (
              <DonationPanel
                campaign={campaign}
                donate={donate}
                onSuccess={refetch}
              />
            ) : (
              <UpiDonationPanel
                campaign={campaign}
                onSuccess={refetch}
              />
            )
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
