/**
 * components/UpiDonationPanel.jsx
 * UPI / Card donate widget for fiat campaigns — powered by Stripe.
 *
 * Usage: <UpiDonationPanel campaign={campaign} onSuccess={refetch} />
 *
 * Campaign.deadline is a unix timestamp (Number) from the smart contract.
 */

import { useState } from 'react'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const API           = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const QUICK_INR = [100, 500, 1000, 5000]

const getToken = () => localStorage.getItem('token') || localStorage.getItem('admin_token')

// deadline is a unix timestamp (seconds)
const isCampaignExpired = (campaign) => {
  if (!campaign?.deadline) return false
  return campaign.deadline < Math.floor(Date.now() / 1000)
}

// ── Stripe inner checkout form ────────────────────────────────────────────────
function StripeCheckoutForm({ amount, onSuccess, onError, onCancel }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/payment/callback` },
      })

      if (error) {
        onError(error.message)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        const donationId = sessionStorage.getItem('pendingDonationId')
        const { data } = await axios.post(
          `${API}/donations/upi/verify`,
          { paymentIntentId: paymentIntent.id, donationId },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        sessionStorage.removeItem('pendingDonationId')
        onSuccess(data.message || 'Payment successful!')
      }
    } catch (err) {
      onError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card', 'upi'] }} />
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UpiDonationPanel({ campaign, onSuccess }) {
  const [showForm, setShowForm]         = useState(false)
  const [inrAmount, setInrAmount]       = useState('')
  const [message, setMessage]           = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')

  const expired = isCampaignExpired(campaign)
  const clear   = () => { setError(''); setSuccess('') }

  const resetForm = () => {
    setShowForm(false)
    setInrAmount('')
    setMessage('')
    setClientSecret('')
    clear()
  }

  const handleProceed = async () => {
    const rupees = parseFloat(inrAmount)
    if (!rupees || rupees < 1) { setError('Enter a valid amount (min ₹1).'); return }

    const token = getToken()
    if (!token) { setError('Please log in to donate.'); return }

    if (expired) { setError('This campaign has expired and is no longer accepting donations.'); return }

    setLoading(true)
    clear()
    try {
      const { data } = await axios.post(
        `${API}/donations/upi/create-order`,
        { campaignId: campaign._id, amount: rupees, message: message.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      sessionStorage.setItem('pendingDonationId', data.donationId)
      setClientSecret(data.clientSecret)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600 ml-2">✕</button>
        </div>
      )}

      {!showForm ? (
        /* ── Collapsed: donate button (or expired notice) ── */
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
              </svg>
              UPI / Card
            </span>
            <span className="text-xs text-gray-400">Powered by Stripe</span>
            {expired && (
              <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                Expired
              </span>
            )}
          </div>

          {expired ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                ⚠️ This campaign has expired and is no longer accepting donations.
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                <p className="font-semibold mb-1">💡 Already donated via UPI/Card?</p>
                <p>You can request a refund within 7 days. Go to <strong>My Donations</strong> → <strong>Request Refund</strong>.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm shadow-sm"
            >
              💳 Donate to this campaign
            </button>
          )}
        </div>
      ) : (
        /* ── Expanded form ── */
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Donate via UPI / Card</span>
            <span className="text-xs text-gray-400">Powered by Stripe</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
              <span>⚠️</span>
              <span className="flex-1">{error}</span>
              <button onClick={clear} className="text-red-400 hover:text-red-600 shrink-0">✕</button>
            </div>
          )}

          {!clientSecret ? (
            <div className="space-y-4">
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {QUICK_INR.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setInrAmount(String(a)); clear() }}
                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                      inrAmount === String(a)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    ₹{a}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                <input
                  type="number"
                  value={inrAmount}
                  onChange={(e) => { setInrAmount(e.target.value); clear() }}
                  placeholder="Enter custom amount"
                  min="1"
                  step="1"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message (optional)"
                rows={2}
                maxLength={200}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-all"
              />

              {!getToken() && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                  <span>⚠️</span><span>Please log in to donate.</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  disabled={loading || !inrAmount || expired}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loading ? 'Loading...' : `Continue ₹${inrAmount || '0'}`}
                </button>
              </div>
            </div>
          ) : (
            /* Stripe checkout */
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary:     '#2563eb',
                    colorBackground:  '#ffffff',
                    colorText:        '#1f2937',
                    colorDanger:      '#ef4444',
                    fontFamily:       'system-ui, sans-serif',
                    borderRadius:     '12px',
                  },
                },
              }}
            >
              <StripeCheckoutForm
                amount={inrAmount}
                onSuccess={(msg) => {
                  setSuccess(msg)
                  resetForm()
                  onSuccess?.()
                }}
                onError={(msg) => {
                  setError(msg)
                  setClientSecret('')
                }}
                onCancel={() => { setClientSecret(''); clear() }}
              />
            </Elements>
          )}
        </div>
      )}
    </div>
  )
}
