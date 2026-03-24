/**
 * DonationPanel.jsx
 * ETH via MetaMask + UPI/Card via Stripe
 * Usage: <DonationPanel campaign={campaign} contract={contract} onSuccess={refetch} />
 */

import { useState } from 'react'
import axios from 'axios'
import { ethers } from 'ethers'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useWallet } from '../context/WalletContext'

const API           = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ── Helper: always get the correct token ─────────────────────────────────────
const getToken = () => localStorage.getItem('admin_token')

const QUICK_ETH = ['0.001', '0.005', '0.01', '0.05']
const QUICK_INR = [100, 500, 1000, 5000]

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
      if (error) { onError(error.message); return }
      if (paymentIntent?.status === 'succeeded') {
        const donationId = sessionStorage.getItem('pendingDonationId')
        const { data }   = await axios.post(
          `${API}/donations/upi/verify`,
          { paymentIntentId: paymentIntent.id, donationId },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        sessionStorage.removeItem('pendingDonationId')
        onSuccess(data.message)
      }
    } catch (err) {
      onError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
          Back
        </button>
        <button type="submit" disabled={!stripe || loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
          {loading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
      </div>
    </form>
  )
}

// ── Main DonationPanel ────────────────────────────────────────────────────────
export default function DonationPanel({ campaign, contract, onSuccess }) {
  const { account, connectWallet } = useWallet()

  const [tab, setTab]       = useState('eth')
  const [showForm, setShowForm] = useState(false)

  // ETH
  const [ethAmount, setEthAmount]   = useState('')
  const [ethLoading, setEthLoading] = useState(false)

  // UPI
  const [inrAmount, setInrAmount]       = useState('')
  const [message, setMessage]           = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [upiLoading, setUpiLoading]     = useState(false)

  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const clear = () => { setError(''); setSuccess('') }

  // ── ETH via MetaMask ────────────────────────────────────────────────────────
  const handleEthDonate = async () => {
    if (!account) { connectWallet(); return }
    if (!contract) { setError('Contract not loaded. Please refresh.'); return }
    const amt = parseFloat(ethAmount)
    if (!amt || amt <= 0) { setError('Enter a valid ETH amount.'); return }

    setEthLoading(true); clear()
    try {
      const tx = await contract.fund({ value: ethers.parseEther(ethAmount) })
      await tx.wait()
      setSuccess(`✓ Successfully donated ${ethAmount} ETH! Thank you.`)
      setEthAmount('')
      setShowForm(false)
      onSuccess?.()
    } catch (err) {
      setError(err.reason || err.message || 'Transaction failed.')
    } finally {
      setEthLoading(false)
    }
  }

  // ── UPI/Stripe ──────────────────────────────────────────────────────────────
  const handleUpiProceed = async () => {
    const rupees = parseFloat(inrAmount)
    if (!rupees || rupees < 1) { setError('Enter a valid amount (min ₹1).'); return }

    const token = getToken()
    if (!token) {
      setError('Please log in to make a UPI donation.')
      return
    }

    setUpiLoading(true); clear()
    try {
      const { data } = await axios.post(
        `${API}/donations/upi/create-order`,
        { campaignId: campaign._id, amount: rupees, message },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      sessionStorage.setItem('pendingDonationId', data.donationId)
      setClientSecret(data.clientSecret)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setUpiLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      {success && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {!showForm ? (
        <div className="p-5">
          <button onClick={() => setShowForm(true)}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors text-sm">
            💜 Donate to this campaign
          </button>
        </div>
      ) : (
        <div className="p-5 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => { setTab('eth'); clear(); setClientSecret('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'eth' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              ◆ ETH
            </button>
            <button onClick={() => { setTab('upi'); clear(); setClientSecret('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'upi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              💳 UPI / Card
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">
              ⚠ {error}
            </div>
          )}

          {/* ── ETH TAB ── */}
          {tab === 'eth' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Donate ETH directly via MetaMask · Sepolia testnet</p>

              <div className="grid grid-cols-4 gap-2">
                {QUICK_ETH.map((a) => (
                  <button key={a} onClick={() => setEthAmount(a)}
                    className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                      ethAmount === a
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-gray-200 text-gray-700 hover:border-purple-400'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input type="number" value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="Custom ETH amount"
                  min="0.0001" step="0.0001"
                  className="w-full border border-gray-200 rounded-xl px-4 pr-16 py-2.5 text-sm outline-none focus:border-purple-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETH</span>
              </div>

              <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-xs text-purple-700">MetaMask will open to confirm the transaction</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowForm(false); clear() }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleEthDonate} disabled={ethLoading || !ethAmount}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {ethLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirming...
                    </>
                  ) : `Donate ${ethAmount || '0'} ETH`}
                </button>
              </div>
            </div>
          )}

          {/* ── UPI TAB ── */}
          {tab === 'upi' && (
            <div className="space-y-4">
              {!clientSecret ? (
                <>
                  <p className="text-xs text-gray-400">Pay with UPI, Card, or NetBanking via Stripe</p>

                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_INR.map((a) => (
                      <button key={a} onClick={() => setInrAmount(String(a))}
                        className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                          inrAmount === String(a)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'border-gray-200 text-gray-700 hover:border-purple-400'
                        }`}>
                        ₹{a}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                    <input type="number" value={inrAmount}
                      onChange={(e) => setInrAmount(e.target.value)}
                      placeholder="Enter amount" min="1"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none focus:border-purple-400"
                    />
                  </div>

                  <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave a message (optional)" rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 resize-none"
                  />

                  {!getToken() && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                      ⚠ Please log in to make a UPI donation.
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => { setShowForm(false); clear() }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleUpiProceed} disabled={upiLoading || !inrAmount}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                      {upiLoading ? 'Loading...' : `Continue ₹${inrAmount || '0'}`}
                    </button>
                  </div>
                </>
              ) : (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <StripeCheckoutForm
                    amount={inrAmount}
                    onSuccess={(msg) => {
                      setSuccess(`✓ ${msg}`)
                      setInrAmount(''); setMessage(''); setClientSecret(''); setShowForm(false)
                    }}
                    onError={(msg) => setError(msg)}
                    onCancel={() => { setClientSecret(''); clear() }}
                  />
                </Elements>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
