/**
 * components/CampaignDonationWrapper.jsx
 * Checks campaign expiry and renders the correct donation panel.
 * Supports both ETH (crypto) and UPI/Card (fiat) campaigns.
 *
 * Usage:
 *   <CampaignDonationWrapper campaign={campaign} onSuccess={refetch} />
 *
 * Campaign.deadline is a unix timestamp (Number) from the smart contract.
 */

import { useState, useEffect } from 'react'
import axios          from 'axios'
import UpiDonationPanel from './UpiDonationPanel'
import EthDonationPanel from './EthDonationPanel'  // your existing ETH component

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// deadline is unix timestamp (seconds)
const isExpiredLocally = (campaign) => {
  if (!campaign?.deadline) return false
  return campaign.deadline < Math.floor(Date.now() / 1000)
}

export default function CampaignDonationWrapper({ campaign, onSuccess }) {
  const [expired, setExpired] = useState(() => isExpiredLocally(campaign))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      // Immediate client-side check
      setExpired(isExpiredLocally(campaign))

      try {
        const { data } = await axios.get(`${API}/campaigns/check-expired/${campaign._id}`)
        if (!cancelled) setExpired(data.expired)
      } catch (err) {
        console.error('[CampaignDonationWrapper] Status check failed:', err.message)
        // Fall back to client-side result already set above
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkStatus()
    return () => { cancelled = true }
  }, [campaign._id])

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm mt-3">Loading...</p>
      </div>
    )
  }

  if (expired) {
    const deadlineDate = campaign.deadline
      ? new Date(campaign.deadline * 1000).toLocaleDateString('en-IN')
      : 'Unknown date'

    return (
      <div className="bg-white border border-red-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-full font-semibold">
              Campaign Expired
            </span>
            <span className="text-xs text-red-600">Ended on {deadlineDate}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium mb-1">🚫 This campaign is no longer accepting donations</p>
            <p className="text-xs text-red-600">The campaign deadline has passed. Donations are now closed.</p>
          </div>

          {/* Refund info for fiat campaigns */}
          {campaign.paymentType === 'fiat' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">💡 Already donated via UPI/Card?</p>
              <p className="text-xs text-amber-600">
                You can request a refund within 7 days of donation.
                Go to <strong>My Donations</strong> → click <strong>Request Refund</strong>.
              </p>
            </div>
          )}

          {/* Info for ETH campaigns */}
          {campaign.paymentType === 'eth' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Made an ETH donation?</p>
              <p className="text-xs text-blue-600">
                Blockchain donations cannot be automatically refunded.
                Please contact support for assistance.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Campaign is active — render the right panel
  return campaign.paymentType === 'fiat'
    ? <UpiDonationPanel campaign={campaign} onSuccess={onSuccess} />
    : <EthDonationPanel campaign={campaign} onSuccess={onSuccess} />
}
