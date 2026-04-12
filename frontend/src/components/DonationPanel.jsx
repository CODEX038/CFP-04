/**
 * DonationPanel.jsx  — ETH donation via MetaMask
 * Spacious layout matching the UpiDonationPanel design.
 */

import { useState } from 'react'
import { useWallet } from '../context/WalletContext'

const QUICK_ETH = ['0.001', '0.005', '0.01', '0.05']

export default function DonationPanel({ campaign, donate, onSuccess }) {
  const { account, connectWallet } = useWallet()

  const [showForm,   setShowForm]   = useState(false)
  const [ethAmount,  setEthAmount]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  const clear = () => { setError(''); setSuccess('') }

  const handleDonate = async () => {
    if (!account) { connectWallet(); return }
    if (!donate)  { setError('Wallet not connected. Please connect MetaMask.'); return }

    const clean = String(ethAmount ?? '').trim()
    if (!clean || parseFloat(clean) <= 0) { setError('Enter a valid ETH amount.'); return }

    setLoading(true); clear()
    try {
      await donate(clean)
      setSuccess(`✓ Successfully donated ${clean} ETH! Thank you.`)
      setEthAmount('')
      setShowForm(false)
      onSuccess?.()
    } catch (err) {
      setError(err.shortMessage || err.reason || err.message || 'Transaction failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => { setShowForm(false); clear(); setEthAmount('') }
  const cleanDisplay = String(ethAmount ?? '').trim()
  const numericValid = cleanDisplay && parseFloat(cleanDisplay) > 0

  return (
    <>
      <style>{`
        .dp-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .dp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .dp-title { font-size: 1rem; font-weight: 700; color: #111; margin: 0; }
        .dp-network {
          font-size: .72rem; color: #6b7280; font-weight: 500;
          display: flex; align-items: center; gap: 5px;
        }
        .dp-body {
          padding: 22px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .dp-eth-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f5f3ff;
          border: 1px solid #ede9fe;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: .8rem;
          font-weight: 600;
          color: #6d28d9;
        }

        /* Quick chips */
        .dp-chips {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .dp-chip {
          padding: 11px 4px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .85rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          text-align: center;
          transition: all .18s;
        }
        .dp-chip:hover { border-color: #7c3aed; color: #7c3aed; background: #faf5ff; }
        .dp-chip-active { border-color: #7c3aed !important; background: #7c3aed !important; color: #fff !important; }

        /* Amount input */
        .dp-input-wrap { position: relative; }
        .dp-unit {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          font-size: .9rem; font-weight: 600; color: #6b7280; pointer-events: none;
        }
        .dp-amount-input {
          width: 100%;
          padding: 13px 50px 13px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .95rem;
          color: #111;
          outline: none;
          transition: border-color .18s, box-shadow .18s;
          box-sizing: border-box;
        }
        .dp-amount-input::placeholder { color: #d1d5db; }
        .dp-amount-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.1);
        }

        /* Info strip */
        .dp-info {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #faf5ff;
          border: 1px solid #ede9fe;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: .82rem;
          color: #6d28d9;
        }

        /* Error / success */
        .dp-error {
          background: #fef2f2; border: 1px solid #fecdd3;
          color: #dc2626; font-size: .82rem;
          padding: 10px 14px; border-radius: 10px;
        }
        .dp-success {
          background: #f0fdf4; border: 1px solid #bbf7d0;
          color: #15803d; font-size: .85rem;
          padding: 12px 16px; border-radius: 12px;
        }

        /* Actions */
        .dp-actions { display: grid; grid-template-columns: 1fr 1.8fr; gap: 10px; }
        .dp-btn-cancel {
          padding: 13px;
          border-radius: 12px; border: 1.5px solid #e5e7eb; background: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .9rem; font-weight: 600; color: #6b7280; cursor: pointer;
          transition: all .18s;
        }
        .dp-btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; }
        .dp-btn-donate {
          padding: 13px; border-radius: 12px; border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .92rem; font-weight: 700; cursor: pointer;
          transition: all .18s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow: 0 4px 14px rgba(124,58,237,.35);
        }
        .dp-btn-donate:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,.45);
        }
        .dp-btn-donate:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        /* Entry button (before form shown) */
        .dp-entry-body { padding: 24px; }
        .dp-btn-open {
          width: 100%;
          padding: 14px;
          border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 1rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 16px rgba(124,58,237,.38);
          transition: all .18s;
        }
        .dp-btn-open:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(124,58,237,.5); }

        /* Trust */
        .dp-trust {
          margin-top: 14px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .dp-trust-row {
          display: flex; align-items: center; gap: 10px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: .82rem; color: #6b7280;
        }
        .dp-trust-icon {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: .9rem; flex-shrink: 0;
        }

        /* Spinner */
        .dp-spin {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff; border-radius: 50%;
          animation: dpSpin .7s linear infinite; display: inline-block;
        }
        @keyframes dpSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Success banner */}
      {success && (
        <div className="dp-success" style={{ marginBottom: 14 }}>{success}</div>
      )}

      {/* Main card */}
      <div className="dp-wrap">

        {!showForm ? (
          /* ── Entry state ── */
          <>
            <div className="dp-header">
              <h3 className="dp-title">Donate with ETH</h3>
              <div className="dp-network">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Sepolia testnet
              </div>
            </div>
            <div className="dp-entry-body">
              <div className="dp-eth-badge" style={{ marginBottom: 16 }}>
                <svg width="12" height="12" viewBox="0 0 320 512" fill="#6d28d9">
                  <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"/>
                </svg>
                ETH · via MetaMask
              </div>
              <button className="dp-btn-open" onClick={() => setShowForm(true)}>
                💜 Donate to this campaign
              </button>
            </div>
          </>
        ) : (
          /* ── Form state ── */
          <>
            <div className="dp-header">
              <h3 className="dp-title">Donate with ETH</h3>
              <div className="dp-network">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                via MetaMask · Sepolia
              </div>
            </div>

            <div className="dp-body">

              {/* Quick chips */}
              <div>
                <p style={{ fontSize: '.78rem', color: '#9ca3af', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Quick amounts
                </p>
                <div className="dp-chips">
                  {QUICK_ETH.map(a => (
                    <button
                      key={a}
                      className={`dp-chip${ethAmount === a ? ' dp-chip-active' : ''}`}
                      onClick={() => { clear(); setEthAmount(a) }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="dp-input-wrap">
                <input
                  type="number"
                  className="dp-amount-input"
                  placeholder="Custom ETH amount"
                  value={ethAmount}
                  min="0.0001"
                  step="0.0001"
                  onChange={e => { clear(); setEthAmount(e.target.value) }}
                />
                <span className="dp-unit">ETH</span>
              </div>

              {/* Info */}
              <div className="dp-info">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                MetaMask will open to confirm the transaction
              </div>

              {/* Error */}
              {error && <div className="dp-error">⚠ {error}</div>}

              {/* Actions */}
              <div className="dp-actions">
                <button className="dp-btn-cancel" onClick={handleCancel}>Cancel</button>
                <button
                  className="dp-btn-donate"
                  onClick={handleDonate}
                  disabled={loading || !numericValid}
                >
                  {loading
                    ? <><span className="dp-spin" /> Confirming…</>
                    : `Donate ${cleanDisplay || '0'} ETH`
                  }
                </button>
              </div>

            </div>
          </>
        )}
      </div>

      {/* Trust signals */}
      <div className="dp-trust">
        <div className="dp-trust-row">
          <div className="dp-trust-icon" style={{ background: '#fef3c7' }}>🔒</div>
          <span>Transactions secured on Ethereum</span>
        </div>
        <div className="dp-trust-row">
          <div className="dp-trust-icon" style={{ background: '#f0fdf4' }}>⛓️</div>
          <span>Blockchain-verified campaign</span>
        </div>
        <div className="dp-trust-row">
          <div className="dp-trust-icon" style={{ background: '#eff6ff' }}>↩️</div>
          <span>Auto-refund if goal not met</span>
        </div>
      </div>
    </>
  )
}
