import { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const PRESET_AMOUNTS = [100, 500, 1000, 5000]

export default function UpiDonationPanel({ campaign, onSuccess }) {
  const { token } = useAuth?.() || {}
  const authToken = token || localStorage.getItem('admin_token')

  const [amount,    setAmount]    = useState('')
  const [message,   setMessage]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const selectedPreset = PRESET_AMOUNTS.includes(Number(amount)) ? Number(amount) : null

  const handleDonate = async () => {
    const amtNum = parseFloat(amount)
    if (!amtNum || amtNum < 1) { setError('Please enter a valid amount (min ₹1)'); return }
    if (!authToken) { setError('Please sign in to donate'); return }

    setLoading(true); setError('')
    try {
      const { data } = await axios.post(
        `${API}/donations/create-checkout`,
        {
          campaignId: campaign.contractAddress || campaign._id,
          amount:     amtNum,
          message:    message.trim(),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )

      /* Save session ID so CampaignDetail can verify payment on return */
      if (data.sessionId) {
        localStorage.setItem('stripe_session_id', data.sessionId)
      }

      /* Redirect to Stripe checkout */
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Could not create checkout session. Please try again.')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header */}
      <div style={{
        padding: '.875rem 1.25rem',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)' }}>
          Donate via UPI / Card
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
            <rect x="2" y="5" width="20" height="14" rx="3"/>
            <path d="M2 10h20"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: 'var(--text-muted)' }}>Powered by Stripe</span>
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Preset amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {PRESET_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(String(a))} style={{
              padding: '10px 4px', borderRadius: 'var(--r-md)',
              border: `1.5px solid ${selectedPreset===a ? 'var(--purple-600)' : 'var(--border)'}`,
              background: selectedPreset===a ? 'var(--purple-600)' : 'var(--bg-muted)',
              color: selectedPreset===a ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)', fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            fontFamily: 'var(--font-sans)', fontSize: '.9rem', fontWeight: 600,
            color: 'var(--text-muted)',
          }}>₹</span>
          <input
            type="number" min="1" value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            placeholder="Enter custom amount"
            style={{
              width: '100%', padding: '11px 14px 11px 26px', boxSizing: 'border-box',
              background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-md)', fontFamily: 'var(--font-sans)',
              fontSize: '.9rem', color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor='var(--purple-500)'}
            onBlur={e  => e.target.style.borderColor='var(--border)'}
          />
        </div>

        {/* Message */}
        <textarea
          value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Leave a message (optional)"
          rows={2}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            background: 'var(--bg-muted)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-md)', fontFamily: 'var(--font-sans)',
            fontSize: '.875rem', color: 'var(--text-primary)', outline: 'none',
            resize: 'none', transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor='var(--purple-500)'}
          onBlur={e  => e.target.style.borderColor='var(--border)'}
        />

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--error-50)', border: '1px solid #fecdd3',
            borderRadius: 'var(--r-md)', padding: '10px 14px',
            fontFamily: 'var(--font-sans)', fontSize: '.82rem', color: 'var(--error-700)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
          <button
            onClick={() => { setAmount(''); setMessage(''); setError('') }}
            style={{
              padding: '11px', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border)', background: 'var(--bg-muted)',
              fontFamily: 'var(--font-sans)', fontSize: '.875rem',
              fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button
            onClick={handleDonate}
            disabled={loading || !amount}
            style={{
              padding: '11px', borderRadius: 'var(--r-md)', border: 'none',
              background: loading || !amount
                ? 'var(--bg-muted)'
                : 'linear-gradient(135deg, var(--purple-600), var(--purple-700))',
              color: loading || !amount ? 'var(--text-subtle)' : '#fff',
              fontFamily: 'var(--font-sans)', fontSize: '.9rem', fontWeight: 700,
              cursor: loading || !amount ? 'not-allowed' : 'pointer',
              transition: 'all .15s',
              boxShadow: loading || !amount ? 'none' : '0 4px 14px rgba(124,58,237,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--text-muted)', flexShrink: 0 }}/>
                Redirecting…
              </>
            ) : (
              `Continue ₹${amount ? Number(amount).toLocaleString('en-IN') : '0'}`
            )}
          </button>
        </div>

        {/* Trust signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: '.75rem', borderTop: '1px solid var(--border-light)' }}>
          {[
            { icon: '🔒', text: 'Secure payments via Stripe' },
            { icon: '⛓️', text: 'Blockchain-verified campaign' },
            { icon: '↩️', text: 'Refunds available within 7 days' },
          ].map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.75rem', color: 'var(--text-muted)' }}>
              <span style={{ flexShrink: 0 }}>{t.icon}</span>
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
