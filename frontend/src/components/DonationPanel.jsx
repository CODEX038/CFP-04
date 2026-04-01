/**
 * DonationPanel.jsx
 * ETH-only donate widget. Used when campaign.paymentType === 'eth'.
 * UPI/Card donations are handled by UpiDonationPanel.jsx.
 *
 * Usage: <DonationPanel campaign={campaign} contract={contract} onSuccess={refetch} />
 */

import { useState } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'

const QUICK_ETH = ['0.001', '0.005', '0.01', '0.05']

export default function DonationPanel({ campaign, contract, onSuccess }) {
  const { account, connectWallet } = useWallet()

  const [showForm, setShowForm]     = useState(false)
  const [ethAmount, setEthAmount]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const clear = () => { setError(''); setSuccess('') }

  const handleDonate = async () => {
    if (!account) { connectWallet(); return }
    if (!contract) { setError('Contract not loaded. Please refresh.'); return }

    const amt = parseFloat(ethAmount)
    if (!amt || amt <= 0) { setError('Enter a valid ETH amount.'); return }

    setLoading(true); clear()
    try {
      // ✅ Fixed: was contract.fund() — smart contract function is named donate()
      const tx = await contract.donate({ value: ethers.parseEther(ethAmount) })
      await tx.wait()
      setSuccess(`✓ Successfully donated ${ethAmount} ETH! Thank you.`)
      setEthAmount('')
      setShowForm(false)
      onSuccess?.()
    } catch (err) {
      setError(err.reason || err.message || 'Transaction failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {!showForm ? (
        /* ── Collapsed: single donate button ── */
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 12.5l8 4.5 8-4.5L12 2z"/>
              </svg>
              ETH
            </span>
            <span className="text-xs text-gray-400">via MetaMask · Sepolia</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors text-sm"
          >
            💜 Donate to this campaign
          </button>
        </div>
      ) : (
        /* ── Expanded ETH form ── */
        <div className="p-5 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Donate with ETH</span>
            <span className="text-xs text-gray-400">Sepolia testnet</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">
              ⚠ {error}
            </div>
          )}

          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ETH.map((a) => (
              <button
                key={a}
                onClick={() => setEthAmount(a)}
                className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                  ethAmount === a
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-200 text-gray-700 hover:border-purple-400'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <input
              type="number"
              value={ethAmount}
              onChange={(e) => { setEthAmount(e.target.value); clear() }}
              placeholder="Custom ETH amount"
              min="0.0001"
              step="0.0001"
              className="w-full border border-gray-200 rounded-xl px-4 pr-16 py-2.5 text-sm outline-none focus:border-purple-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ETH</span>
          </div>

          {/* MetaMask info */}
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-xs text-purple-700">MetaMask will open to confirm the transaction</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); clear(); setEthAmount('') }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDonate}
              disabled={loading || !ethAmount}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </>
              ) : `Donate ${ethAmount || '0'} ETH`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
