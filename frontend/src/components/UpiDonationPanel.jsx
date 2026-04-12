/**
 * UpiDonationPanel.jsx
 * Spacious, well-padded UPI / Card donation panel.
 * Matches the layout visible in the screenshot:
 *  - "Donate via UPI / Card" header + "Powered by Stripe" badge
 *  - Quick-amount chips  ₹100 · ₹500 · ₹1000 · ₹5000
 *  - Custom amount input
 *  - Message textarea (optional)
 *  - Cancel / Continue buttons
 *  - Trust signals below the card
 */

import { useState } from 'react'
import axios from 'axios'

const API         = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export default function UpiDonationPanel({ campaign, onSuccess }) {
  const [amount,    setAmount]    = useState('')
  const [message,   setMessage]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(true)

  const token   = localStorage.getItem('admin_token')
  const headers = { Authorization: `Bearer ${token}` }

  const handleQuick = (val) => {
    setError('')
    setAmount(String(val))
  }

  const handleContinue = async () => {
    const num = parseFloat(amount)
    if (!num || num < 1) { setError('Please enter a valid amount (minimum ₹1).'); return }
    setLoading(true); setError('')
    try {
      const { data } = await axios.post(
        `${API}/donations/create-checkout`,
        { campaignId: campaign._id || campaign.contractAddress, amount: num, message },
        { headers }
      )
      if (data?.url) window.location.href = data.url
      else setError('Could not start payment. Please try again.')
    } catch (e) {
      setError(e.response?.data?.message || 'Payment initiation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setAmount(''); setMessage(''); setError('')
  }

  const numericAmount = parseFloat(amount) || 0

  return (
    <>
      <style>{`
        .udp-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Header ── */
        .udp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .udp-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111;
          margin: 0;
        }
        .udp-stripe-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: .72rem;
          color: #6b7280;
          font-weight: 500;
        }
        .udp-stripe-badge svg { opacity: .7; }

        /* ── Body ── */
        .udp-body {
          padding: 22px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Quick amount chips */
        .udp-chips {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .udp-chip {
          padding: 11px 6px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          text-align: center;
          transition: all .18s;
        }
        .udp-chip:hover {
          border-color: #7c3aed;
          color: #7c3aed;
          background: #faf5ff;
        }
        .udp-chip-active {
          border-color: #7c3aed !important;
          background: #7c3aed !important;
          color: #fff !important;
        }

        /* Custom amount input */
        .udp-input-wrap {
          position: relative;
        }
        .udp-rupee {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          pointer-events: none;
        }
        .udp-amount-input {
          width: 100%;
          padding: 13px 16px 13px 30px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .95rem;
          color: #111;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
          box-sizing: border-box;
        }
        .udp-amount-input::placeholder { color: #d1d5db; }
        .udp-amount-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.1);
        }

        /* Message textarea */
        .udp-textarea {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem;
          color: #111;
          outline: none;
          resize: none;
          min-height: 80px;
          transition: border-color .18s, box-shadow .18s;
          box-sizing: border-box;
        }
        .udp-textarea::placeholder { color: #d1d5db; }
        .udp-textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.1);
        }

        /* Error */
        .udp-error {
          background: #fef2f2;
          border: 1px solid #fecdd3;
          color: #dc2626;
          font-size: .82rem;
          padding: 10px 14px;
          border-radius: 10px;
        }

        /* Action buttons */
        .udp-actions {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 10px;
        }
        .udp-btn-cancel {
          padding: 13px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all .18s;
        }
        .udp-btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; }

        .udp-btn-continue {
          padding: 13px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .92rem;
          font-weight: 700;
          cursor: pointer;
          transition: all .18s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          box-shadow: 0 4px 14px rgba(124,58,237,.35);
        }
        .udp-btn-continue:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,.45);
        }
        .udp-btn-continue:disabled {
          opacity: .5;
          cursor: not-allowed;
          transform: none;
        }

        /* Trust signals */
        .udp-trust {
          margin-top: 14px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .udp-trust-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: .82rem;
          color: #6b7280;
        }
        .udp-trust-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .9rem;
          flex-shrink: 0;
        }

        /* Spinner */
        .udp-spin {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: udpSpin .7s linear infinite;
          display: inline-block;
        }
        @keyframes udpSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Main card ── */}
      <div className="udp-wrap">

        {/* Header */}
        <div className="udp-header">
          <h3 className="udp-title">Donate via UPI / Card</h3>
          <div className="udp-stripe-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
            </svg>
            Powered by Stripe
          </div>
        </div>

        {/* Body */}
        <div className="udp-body">

          {/* Quick amounts */}
          <div className="udp-chips">
            {QUICK_AMOUNTS.map(a => (
              <button
                key={a}
                className={`udp-chip${amount === String(a) ? ' udp-chip-active' : ''}`}
                onClick={() => handleQuick(a)}
              >
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="udp-input-wrap">
            <span className="udp-rupee">₹</span>
            <input
              type="number"
              className="udp-amount-input"
              placeholder="Enter custom amount"
              value={amount}
              min="1"
              onChange={e => { setError(''); setAmount(e.target.value) }}
            />
          </div>

          {/* Message */}
          <textarea
            className="udp-textarea"
            placeholder="Leave a message (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
          />

          {/* Error */}
          {error && <div className="udp-error">⚠ {error}</div>}

          {/* Actions */}
          <div className="udp-actions">
            <button className="udp-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button
              className="udp-btn-continue"
              onClick={handleContinue}
              disabled={loading || numericAmount < 1}
            >
              {loading
                ? <><span className="udp-spin" /> Processing…</>
                : `Continue ₹${numericAmount > 0 ? numericAmount.toLocaleString('en-IN') : 0}`
              }
            </button>
          </div>
        </div>
      </div>

      {/* Trust signals below the card */}
      <div className="udp-trust">
        <div className="udp-trust-row">
          <div className="udp-trust-icon" style={{ background: '#fef3c7' }}>🔒</div>
          <span>Secure payments via Stripe</span>
        </div>
        <div className="udp-trust-row">
          <div className="udp-trust-icon" style={{ background: '#f0fdf4' }}>⛓️</div>
          <span>Blockchain-verified campaign</span>
        </div>
        <div className="udp-trust-row">
          <div className="udp-trust-icon" style={{ background: '#eff6ff' }}>↩️</div>
          <span>Refunds available within 7 days</span>
        </div>
      </div>
    </>
  )
}
