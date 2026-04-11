import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [countVisible, setCountVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setCountVisible(true) },
      { threshold: 0.3 }
    )
    const el = document.getElementById('stats-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: 'Blockchain Secured',
      desc: 'Every transaction is immutably recorded on Ethereum. No manipulation, no fraud — just transparent, verifiable fundraising.',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: 'Community Powered',
      desc: 'Real backers, real impact. Connect with thousands of supporters who believe in ideas that change the world.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
      title: 'Auto Refunds',
      desc: "Goal not met by deadline? Funds return automatically to every backer. No disputes, no waiting — code handles it all.",
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="5" width="20" height="14" rx="3"/>
          <path d="M2 10h20"/>
        </svg>
      ),
      title: 'UPI & Crypto',
      desc: 'Accept donations in ETH via MetaMask or Indian UPI/Card payments through Stripe. Maximum reach, zero friction.',
      color: 'from-orange-500 to-rose-500',
    },
  ]

  const steps = [
    {
      num: '01',
      title: 'Create your account',
      desc: 'Sign up in minutes, verify your identity, and connect your MetaMask wallet to get started.',
      img: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=400&q=80',
    },
    {
      num: '02',
      title: 'Launch your campaign',
      desc: 'Set your funding goal, deadline, and tell your story. Go live on the blockchain instantly.',
      img: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80',
    },
    {
      num: '03',
      title: 'Collect funds',
      desc: 'Backers from around the world fund your campaign with ETH or UPI. Watch your progress in real time.',
      img: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&q=80',
    },
    {
      num: '04',
      title: 'Withdraw & deliver',
      desc: 'Hit your goal? Withdraw funds instantly. Miss it? Every backer gets an automatic refund.',
      img: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400&q=80',
    },
  ]

  const stats = [
    { label: 'Campaigns Launched', value: '128+', icon: '🚀' },
    { label: 'ETH Raised',         value: '2,400+', icon: '⟠' },
    { label: 'Global Backers',     value: '3,800+', icon: '🌍' },
    { label: 'Success Rate',       value: '74%',  icon: '✅' },
  ]

  const faqs = [
    {
      q: 'Do I need crypto to use FundChain?',
      a: 'For ETH campaigns, you need MetaMask and ETH on Sepolia. For fiat campaigns, anyone can donate via UPI or card — no crypto needed.',
    },
    {
      q: 'What happens if my campaign fails?',
      a: 'If the goal is not met by the deadline, every funder can claim a full refund directly from the smart contract — automatic and trustless.',
    },
    {
      q: 'Is my money safe?',
      a: 'Funds are held by audited smart contracts on Ethereum. No one — not even us — can access them except through the contract rules.',
    },
    {
      q: 'Can I accept UPI/card donations?',
      a: 'Yes! When creating a campaign, choose "Fiat" payment type. Donors can pay via UPI, debit/credit card through Stripe — no crypto required.',
    },
    {
      q: 'What network does FundChain run on?',
      a: 'Currently deployed on Sepolia testnet. Mainnet deployment coming soon. UPI/card campaigns work on production Stripe.',
    },
    {
      q: 'How do I get verified?',
      a: 'Upload a government-issued ID during registration. Our team reviews it within 1-2 business days. Verified creators get a trust badge.',
    },
  ]

  const campaigns = [
    {
      title: 'Solar Community Farm',
      category: 'Environment',
      raised: '6.4', goal: '10', pct: 64, backers: 142,
      img: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500&q=80',
    },
    {
      title: 'Web3 Coding Bootcamp',
      category: 'Education',
      raised: '5.0', goal: '5', pct: 100, backers: 89,
      img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
    },
    {
      title: 'Medical Aid for Rahul',
      category: 'Health',
      raised: '1.8', goal: '3', pct: 60, backers: 234,
      img: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&q=80',
    },
  ]

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm tracking-tight">FC</span>
            </div>
            <span className={`font-bold text-xl tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              FundChain
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Browse', path: '/app' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                {label}
              </button>
            ))}
            <button onClick={() => navigate('/login')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                scrolled
                  ? 'border-violet-200 text-violet-700 hover:bg-violet-50'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}>
              Sign in
            </button>
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200 transition-all">
              Get started →
            </button>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => navigate('/login')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${
                scrolled ? 'border-violet-200 text-violet-700' : 'border-white/40 text-white'
              }`}>
              Sign in
            </button>
            <button onClick={() => navigate('/app')}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 rounded-lg">
              Browse
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1800&q=85"
            alt="hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/90 via-purple-900/80 to-indigo-900/90" />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-white/20">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live on Ethereum Sepolia · UPI & Crypto Supported
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
              Fund ideas that
              <span className="block bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                change the world
              </span>
            </h1>

            <p className="text-xl text-white/70 max-w-xl mb-10 leading-relaxed">
              The first crowdfunding platform with blockchain transparency and UPI support.
              Launch campaigns, raise funds, and deliver impact — trustlessly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <button onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white text-violet-700 rounded-2xl font-bold text-base hover:bg-violet-50 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2">
                Start a campaign
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button onClick={() => navigate('/app')}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold text-base hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Browse campaigns
              </button>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-6 flex-wrap">
              {['🔒 Smart contract secured', '⚡ Instant withdrawals', '🔄 Auto refunds', '₹ UPI accepted'].map(t => (
                <span key={t} className="text-sm text-white/60 font-medium">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ── Live campaigns preview ── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-2">Featured campaigns</p>
              <h2 className="text-3xl font-black text-gray-900">Making impact right now</h2>
            </div>
            <button onClick={() => navigate('/app')}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View all campaigns
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {campaigns.map((c, i) => (
              <div key={i}
                onClick={() => navigate('/app')}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <div className="relative h-48 overflow-hidden">
                  <img src={c.img} alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute top-3 left-3 text-xs font-semibold bg-white/90 text-gray-700 px-2.5 py-1 rounded-full">
                    {c.category}
                  </span>
                  {c.pct >= 100 && (
                    <span className="absolute top-3 right-3 text-xs font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-full">
                      ✓ Funded
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 mb-3 line-clamp-1">{c.title}</h3>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${c.pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
                      style={{ width: `${Math.min(c.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>
                      <span className="font-bold text-gray-900">{c.raised} ETH</span>
                      <span className="text-gray-400"> of {c.goal} ETH</span>
                    </span>
                    <span className="font-semibold text-violet-600">{c.pct}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{c.backers} backers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats-section" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1800&q=80"
            alt="stats bg"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-violet-900/92" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-violet-300 text-sm font-semibold uppercase tracking-widest mb-3">By the numbers</p>
            <h2 className="text-4xl font-black text-white">Trusted by thousands</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                <div className="text-4xl mb-3">{s.icon}</div>
                <p className="text-4xl font-black text-white mb-2">{s.value}</p>
                <p className="text-violet-200 text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">Why FundChain</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Built different. Built better.</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Combining the transparency of blockchain with the accessibility of traditional payments.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i}
                className="group relative rounded-3xl p-7 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white">
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-5 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">Simple process</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">From idea to funded in 4 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-full">
                  <div className="h-44 overflow-hidden relative">
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute bottom-4 left-4 text-4xl font-black text-white/30 leading-none">{s.num}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">{s.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-20 -right-4 z-10 w-8 h-8 bg-violet-100 rounded-full items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / testimonial band ── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1800&q=80"
            alt="community"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-violet-400 text-sm font-semibold uppercase tracking-widest mb-4">Real stories</p>
            <blockquote className="text-3xl font-bold text-white leading-tight mb-6">
              "FundChain helped me raise ₹4.2 lakhs for my daughter's surgery in just 11 days.
              The transparency gave donors confidence to give."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center font-bold text-white text-lg">R</div>
              <div>
                <p className="font-semibold text-white">Rajesh Sharma</p>
                <p className="text-sm text-gray-400">Campaign creator · Health category</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Got questions?</h2>
            <p className="text-gray-500">Everything you need to know about FundChain.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  openFaq === i ? 'border-violet-200 shadow-md shadow-violet-50' : 'border-gray-100'
                }`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <span className={`ml-4 shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                    openFaq === i ? 'bg-violet-600 text-white rotate-45' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1800&q=80"
            alt="cta background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/95 via-purple-900/90 to-indigo-900/95" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="text-violet-300 text-sm font-semibold uppercase tracking-widest mb-4">Ready to begin?</p>
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">
            Your campaign is one
            <span className="block text-transparent bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text">
              click away
            </span>
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            Join thousands of creators who have raised funds for causes that matter.
            No approval needed. No gatekeepers. Just you and your backers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/login')}
              className="px-10 py-4 bg-white text-violet-700 rounded-2xl font-bold text-lg hover:bg-violet-50 transition-all shadow-2xl shadow-black/20">
              Create free account →
            </button>
            <button onClick={() => navigate('/admin-login')}
              className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all border border-white/20">
              Admin login
            </button>
          </div>
          <p className="mt-6 text-sm text-white/40">No credit card required · Free to create campaigns</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">FC</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">FundChain</span>
            </div>
            <div className="flex items-center gap-8">
              {[
                { label: 'Browse', path: '/app' },
                { label: 'Sign in', path: '/login' },
                { label: 'Register', path: '/register' },
                { label: 'Admin', path: '/admin-login' },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => navigate(path)}
                  className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                  {label}
                </button>
              ))}
              <a href="https://github.com/CODEX038/CFP-04" target="_blank" rel="noreferrer"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">© 2026 FundChain. Built on Ethereum. Powered by transparency.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">Sepolia Testnet · Live</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
