import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      title: 'Blockchain Secured',
      desc: 'Every transaction is immutably recorded on Ethereum. No manipulation, no fraud — just transparent, verifiable fundraising.',
      bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      title: 'Community Powered',
      desc: 'Real backers, real impact. Connect with thousands of supporters who believe in ideas that change the world.',
      bg: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      title: 'Auto Refunds',
      desc: "Goal not met by deadline? Funds return automatically to every backer. No disputes, no waiting — code handles it all.",
      bg: 'linear-gradient(135deg,#10b981,#14b8a6)',
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg>,
      title: 'UPI & Crypto',
      desc: 'Accept donations in ETH via MetaMask or Indian UPI/Card payments through Stripe. Maximum reach, zero friction.',
      bg: 'linear-gradient(135deg,#f97316,#ef4444)',
    },
  ]

  const steps = [
    { num:'01', title:'Create your account',  desc:'Sign up in minutes, verify your identity, and connect your MetaMask wallet to get started.',             img:'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=400&q=80' },
    { num:'02', title:'Launch your campaign', desc:'Set your funding goal, deadline, and tell your story. Go live on the blockchain instantly.',                img:'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80' },
    { num:'03', title:'Collect funds',        desc:'Backers from around the world fund your campaign with ETH or UPI. Watch your progress in real time.',      img:'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400&q=80' },
    { num:'04', title:'Withdraw & deliver',   desc:'Hit your goal? Withdraw funds instantly. Miss it? Every backer gets an automatic refund.',                  img:'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400&q=80' },
  ]

  const stats = [
    { icon:'🚀', label:'Campaigns Launched', value:'128+' },
    { icon:'⟠',  label:'ETH Raised',          value:'2,400+' },
    { icon:'🌍', label:'Global Backers',      value:'3,800+' },
    { icon:'✅', label:'Success Rate',        value:'74%' },
  ]

  const campaigns = [
    { title:'Solar Community Farm',  category:'Environment', raised:'6.4', goal:'10', pct:64,  backers:142, img:'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500&q=80' },
    { title:'Web3 Coding Bootcamp',  category:'Education',   raised:'5.0', goal:'5',  pct:100, backers:89,  img:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80' },
    { title:'Medical Aid for Rahul', category:'Health',      raised:'1.8', goal:'3',  pct:60,  backers:234, img:'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&q=80' },
  ]

  const faqs = [
    { q:'Do I need crypto to use FundChain?', a:'For ETH campaigns, you need MetaMask and ETH on Sepolia. For fiat campaigns, anyone can donate via UPI or card — no crypto needed.' },
    { q:'What happens if my campaign fails?', a:'If the goal is not met by the deadline, every funder can claim a full refund directly from the smart contract — automatic and trustless.' },
    { q:'Is my money safe?', a:'Funds are held by audited smart contracts on Ethereum. No one — not even us — can access them except through the contract rules.' },
    { q:'Can I accept UPI/card donations?', a:'Yes! When creating a campaign, choose "Fiat" payment type. Donors can pay via UPI, debit/credit card through Stripe — no crypto required.' },
    { q:'What network does FundChain run on?', a:'Currently deployed on Sepolia testnet. Mainnet deployment coming soon. UPI/card campaigns work on production Stripe.' },
    { q:'How do I get verified?', a:'Upload a government-issued ID during registration. Our team reviews it within 1-2 business days. Verified creators get a trust badge.' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'DM Sans', system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        transition:'all .3s',
        background: scrolled ? 'rgba(255,255,255,.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid #f1f0f5' : 'none',
        boxShadow: scrolled ? '0 1px 4px rgba(0,0,0,.06)' : 'none',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem', height:68,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width:36, height:36,
              background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
              borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 3px 10px rgba(124,58,237,.35)',
            }}>
              <span style={{ color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'.85rem', fontWeight:700 }}>FC</span>
            </div>
            <span style={{
              fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem',
              color: scrolled ? '#111' : '#fff',
              transition:'color .3s',
            }}>FundChain</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => navigate('/app')} style={{
              background:'none', border:'none', cursor:'pointer',
              padding:'8px 16px', borderRadius:8,
              fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:500,
              color: scrolled ? '#555' : 'rgba(255,255,255,.8)',
              transition:'all .15s',
            }}>Browse</button>
            <button onClick={() => navigate('/login')} style={{
              background:'none', cursor:'pointer',
              padding:'8px 16px', borderRadius:8,
              fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:600,
              border: scrolled ? '1px solid #e9d5ff' : '1px solid rgba(255,255,255,.3)',
              color: scrolled ? '#7c3aed' : '#fff',
              transition:'all .15s',
            }}>Sign in</button>
            <button onClick={() => navigate('/login')} style={{
              background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
              border:'none', cursor:'pointer',
              padding:'9px 20px', borderRadius:9,
              fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:700,
              color:'#fff', boxShadow:'0 4px 14px rgba(124,58,237,.4)',
            }}>Get started →</button>
          </div>
        </div>
      </nav>

      {/* ── Hero — dark purple (matching screenshots 7-8) ── */}
      <section style={{
        position:'relative', minHeight:'100vh',
        display:'flex', alignItems:'center', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1800&q=85"
            alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(135deg,rgba(76,29,149,.9) 0%,rgba(55,15,90,.85) 50%,rgba(30,10,80,.9) 100%)' }}/>
          <div style={{ position:'absolute', inset:0, opacity:.1,
            backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'40px 40px' }}/>
        </div>

        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'8rem 1.5rem 5rem', width:'100%' }}>
          <div style={{ maxWidth:680 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, marginBottom:'2rem',
              background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,.2)', borderRadius:100, padding:'7px 16px',
            }}>
              <span style={{ width:8, height:8, background:'#4ade80', borderRadius:'50%', animation:'pulse2 2s infinite', display:'inline-block' }}/>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.78rem', color:'rgba(255,255,255,.9)', fontWeight:600, letterSpacing:'.04em' }}>
                Live on Ethereum Sepolia · UPI & Crypto Supported
              </span>
            </div>

            <h1 style={{
              fontFamily:"'DM Serif Display',serif",
              fontSize:'clamp(3rem,7vw,5rem)',
              fontWeight:400, color:'#fff', lineHeight:1.06,
              letterSpacing:'-.02em', marginBottom:'1.5rem',
            }}>
              Fund ideas that
              <span style={{
                display:'block',
                background:'linear-gradient(90deg,#c4b5fd,#a78bfa 50%,#f0abfc)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>change the world</span>
            </h1>

            <p style={{
              fontFamily:"'DM Sans',sans-serif", fontSize:'1.1rem',
              color:'rgba(255,255,255,.65)', lineHeight:1.75,
              maxWidth:520, marginBottom:'2.5rem',
            }}>
              The first crowdfunding platform with blockchain transparency and UPI support.
              Launch campaigns, raise funds, and deliver impact — trustlessly.
            </p>

            <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:'3rem' }}>
              <button onClick={() => navigate('/login')} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'14px 28px', borderRadius:14,
                background:'#fff', color:'#6d28d9',
                fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1rem',
                border:'none', cursor:'pointer',
                boxShadow:'0 8px 24px rgba(0,0,0,.2)',
              }}>
                Start a campaign
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button onClick={() => navigate('/app')} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'14px 28px', borderRadius:14,
                background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,.2)', color:'#fff',
                fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1rem',
                cursor:'pointer',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Browse campaigns
              </button>
            </div>

            <div style={{ display:'flex', gap:'1.75rem', flexWrap:'wrap' }}>
              {['🔒 Smart contract secured','⚡ Instant withdrawals','🔄 Auto refunds','₹ UPI accepted'].map(t => (
                <span key={t} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem', color:'rgba(255,255,255,.55)', fontWeight:500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:1, animation:'bounce 2s infinite' }}>
          <div style={{ width:24, height:40, border:'2px solid rgba(255,255,255,.3)', borderRadius:12,
            display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:6 }}>
            <div style={{ width:4, height:8, background:'rgba(255,255,255,.5)', borderRadius:4, animation:'pulse2 2s infinite' }}/>
          </div>
        </div>
      </section>

      {/* ── Featured campaigns (matching screenshots 9) ── */}
      <section style={{ background:'#f9f8ff', padding:'5rem 1.5rem' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2.5rem', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>
                Featured campaigns
              </p>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2rem', color:'#111', margin:0 }}>
                Making impact right now
              </h2>
            </div>
            <button onClick={() => navigate('/app')} style={{
              display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:700, color:'#7c3aed',
            }}>
              View all campaigns
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.5rem' }}>
            {campaigns.map((c, i) => (
              <div key={i} onClick={() => navigate('/app')}
                style={{
                  background:'#fff', borderRadius:24, overflow:'hidden',
                  border:'1px solid #f0edf8', cursor:'pointer',
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                  transition:'transform .25s, box-shadow .25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'  }}>
                <div style={{ position:'relative', height:200, overflow:'hidden' }}>
                  <img src={c.img} alt={c.title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .5s' }}
                    onMouseEnter={e => e.target.style.transform='scale(1.05)'}
                    onMouseLeave={e => e.target.style.transform='scale(1)'}/>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.5),transparent)' }}/>
                  <span style={{ position:'absolute', top:12, left:12, background:'rgba(255,255,255,.92)', color:'#444',
                    fontFamily:"'DM Sans',sans-serif", fontSize:'.72rem', fontWeight:600, padding:'3px 10px', borderRadius:100 }}>
                    {c.category}
                  </span>
                  {c.pct >= 100 && (
                    <span style={{ position:'absolute', top:12, right:12, background:'#10b981', color:'#fff',
                      fontFamily:"'DM Sans',sans-serif", fontSize:'.72rem', fontWeight:700, padding:'3px 10px', borderRadius:100 }}>
                      ✓ Funded
                    </span>
                  )}
                </div>
                <div style={{ padding:'1.25rem' }}>
                  <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.05rem', color:'#111', marginBottom:'0.75rem', lineHeight:1.3 }}>
                    {c.title}
                  </h3>
                  <div style={{ height:8, background:'#f0edf8', borderRadius:100, overflow:'hidden', marginBottom:'0.75rem' }}>
                    <div style={{
                      height:'100%', width:`${Math.min(c.pct,100)}%`, borderRadius:100,
                      background: c.pct >= 100 ? '#10b981' : 'linear-gradient(90deg,#7c3aed,#6d28d9)',
                    }}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem' }}>
                    <span>
                      <strong style={{ color:'#111' }}>{c.raised} ETH</strong>
                      <span style={{ color:'#888' }}> of {c.goal} ETH</span>
                    </span>
                    <span style={{ fontWeight:700, color:'#7c3aed' }}>{c.pct}%</span>
                  </div>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', color:'#aaa', marginTop:6 }}>{c.backers} backers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats — purple bg (screenshot 10) ── */}
      <section style={{ position:'relative', padding:'6rem 1.5rem', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1800&q=80" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'rgba(76,29,149,.92)' }}/>
        </div>
        <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#c4b5fd', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
              By the numbers
            </p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#fff', margin:0 }}>
              Trusted by thousands
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'1.25rem' }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                textAlign:'center', background:'rgba(255,255,255,.1)',
                backdropFilter:'blur(10px)', borderRadius:24, padding:'2.25rem 1.5rem',
                border:'1px solid rgba(255,255,255,.12)',
              }}>
                <div style={{ fontSize:'2.25rem', marginBottom:12 }}>{s.icon}</div>
                <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#fff', margin:'0 0 6px', lineHeight:1 }}>{s.value}</p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem', color:'rgba(196,181,253,.8)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — white (screenshots 11-12) ── */}
      <section style={{ padding:'6rem 1.5rem', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
              Why FundChain
            </p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#111', marginBottom:'1rem', margin:0 }}>
              Built different. Built better.
            </h2>
            <p style={{ fontFamily:"'DM Sans',sans-serif", color:'#666', fontSize:'1.05rem', maxWidth:500, margin:'1rem auto 0' }}>
              Combining the transparency of blockchain with the accessibility of traditional payments.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:'1.5rem' }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background:'#fff', border:'1px solid #f1eef9', borderRadius:24, padding:'1.75rem',
                transition:'all .25s', cursor:'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#f1eef9';    e.currentTarget.style.boxShadow='none' }}>
                <div style={{
                  width:48, height:48, borderRadius:14, marginBottom:'1.25rem',
                  background:f.bg, display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', boxShadow:'0 4px 14px rgba(0,0,0,.2)',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.1rem', color:'#111', marginBottom:'.6rem' }}>{f.title}</h3>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', color:'#666', lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — gray bg (screenshot 13) ── */}
      <section style={{ padding:'6rem 1.5rem', background:'#f9f8ff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
              Simple process
            </p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#111', margin:0 }}>
              From idea to funded in 4 steps
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'1.5rem' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ position:'relative' }}>
                <div style={{
                  background:'#fff', borderRadius:24, overflow:'hidden',
                  border:'1px solid #f1eef9', boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                }}>
                  <div style={{ height:180, overflow:'hidden', position:'relative' }}>
                    <img src={s.img} alt={s.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.6),transparent)' }}/>
                    <span style={{
                      position:'absolute', bottom:14, left:16,
                      fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem',
                      color:'rgba(255,255,255,.28)', lineHeight:1,
                    }}>{s.num}</span>
                  </div>
                  <div style={{ padding:'1.25rem 1.5rem 1.5rem' }}>
                    <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.05rem', color:'#111', marginBottom:'.5rem' }}>{s.title}</h3>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.85rem', color:'#666', lineHeight:1.7, margin:0 }}>{s.desc}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    display:'none', // shown via media query for large screens
                    position:'absolute', top:70, right:-16, zIndex:10,
                    width:32, height:32, borderRadius:'50%',
                    background:'#ede9fe', alignItems:'center', justifyContent:'center',
                  }} className="step-arrow">
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

      {/* ── Testimonial — dark photo (screenshot 14) ── */}
      <section style={{ position:'relative', padding:'5rem 1.5rem', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1800&q=80" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(10,5,30,.95) 0%,rgba(10,5,30,.65) 100%)' }}/>
        </div>
        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto' }}>
          <div style={{ maxWidth:640 }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#a78bfa', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
              Real stories
            </p>
            <blockquote style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.4rem,3vw,2rem)', color:'#fff', lineHeight:1.45, marginBottom:'1.75rem' }}>
              "FundChain helped me raise ₹4.2 lakhs for my daughter's surgery in just 11 days.
              The transparency gave donors confidence to give."
            </blockquote>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{
                width:48, height:48, borderRadius:'50%',
                background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'DM Sans',sans-serif", fontSize:'1.1rem', fontWeight:700, color:'#fff',
              }}>R</div>
              <div>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, color:'#fff', margin:0 }}>Rajesh Sharma</p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', color:'#9ca3af', margin:0 }}>Campaign creator · Health category</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ — white (screenshot 15) ── */}
      <section style={{ padding:'6rem 1.5rem', background:'#fff' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
              FAQ
            </p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#111', marginBottom:'.75rem', margin:0 }}>
              Got questions?
            </h2>
            <p style={{ fontFamily:"'DM Sans',sans-serif", color:'#888', marginTop:'.75rem' }}>Everything you need to know about FundChain.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                border: openFaq === i ? '1px solid #e9d5ff' : '1px solid #f1f1f1',
                borderRadius:18, overflow:'hidden',
                boxShadow: openFaq === i ? '0 4px 16px rgba(124,58,237,.08)' : 'none',
                transition:'all .2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'1.25rem 1.5rem', background:'none', border:'none', cursor:'pointer', textAlign:'left',
                }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:600, color:'#111', fontSize:'.95rem' }}>{faq.q}</span>
                  <span style={{
                    flexShrink:0, width:26, height:26, borderRadius:'50%',
                    background: openFaq === i ? '#7c3aed' : '#f1f1f1',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: openFaq === i ? '#fff' : '#666',
                    marginLeft:12, transition:'all .2s',
                    transform: openFaq === i ? 'rotate(45deg)' : 'none',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding:'0 1.5rem 1.25rem' }}>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.9rem', color:'#666', lineHeight:1.75, margin:0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA — dark purple (screenshot 16) ── */}
      <section style={{ position:'relative', padding:'7rem 1.5rem', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1800&q=80" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(76,29,149,.96),rgba(55,15,90,.92),rgba(30,10,80,.96))' }}/>
          <div style={{ position:'absolute', inset:0, opacity:.08,
            backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'32px 32px' }}/>
        </div>
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:700, margin:'0 auto' }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', fontWeight:700, color:'#c4b5fd', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
            Ready to begin?
          </p>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(2.5rem,5vw,4rem)', color:'#fff', lineHeight:1.1, marginBottom:'1.5rem' }}>
            Your campaign is one<br/>
            <span style={{
              background:'linear-gradient(90deg,#c4b5fd,#f0abfc)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>click away</span>
          </h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'1.05rem', color:'rgba(255,255,255,.55)', maxWidth:480, margin:'0 auto 2.5rem' }}>
            Join thousands of creators who have raised funds for causes that matter.
            No approval needed. No gatekeepers. Just you and your backers.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/login')} style={{
              padding:'14px 36px', borderRadius:14, border:'none', cursor:'pointer',
              background:'#fff', color:'#7c3aed',
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1.05rem',
              boxShadow:'0 8px 30px rgba(0,0,0,.25)',
            }}>
              Create free account →
            </button>
            <button onClick={() => navigate('/admin-login')} style={{
              padding:'14px 36px', borderRadius:14, cursor:'pointer',
              background:'rgba(255,255,255,.08)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,.2)', color:'#fff',
              fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:'1.05rem',
            }}>
              Admin login
            </button>
          </div>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', color:'rgba(255,255,255,.3)', marginTop:'1.5rem' }}>
            No credit card required · Free to create campaigns
          </p>
        </div>
      </section>

      {/* ── Footer (screenshot 16 bottom) ── */}
      <footer style={{ background:'#030712', padding:'3.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'2rem', marginBottom:'2.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:36, height:36, background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <span style={{ color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'.85rem', fontWeight:700 }}>FC</span>
              </div>
              <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.2rem', color:'#fff' }}>FundChain</span>
            </div>
            <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>
              {[['Browse','/app'],['Sign in','/login'],['Register','/register'],['Admin','/admin-login']].map(([label,path]) => (
                <button key={label} onClick={() => navigate(path)} style={{
                  background:'none', border:'none', cursor:'pointer', padding:0,
                  fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:500,
                  color:'#6b7280', transition:'color .15s',
                }}
                onMouseEnter={e => e.target.style.color='#fff'}
                onMouseLeave={e => e.target.style.color='#6b7280'}>
                  {label}
                </button>
              ))}
              <a href="https://github.com" target="_blank" rel="noreferrer" style={{
                display:'flex', alignItems:'center', gap:6,
                fontFamily:"'DM Sans',sans-serif", fontSize:'.875rem', fontWeight:500,
                color:'#6b7280', textDecoration:'none', transition:'color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color='#fff'}
              onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <div style={{ borderTop:'1px solid #1f2937', paddingTop:'1.5rem',
            display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', color:'#4b5563', margin:0 }}>
              © 2026 FundChain. Built on Ethereum. Powered by transparency.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:8, height:8, background:'#4ade80', borderRadius:'50%', animation:'pulse2 2s infinite', display:'inline-block' }}/>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.75rem', color:'#6b7280', fontWeight:500 }}>
                Sepolia Testnet · Live
              </span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-8px)} }
        @media(min-width:1024px){.step-arrow{display:flex!important}}
      `}</style>
    </div>
  )
}

export default LandingPage
