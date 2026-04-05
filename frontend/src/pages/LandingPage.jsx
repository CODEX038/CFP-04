import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)

  const features = [
    {
      icon: '◆',
      title: 'Create campaigns',
      desc: 'Launch your idea in minutes. Set a goal, deadline, and description — deployed directly to the blockchain.',
    },
    {
      icon: '◈',
      title: 'Fund with ETH',
      desc: 'Back campaigns you believe in with ETH. Every transaction is transparent and verifiable on-chain.',
    },
    {
      icon: '◉',
      title: 'Automatic refunds',
      desc: "If a campaign doesn't hit its goal by the deadline, funders automatically get their ETH back.",
    },
    {
      icon: '◎',
      title: 'No middlemen',
      desc: 'Smart contracts hold and release funds trustlessly. No bank, no platform fees, no gatekeepers.',
    },
  ]

  const steps = [
    { num: '01', title: 'Connect your wallet',  desc: 'Link MetaMask to get started — no sign-up required.' },
    { num: '02', title: 'Create or browse',     desc: 'Launch a campaign or explore active ones looking for backers.' },
    { num: '03', title: 'Fund & track',         desc: 'Send ETH directly to the smart contract and watch progress in real time.' },
    { num: '04', title: 'Withdraw or refund',   desc: 'Goals met? Withdraw funds. Deadline passed without goal? Claim your refund.' },
  ]

  const stats = [
    { label: 'Campaigns created', value: '128+' },
    { label: 'ETH raised',        value: '2,400+' },
    { label: 'Funders worldwide', value: '3,800+' },
    { label: 'Success rate',      value: '74%' },
  ]

  const faqs = [
    {
      q: 'Do I need crypto to use FundChain?',
      a: 'Yes — you need MetaMask and ETH to create or fund campaigns. Gas fees apply for all on-chain actions.',
    },
    {
      q: 'What happens if a campaign fails?',
      a: 'If the goal is not met by the deadline, every funder can claim a full refund directly from the smart contract.',
    },
    {
      q: 'Is my money safe?',
      a: "Funds are held by audited smart contracts, not by us. No one can access them except through the contract rules.",
    },
    {
      q: 'What network does FundChain run on?',
      a: 'Currently deployed on Sepolia testnet for development. Mainnet deployment coming soon.',
    },
    {
      q: 'How do I become an admin?',
      a: 'Admins are appointed by the platform. Click "Admin login" in the navbar and use your credentials.',
    },
  ]

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">FundChain</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => navigate('/app')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-50">
              Browse campaigns
            </button>

            {/* USER LOGIN — clearly visible */}
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-purple-700 font-semibold border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
              Sign in
            </button>

            {/* ADMIN LOGIN */}
            <button onClick={() => navigate('/admin-login')}
              className="px-4 py-2 text-sm text-gray-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Admin login
            </button>

            <button onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              Get started
            </button>
          </div>

          {/* Mobile */}
          <div className="sm:hidden flex items-center gap-2">
            <button onClick={() => navigate('/login')}
              className="px-3 py-2 text-sm text-purple-700 border border-purple-200 rounded-lg font-semibold">
              Sign in
            </button>
            <button onClick={() => navigate('/admin-login')}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg font-medium">
              Admin
            </button>
            <button onClick={() => navigate('/app')}
              className="px-3 py-2 text-sm text-white bg-purple-600 rounded-lg font-medium">
              App
            </button>
          </div>

        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-purple-100">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
          Powered by Ethereum smart contracts
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Crowdfunding that's
          <span className="text-purple-600"> truly trustless</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create campaigns, fund ideas, and get automatic refunds — all governed
          by smart contracts. No middlemen. No hidden fees. Just code.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/login')}
            className="px-8 py-3.5 bg-purple-600 text-white rounded-xl font-medium text-base hover:bg-purple-700 transition-colors">
            Create account
          </button>
          <button onClick={() => navigate('/app')}
            className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-base hover:bg-gray-200 transition-colors">
            Browse campaigns
          </button>
        </div>

        {/* ── Quick access cards ────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <button onClick={() => navigate('/login')}
            className="flex flex-col items-center gap-2 bg-purple-50 border border-purple-200 rounded-2xl p-5 hover:bg-purple-100 transition-colors">
            <span className="text-2xl">👤</span>
            <span className="text-sm font-semibold text-purple-700">User login</span>
            <span className="text-xs text-purple-400">Sign in or create account</span>
          </button>
          <button onClick={() => navigate('/app')}
            className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-5 hover:bg-gray-100 transition-colors">
            <span className="text-2xl">🔍</span>
            <span className="text-sm font-semibold text-gray-700">Browse</span>
            <span className="text-xs text-gray-400">Explore campaigns</span>
          </button>
          <button onClick={() => navigate('/admin-login')}
            className="flex flex-col items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl p-5 hover:bg-orange-100 transition-colors">
            <span className="text-2xl">🛡️</span>
            <span className="text-sm font-semibold text-orange-700">Admin login</span>
            <span className="text-xs text-orange-400">Admin panel access</span>
          </button>
        </div>

        {/* Hero visual */}
        <div className="mt-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 max-w-4xl mx-auto border border-purple-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Solar community farm',    raised: '6.4',  goal: '10', pct: 64  },
              { title: 'Web3 coding bootcamp',    raised: '5.1',  goal: '5',  pct: 100 },
              { title: 'Medical records DApp',    raised: '18.2', goal: '25', pct: 73  },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 text-left border border-purple-100">
                <div className="w-full h-20 bg-purple-100 rounded-xl mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-1">{c.title}</p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                  <div
                    className={`h-1.5 rounded-full ${c.pct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(c.pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{c.raised} ETH raised</span>
                  <span className="text-purple-600 font-medium">{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="bg-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-purple-200 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Why FundChain?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Built on Ethereum — transparent, permissionless, and fully decentralized.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-lg font-bold mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From wallet connect to withdrawal — four simple steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 h-full">
                  <span className="text-4xl font-bold text-purple-100 mb-4 block">{s.num}</span>
                  <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-purple-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Frequently asked questions</h2>
          <p className="text-gray-500">Everything you need to know about FundChain.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                <span className={`text-purple-600 text-lg transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="bg-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to build something?</h2>
          <p className="text-purple-200 mb-8 max-w-xl mx-auto">
            Launch your campaign today — no approval, no gatekeepers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/login')}
              className="px-8 py-3.5 bg-white text-purple-600 rounded-xl font-medium text-base hover:bg-purple-50 transition-colors">
              Create account
            </button>
            <button onClick={() => navigate('/admin-login')}
              className="px-8 py-3.5 bg-purple-500 text-white rounded-xl font-medium text-base hover:bg-purple-400 border border-purple-400 transition-colors">
              Admin login
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">CF</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">FundChain</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <button onClick={() => navigate('/app')}         className="hover:text-gray-600">App</button>
            <button onClick={() => navigate('/login')}       className="hover:text-gray-600">Sign in</button>
            <button onClick={() => navigate('/admin-login')} className="hover:text-gray-600">Admin</button>
            <a href="https://github.com/CODEX038/CFP-04" target="_blank" rel="noreferrer"
              className="hover:text-gray-600">GitHub</a>
          </div>
          <p className="text-xs text-gray-400">© 2026 FundChain. Built on Ethereum.</p>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
