import { useState } from 'react'

const FundModal = ({ campaign, onFund, onClose, isPending }) => {
  const [amount, setAmount] = useState('')
  const [error, setError]   = useState('')

  const presets = ['0.01', '0.05', '0.1', '0.5']

  const handleSubmit = () => {
    const val = parseFloat(amount)
    if (!amount || isNaN(val) || val <= 0) {
      setError('Please enter a valid ETH amount.')
      return
    }
    setError('')
    onFund(amount)
  }

  return (
    <div
      style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.4)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Fund campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5 line-clamp-2">{campaign.title}</p>

        <p className="text-xs text-gray-400 mb-2">Quick amounts</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                amount === p
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300'
              }`}
            >
              {p} ETH
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-2">Custom amount</p>
        <div className="relative mb-1">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-16 text-sm outline-none focus:border-purple-400"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
            ETH
          </span>
        </div>
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="bg-gray-50 rounded-xl p-3 my-4 text-xs text-gray-500">
          <div className="flex justify-between mb-1">
            <span>Amount</span>
            <span>{amount || '0'} ETH</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Network fee (est.)</span>
            <span>~0.001 ETH</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !amount}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Waiting for confirmation...' : 'Confirm transaction'}
        </button>
      </div>
    </div>
  )
}

export default FundModal