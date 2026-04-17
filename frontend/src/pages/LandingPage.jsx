import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LandingPage = () => {
  const navigate  = useNavigate()
  const [openFaq, setOpenFaq]   = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenu])

  const features = [
    { icon:'🔗', title:'Blockchain Secured', desc:'Every transaction immutably recorded on Ethereum. Transparent and verifiable.' },
    { icon:'👥', title:'Community Powered', desc:'Real backers, real impact. Connect with thousands of supporters globally.' },
    { icon:'↩️', title:'Auto Refunds', desc:"Goal not met? Funds return automatically to every backer. Code handles it all." },
    { icon:'💳', title:'UPI & Crypto', desc:'Accept ETH via MetaMask or UPI/card payments. Maximum reach, zero friction.' },
  ]

  const steps = [
    { num:'01', title:'Create your account',  desc:'Sign up, verify your identity, and connect MetaMask to get started.' },
    { num:'02', title:'Launch your campaign', desc:'Set your goal, deadline, and story. Go live on the blockchain instantly.' },
    { num:'03', title:'Collect funds',        desc:'Backers worldwide fund your campaign with ETH or UPI in real time.' },
    { num:'04', title:'Withdraw & deliver',   desc:'Hit your goal? Withdraw instantly. Miss it? Automatic full refund.' },
  ]

  const stats = [
    { icon:'🚀', label:'Campaigns Launched', value:'128+' },
    { icon:'⟠',  label:'ETH Raised',         value:'2,400+' },
    { icon:'🌍', label:'Global Backers',     value:'3,800+' },
    { icon:'✅', label:'Success Rate',       value:'74%' },
  ]

  const faqs = [
    { q:'Do I need crypto to use FundChain?', a:'For ETH campaigns, you need MetaMask. For fiat campaigns, anyone can donate via UPI or card — no crypto needed.' },
    { q:'What happens if my campaign fails?', a:'If the goal is not met, every funder can claim a full refund directly from the smart contract — automatic and trustless.' },
    { q:'Is my money safe?', a:'Funds are held by audited smart contracts. No one can access them except through the contract rules.' },
    { q:'Can I accept UPI/card donations?', a:'Yes! Choose "Fiat" payment type when creating a campaign. Donors pay via UPI, debit/credit card through Stripe.' },
    { q:'What network does FundChain run on?', a:'Currently deployed on Sepolia testnet. Mainnet coming soon. UPI/card campaigns use production Stripe.' },
    { q:'How do I get verified?', a:'Upload a government-issued ID during registration. Our team reviews it within 1-2 business days.' },
  ]

  const navStyle = {
    position: 'fixed', top:0, left:0, right:0, zIndex:50,
    height: 68,
    transition: 'all 0.3s ease',
    background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
    borderBottom: scrolled ? '1px solid #f1f0f5' : 'none',
    boxShadow: scrolled ? '0 1px 6px rgba(0,0,0,0.06)' : 'none',
  }

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Poppins', system-ui, sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav style={navStyle}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 clamp(1rem,4vw,1.5rem)', height:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width:36, height:36,
              background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
              borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 3px 10px rgba(124,58,237,.35)',
            }}>
              <span style={{ color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'.85rem', fontWeight:700 }}>FC</span>
            </div>
            <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.15rem', color: scrolled?'#111':'#fff', transition:'color 0.3s' }}>FundChain</span>
          </div>

          {/* Desktop links */}
          <div style={{ display:'none', alignItems:'center', gap:6 }} id="lp-desktop-nav">
            <button onClick={() => navigate('/app')} style={{
              background:'none', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:8,
              fontSize:'.875rem', fontWeight:500, color: scrolled?'#555':'rgba(255,255,255,.8)', transition:'all .15s',
            }}>Browse</button>
            <button onClick={() => navigate('/login')} style={{
              background:'none', cursor:'pointer', padding:'8px 16px', borderRadius:8,
              fontSize:'.875rem', fontWeight:600,
              border: scrolled?'1px solid #e9d5ff':'1px solid rgba(255,255,255,.3)',
              color: scrolled?'#7c3aed':'#fff', transition:'all .15s',
            }}>Sign in</button>
            <button onClick={() => navigate('/login')} style={{
              background:'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', cursor:'pointer',
              padding:'9px 20px', borderRadius:9,
              fontSize:'.875rem', fontWeight:700, color:'#fff',
              boxShadow:'0 4px 14px rgba(124,58,237,.4)',
            }}>Get started →</button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(true)} style={{
            background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
            borderRadius:8, width:38, height:38,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color: scrolled?'#374151':'#fff',
          }} id="lp-hamburger">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenu && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }} onClick={() => setMobileMenu(false)}/>
          <div style={{ position:'relative', width:'min(280px, 85vw)', height:'100%', background:'#fff', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.5rem', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.1rem', color:'#111' }}>FundChain</span>
              <button onClick={() => setMobileMenu(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', padding:4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {[['Browse campaigns', '/app'],['Sign in', '/login'],['Create campaign', '/login']].map(([label,path]) => (
              <button key={label} onClick={() => { navigate(path); setMobileMenu(false) }} style={{
                padding:'12px 16px', borderRadius:10, border:'none',
                background: label==='Create campaign'?'linear-gradient(135deg,#7c3aed,#6d28d9)':'transparent',
                color: label==='Create campaign'?'#fff':'#374151',
                fontFamily:"'Poppins',sans-serif", fontSize:'.875rem', fontWeight:600, cursor:'pointer',
                textAlign:'left', width:'100%',
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ position:'relative', minHeight:'100dvh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1800&q=85" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(76,29,149,.92) 0%,rgba(55,15,90,.85) 50%,rgba(30,10,80,.92) 100%)' }}/>
          {/* Dot grid texture */}
          <div style={{ position:'absolute', inset:0, opacity:.08, backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'36px 36px' }}/>
        </div>

        <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'8rem clamp(1.25rem,4vw,1.5rem) 5rem', width:'100%' }}>
          <div style={{ maxWidth:680 }}>
            {/* Live badge */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, marginBottom:'1.75rem',
              background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,.2)', borderRadius:100, padding:'7px 16px',
            }}>
              <span style={{ width:8, height:8, background:'#4ade80', borderRadius:'50%', animation:'pulse-dot 2s infinite', display:'inline-block' }}/>
              <span style={{ fontSize:'.78rem', color:'rgba(255,255,255,.9)', fontWeight:600, letterSpacing:'.04em' }}>
                Live on Ethereum Sepolia · UPI & Crypto Supported
              </span>
            </div>

            <h1 style={{
              fontFamily:"'DM Serif Display',serif",
              fontSize:'clamp(2.5rem, 7vw, 5rem)',
              fontWeight:400, color:'#fff', lineHeight:1.06, letterSpacing:'-.02em', marginBottom:'1.5rem',
            }}>
              Fund ideas that
              <span style={{ display:'block', background:'linear-gradient(90deg,#c4b5fd,#a78bfa 50%,#f0abfc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                change the world
              </span>
            </h1>

            <p style={{ fontSize:'clamp(.95rem, 2vw, 1.1rem)', color:'rgba(255,255,255,.65)', lineHeight:1.75, maxWidth:520, marginBottom:'2.5rem' }}>
              The first crowdfunding platform with blockchain transparency and UPI support. Launch campaigns, raise funds, and deliver impact — trustlessly.
            </p>

            <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:'3rem' }}>
              <button onClick={() => navigate('/login')} style={{
                display:'flex', alignItems:'center', gap:8, padding:'14px clamp(20px,4vw,28px)', borderRadius:14,
                background:'#fff', color:'#6d28d9',
                fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:'clamp(.875rem, 2vw, 1rem)',
                border:'none', cursor:'pointer', boxShadow:'0 8px 24px rgba(0,0,0,.2)',
              }}>
                Start a campaign →
              </button>
              <button onClick={() => navigate('/app')} style={{
                display:'flex', alignItems:'center', gap:8, padding:'14px clamp(20px,4vw,28px)', borderRadius:14,
                background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,.2)', color:'#fff',
                fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:'clamp(.875rem, 2vw, 1rem)',
                cursor:'pointer',
              }}>
                Browse campaigns
              </button>
            </div>

            {/* Trust tags */}
            <div style={{ display:'flex', gap:'clamp(.75rem, 2vw, 1.75rem)', flexWrap:'wrap' }}>
              {['🔒 Smart contract secured','⚡ Instant withdrawals','🔄 Auto refunds','₹ UPI accepted'].map(t => (
                <span key={t} style={{ fontSize:'.82rem', color:'rgba(255,255,255,.5)', fontWeight:500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ position:'relative', padding:'clamp(3rem,8vw,5rem) clamp(1.25rem,4vw,1.5rem)', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1800&q=80" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'rgba(76,29,149,.92)' }}/>
        </div>
        <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.75rem, 4vw, 2.5rem)', color:'#fff', marginBottom:'2.5rem' }}>Trusted by thousands</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'1rem' }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                textAlign:'center', background:'rgba(255,255,255,.1)', backdropFilter:'blur(10px)',
                borderRadius:24, padding:'clamp(1.5rem, 4vw, 2.25rem) 1.5rem',
                border:'1px solid rgba(255,255,255,.12)',
              }}>
                <div style={{ fontSize:'2rem', marginBottom:10 }}>{s.icon}</div>
                <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.75rem, 4vw, 2.5rem)', color:'#fff', margin:'0 0 6px', lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:'.82rem', color:'rgba(196,181,253,.8)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding:'clamp(3rem,8vw,6rem) clamp(1.25rem,4vw,1.5rem)', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'clamp(2rem,5vw,4rem)' }}>
            <p style={{ fontSize:'.72rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Why FundChain</p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.75rem, 4vw, 2.5rem)', color:'#111', margin:0 }}>
              Built different. Built better.
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'1.25rem' }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background:'#fff', border:'1px solid #f1eef9', borderRadius:24, padding:'1.75rem',
                transition:'all .25s', cursor:'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#f1eef9'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)' }}>
                <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>{f.icon}</div>
                <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.1rem', color:'#111', marginBottom:'.6rem' }}>{f.title}</h3>
                <p style={{ fontSize:'.875rem', color:'#666', lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:'clamp(3rem,8vw,6rem) clamp(1.25rem,4vw,1.5rem)', background:'#f9f8ff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'clamp(2rem,5vw,4rem)' }}>
            <p style={{ fontSize:'.72rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Simple process</p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.75rem, 4vw, 2.5rem)', color:'#111', margin:0 }}>
              From idea to funded in 4 steps
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'1.25rem' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:24, overflow:'hidden', border:'1px solid #f1eef9', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ padding:'1.75rem 1.5rem 1.5rem' }}>
                  <span style={{ display:'inline-block', fontFamily:"'DM Serif Display',serif", fontSize:'2.5rem', color:'#ede9fe', lineHeight:1, marginBottom:'1rem' }}>
                    {s.num}
                  </span>
                  <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.05rem', color:'#111', marginBottom:'.5rem' }}>{s.title}</h3>
                  <p style={{ fontSize:'.85rem', color:'#666', lineHeight:1.7, margin:0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:'clamp(3rem,8vw,6rem) clamp(1.25rem,4vw,1.5rem)', background:'#fff' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'clamp(2rem,5vw,3.5rem)' }}>
            <p style={{ fontSize:'.72rem', fontWeight:700, color:'#7c3aed', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>FAQ</p>
            <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(1.75rem, 4vw, 2.5rem)', color:'#111', margin:0 }}>Got questions?</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{
                border: openFaq===i?'1px solid #e9d5ff':'1px solid #f1f1f1',
                borderRadius:18, overflow:'hidden',
                boxShadow: openFaq===i?'0 4px 16px rgba(124,58,237,.08)':'none',
                transition:'all .2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq===i?null:i)} style={{
                  width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'clamp(.875rem, 3vw, 1.25rem) clamp(1rem, 3vw, 1.5rem)',
                  background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12,
                }}>
                  <span style={{ fontSize:'clamp(.85rem, 2vw, .95rem)', fontWeight:600, color:'#111', fontFamily:"'Poppins',sans-serif" }}>{faq.q}</span>
                  <span style={{
                    flexShrink:0, width:26, height:26, borderRadius:'50%',
                    background: openFaq===i?'#7c3aed':'#f1f1f1',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: openFaq===i?'#fff':'#666',
                    transition:'all .2s', transform: openFaq===i?'rotate(45deg)':'none',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:'0 clamp(1rem, 3vw, 1.5rem) clamp(.875rem, 3vw, 1.25rem)' }}>
                    <p style={{ fontSize:'.875rem', color:'#666', lineHeight:1.75, margin:0, fontFamily:"'Poppins',sans-serif" }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position:'relative', padding:'clamp(4rem,10vw,7rem) clamp(1.25rem,4vw,1.5rem)', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1800&q=80" alt=""
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(76,29,149,.96),rgba(30,10,80,.96))' }}/>
          <div style={{ position:'absolute', inset:0, opacity:.07, backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'32px 32px' }}/>
        </div>
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:700, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(2rem, 5vw, 4rem)', color:'#fff', lineHeight:1.1, marginBottom:'1.5rem' }}>
            Your campaign is one<br/>
            <span style={{ background:'linear-gradient(90deg,#c4b5fd,#f0abfc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>click away</span>
          </h2>
          <p style={{ fontSize:'clamp(.875rem, 2vw, 1.05rem)', color:'rgba(255,255,255,.55)', maxWidth:480, margin:'0 auto 2.5rem' }}>
            Join thousands of creators who have raised funds for causes that matter.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/login')} style={{
              padding:'14px clamp(24px,5vw,36px)', borderRadius:14, border:'none', cursor:'pointer',
              background:'#fff', color:'#7c3aed',
              fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:'clamp(.875rem, 2vw, 1.05rem)',
              boxShadow:'0 8px 30px rgba(0,0,0,.25)',
            }}>Create free account →</button>
            <button onClick={() => navigate('/admin-login')} style={{
              padding:'14px clamp(24px,5vw,36px)', borderRadius:14, cursor:'pointer',
              background:'rgba(255,255,255,.08)', backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,.2)', color:'#fff',
              fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:'clamp(.875rem, 2vw, 1.05rem)',
            }}>Admin login</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#030712', padding:'clamp(2rem, 5vw, 3.5rem) clamp(1.25rem,4vw,1.5rem) 2rem' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'1.5rem', marginBottom:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'#fff', fontFamily:"'DM Serif Display',serif", fontSize:'.8rem' }}>FC</span>
              </div>
              <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.15rem', color:'#fff' }}>FundChain</span>
            </div>
            <div style={{ display:'flex', gap:clamp ? '1.5rem' : '1.5rem', flexWrap:'wrap' }}>
              {[['Browse','/app'],['Sign in','/login'],['Register','/login'],['Admin','/admin-login']].map(([label,path]) => (
                <button key={label} onClick={() => navigate(path)} style={{
                  background:'none', border:'none', cursor:'pointer', padding:0,
                  fontFamily:"'Poppins',sans-serif", fontSize:'.875rem', fontWeight:500,
                  color:'#6b7280', transition:'color .15s',
                }}
                onMouseEnter={e => e.target.style.color='#fff'}
                onMouseLeave={e => e.target.style.color='#6b7280'}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid #1f2937', paddingTop:'1.5rem', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
            <p style={{ fontSize:'.78rem', color:'#4b5563', margin:0 }}>
              © 2026 FundChain. Built on Ethereum. Powered by transparency.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:7, height:7, background:'#4ade80', borderRadius:'50%', animation:'pulse-dot 2s infinite', display:'inline-block' }}/>
              <span style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:500 }}>Sepolia Testnet · Live</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive CSS */}
      <style>{`
        @media (min-width: 640px) {
          #lp-desktop-nav { display: flex !important; }
          #lp-hamburger { display: none !important; }
        }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}

export default LandingPage
