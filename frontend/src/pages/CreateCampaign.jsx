import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import axios from 'axios'
import { useWallet } from '../context/WalletContext'
import { useAuth } from '../context/AuthContext'
import { useIPFS } from '../hooks/useIPFS'
import { CONTRACT_ADDRESS, FACTORY_ABI } from '../utils/constants'
import { getDocumentsForCategory } from '../utils/campaignDocuments'

const STEPS = ['Details', 'Goal & Deadline', 'Image', 'Documents', 'Review']
const API   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function getAuthToken() {
  return localStorage.getItem('admin_token') || null
}

/* ══════════════════════════════════════════════════════
   PAYMENT TYPE SELECTOR
══════════════════════════════════════════════════════ */
const PaymentTypeSelector = ({ onSelect }) => (
  <div style={{ maxWidth: 640, margin: '0 auto' }}>
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        color: 'var(--text-primary)', marginBottom: '.5rem',
      }}>Create a campaign</h1>
      <p style={{ fontSize: '.875rem', color: 'var(--text-muted)' }}>
        First, choose how donors will contribute to your campaign.
      </p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
      {/* ETH */}
      <button onClick={() => onSelect('eth')} className="cc-type-card" style={{ '--card-accent': '#7c3aed', '--card-light': 'rgba(124,58,237,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(124,58,237,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 12.5l8 4.5 8-4.5L12 2z" fill="#7c3aed" opacity=".9"/>
              <path d="M4 12.5L12 17l8-4.5" stroke="#7c3aed" strokeWidth="1.5" fill="none"/>
              <path d="M12 17v5M4 12.5l8 2 8-2" stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity=".5"/>
            </svg>
          </div>
          <div className="cc-radio"/>
        </div>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 .5rem', fontSize: '1rem' }}>
          Crypto (ETH)
        </h3>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 1rem' }}>
          Accept donations in Ethereum via MetaMask. Goal set in ETH. Funds go directly to your wallet on-chain.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['MetaMask', 'Sepolia testnet', 'Goal in ETH'].map(t => (
            <span key={t} className="cc-pill cc-pill-purple">{t}</span>
          ))}
        </div>
      </button>

      {/* UPI */}
      <button onClick={() => onSelect('fiat')} className="cc-type-card" style={{ '--card-accent': '#2563eb', '--card-light': 'rgba(37,99,235,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(37,99,235,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8">
              <rect x="2" y="5" width="20" height="14" rx="3"/>
              <path d="M2 10h20"/><path d="M6 15h4M14 15h4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="cc-radio"/>
        </div>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 .5rem', fontSize: '1rem' }}>
          UPI / Card (₹)
        </h3>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 1rem' }}>
          Accept donations in Indian Rupees via UPI or credit/debit card. Goal set in ₹. Powered by Stripe.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['UPI', 'Credit / Debit card', 'Goal in ₹'].map(t => (
            <span key={t} className="cc-pill cc-pill-blue">{t}</span>
          ))}
        </div>
      </button>
    </div>

    <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--text-subtle)', marginTop: '1.25rem' }}>
      This cannot be changed after the campaign is created.
    </p>
  </div>
)

/* ══════════════════════════════════════════════════════
   PAYMENT TYPE BADGE
══════════════════════════════════════════════════════ */
const PaymentTypeBadge = ({ paymentType, onReset }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', color: 'var(--text-primary)', margin: 0 }}>
      Create a campaign
    </h1>
    <button onClick={onReset} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 'var(--r-full)',
      border: `1px solid ${paymentType === 'eth' ? 'var(--purple-200)' : '#bfdbfe'}`,
      background: paymentType === 'eth' ? 'var(--purple-50)' : '#eff6ff',
      color: paymentType === 'eth' ? 'var(--purple-700)' : '#1d4ed8',
      fontFamily: 'var(--font-sans)', fontSize: '.75rem', fontWeight: 600,
      cursor: 'pointer',
    }}>
      {paymentType === 'eth' ? (
        <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 12.5l8 4.5 8-4.5L12 2z"/></svg> ETH campaign</>
      ) : (
        <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg> UPI / Card campaign</>
      )}
      <span style={{ opacity: .5, marginLeft: 2 }}>✕ change</span>
    </button>
  </div>
)

/* ══════════════════════════════════════════════════════
   STEPPER
══════════════════════════════════════════════════════ */
const Stepper = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
    {STEPS.map((label, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.78rem', fontWeight: 700, transition: 'all .2s',
            background: i < step ? 'var(--purple-600)' : i === step ? 'var(--purple-600)' : 'var(--bg-muted)',
            color: i <= step ? '#fff' : 'var(--text-subtle)',
            boxShadow: i === step ? '0 0 0 4px rgba(124,58,237,0.18)' : 'none',
          }}>
            {i < step ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
            ) : i + 1}
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: '.68rem', marginTop: 5, whiteSpace: 'nowrap',
            color: i === step ? 'var(--purple-600)' : 'var(--text-subtle)',
            fontWeight: i === step ? 600 : 400,
          }}>{label}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div style={{
            flex: 1, height: 2, margin: '0 6px 18px',
            background: i < step ? 'var(--purple-600)' : 'var(--border)',
            borderRadius: 1, transition: 'background .3s',
          }}/>
        )}
      </div>
    ))}
  </div>
)

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const CreateCampaign = () => {
  const navigate = useNavigate()
  const { account, connectWallet, wrongNetwork, switchNetwork } = useWallet()
  const { user } = useAuth()
  const { uploadImage } = useIPFS()

  const [paymentType, setPaymentType]   = useState(null)
  const [step, setStep]                 = useState(0)
  const [txStatus, setTxStatus]         = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile]       = useState(null)
  const [uploadedDocs, setUploadedDocs] = useState({})
  const [docPreviews, setDocPreviews]   = useState({})
  const [form, setForm] = useState({
    title: '', description: '', goal: '', deadline: '', category: 'Technology',
  })
  const [errors, setErrors] = useState({})

  const categories  = ['Technology', 'Environment', 'Education', 'Health', 'Community', 'Arts']
  const isETH  = paymentType === 'eth'
  const isFiat = paymentType === 'fiat'

  const userName     = user?.name     || user?.fullName || ''
  const userUsername = user?.username || user?.userName || ''
  const userEmail    = user?.email    || ''
  const userPhone    = user?.phone    || ''

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleTypeSelect = (type) => { setPaymentType(type); setStep(0); setForm(f => ({ ...f, goal: '' })); setErrors({}) }
  const handleTypeReset  = () =>     { setPaymentType(null); setStep(0); setForm(f => ({ ...f, goal: '' })); setErrors({}) }

  const validateStep = () => {
    const e = {}
    if (step === 0) {
      if (!form.title.trim())           e.title = 'Title is required.'
      if (form.title.length > 80)       e.title = 'Title must be under 80 characters.'
      if (!form.description.trim())     e.description = 'Description is required.'
      if (form.description.length < 50) e.description = 'Description must be at least 50 characters.'
    }
    if (step === 1) {
      if (!form.goal || parseFloat(form.goal) <= 0)
        e.goal = isETH ? 'Enter a valid goal in ETH.' : 'Enter a valid goal in ₹.'
      if (isFiat && parseFloat(form.goal) < 100)
        e.goal = 'Minimum goal is ₹100.'
      if (!form.deadline) e.deadline = 'Select a deadline.'
      else if (new Date(form.deadline) <= new Date()) e.deadline = 'Deadline must be in the future.'
    }
    if (step === 3) {
      const config = getDocumentsForCategory(form.category)
      if (config) {
        const missing = config.documents.filter(d => d.required && !uploadedDocs[d.id])
        if (missing.length) e.documents = `Upload required docs: ${missing.map(d => d.name).join(', ')}`
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErrors({ image: 'Image must be under 5MB.' }); return }
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  const handleDocFile = (docId, e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadedDocs(p => ({ ...p, [docId]: file }))
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setDocPreviews(p => ({ ...p, [docId]: { type: 'image', url: ev.target.result } }))
      reader.readAsDataURL(file)
    } else {
      setDocPreviews(p => ({ ...p, [docId]: { type: 'file', name: file.name } }))
    }
    setErrors(p => ({ ...p, documents: '' }))
  }

  const removeDoc = (docId) => {
    const d = { ...uploadedDocs }; delete d[docId]
    const p = { ...docPreviews  }; delete p[docId]
    setUploadedDocs(d); setDocPreviews(p)
  }

  const uploadDocumentsToBackend = async (campaignId) => {
    if (!Object.keys(uploadedDocs).length) return
    const token = getAuthToken(); if (!token) return
    try {
      const fd = new FormData()
      Object.entries(uploadedDocs).forEach(([id, file]) => fd.append(id, file))
      await axios.post(`${API}/campaigns/${campaignId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      })
    } catch (err) { console.warn('Doc upload failed:', err.message) }
  }

  const ownerPayload = () => ({ ownerName: userName, ownerUsername: userUsername, ownerEmail: userEmail, ownerPhone: userPhone })

  const handleSubmitETH = async () => {
    if (!account) { connectWallet(); return }
    if (wrongNetwork) { switchNetwork(); return }
    setTxStatus('uploading')
    try {
      let imageHash = ''
      if (imageFile) imageHash = await uploadImage(imageFile)
      setTxStatus('pending')
      const provider   = new ethers.BrowserProvider(window.ethereum)
      const _signer    = await provider.getSigner()
      const factory    = new ethers.Contract(CONTRACT_ADDRESS, FACTORY_ABI, _signer)
      const deadlineTs = Math.floor(new Date(form.deadline).getTime() / 1000)
      const tx         = await factory.createCampaign(form.title, form.description, imageHash, ethers.parseEther(form.goal), deadlineTs)
      const receipt    = await tx.wait()
      const event      = receipt.logs.find(l => l.fragment?.name === 'CampaignCreated')
      if (event) {
        try {
          const { data } = await axios.post(`${API}/campaigns`, {
            contractAddress: event.args.campaignAddress,
            factoryIndex: Number(event.args.index),
            owner: account, ...ownerPayload(),
            title: form.title, description: form.description, imageHash,
            category: form.category, goal: form.goal, deadline: deadlineTs,
            txHash: receipt.hash, paymentType: 'eth',
          })
          const campaignId = data?._id || data?.data?._id
          if (campaignId) await uploadDocumentsToBackend(campaignId)
        } catch(e) { console.warn('Backend save failed:', e.message) }
      }
      setTxStatus('success')
      setTimeout(() => navigate('/app'), 2500)
    } catch(err) { console.error(err); setTxStatus('error'); setTimeout(() => setTxStatus(null), 4000) }
  }

  const handleSubmitFiat = async () => {
    setTxStatus('uploading')
    try {
      let imageHash = ''
      if (imageFile) imageHash = await uploadImage(imageFile)
      setTxStatus('pending')
      const deadlineTs    = Math.floor(new Date(form.deadline).getTime() / 1000)
      const pseudoAddress = `0xfiat_${(account||'nowal').toLowerCase().slice(2,10)}_${Date.now()}`
      const { data } = await axios.post(`${API}/campaigns`, {
        contractAddress: pseudoAddress, factoryIndex: null,
        owner: account || 'unknown', ...ownerPayload(),
        title: form.title, description: form.description, imageHash,
        category: form.category, goal: parseFloat(form.goal), deadline: deadlineTs,
        txHash: '', paymentType: 'fiat',
      })
      const campaignId = data?._id || data?.data?._id
      if (campaignId) await uploadDocumentsToBackend(campaignId)
      setTxStatus('success')
      setTimeout(() => navigate('/app'), 2500)
    } catch(err) { console.error(err); setTxStatus('error'); setTimeout(() => setTxStatus(null), 4000) }
  }

  const handleSubmit = () => isETH ? handleSubmitETH() : handleSubmitFiat()
  const deadlineMin  = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  /* ── Wallet guards ── */
  if (isETH && !account) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Connect your wallet to create an ETH campaign.</p>
      <button onClick={connectWallet} className="btn btn-primary">Connect wallet</button>
    </div>
  )
  if (isETH && wrongNetwork) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Please switch to Sepolia Test Network.</p>
      <button onClick={switchNetwork} style={{ background: '#ef4444' }} className="btn">Switch to Sepolia</button>
    </div>
  )

  /* ── Type selector ── */
  if (!paymentType) return (
    <>
      <style>{CC_STYLES}</style>
      <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: '4rem' }}>
        <button onClick={() => navigate(-1)} className="cc-back-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <PaymentTypeSelector onSelect={handleTypeSelect}/>
      </div>
    </>
  )

  return (
    <>
      <style>{CC_STYLES}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: '4rem' }}>
        <button onClick={() => navigate(-1)} className="cc-back-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>

        <PaymentTypeBadge paymentType={paymentType} onReset={handleTypeReset}/>
        <Stepper step={step}/>

        {/* ── STEP 0: Details ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="cc-field">
              <label className="cc-label">Campaign title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="A clear, descriptive title" className="cc-input"/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {errors.title ? <span className="cc-error">{errors.title}</span> : <span/>}
                <span style={{ fontSize: '.72rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>{form.title.length}/80</span>
              </div>
            </div>

            <div className="cc-field">
              <label className="cc-label">Description</label>
              <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Tell people what you're building and why it matters (min. 50 characters)"
                className="cc-textarea"/>
              {errors.description && <span className="cc-error">{errors.description}</span>}
            </div>

            <div className="cc-field">
              <label className="cc-label">Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => set('category', cat)} style={{
                    padding: '7px 16px', borderRadius: 'var(--r-full)',
                    border: `1.5px solid ${form.category === cat ? 'var(--purple-600)' : 'var(--border)'}`,
                    background: form.category === cat ? 'var(--purple-600)' : 'var(--bg-muted)',
                    color: form.category === cat ? '#fff' : 'var(--text-muted)',
                    fontFamily: 'var(--font-sans)', fontSize: '.82rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all .15s', minHeight: 36,
                  }}>{cat}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Goal & Deadline ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="cc-field">
              <label className="cc-label">Funding goal {isETH ? '(ETH)' : '(₹ INR)'}</label>
              <div style={{ position: 'relative' }}>
                {isFiat && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>}
                <input type="number" min={isETH ? '0.001' : '100'} step={isETH ? '0.001' : '1'}
                  value={form.goal} onChange={e => set('goal', e.target.value)}
                  placeholder={isETH ? 'e.g. 0.5' : 'e.g. 50000'}
                  className="cc-input"
                  style={{ paddingLeft: isFiat ? 28 : 14, paddingRight: 56 }}/>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {isETH ? 'ETH' : 'INR'}
                </span>
              </div>
              {errors.goal && <span className="cc-error">{errors.goal}</span>}
            </div>

            <div className="cc-field">
              <label className="cc-label">Deadline</label>
              <input type="date" min={deadlineMin} value={form.deadline}
                onChange={e => set('deadline', e.target.value)} className="cc-input"/>
              {errors.deadline && <span className="cc-error">{errors.deadline}</span>}
            </div>

            <div className={`cc-info-box ${isETH ? 'cc-info-amber' : 'cc-info-blue'}`}>
              {isETH
                ? 'If your goal is met before the deadline, you can withdraw all funds. If not, funders can claim a full refund after the deadline.'
                : 'Donors will pay via UPI or card in Indian Rupees. Funds are collected via Stripe and can be withdrawn once the goal is met.'
              }
            </div>
          </div>
        )}

        {/* ── STEP 2: Image ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="cc-label">Campaign image <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(optional)</span></label>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div className="cc-upload-area" style={{ height: 220, borderColor: imagePreview ? 'var(--purple-400)' : 'var(--border)' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }}/>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--purple-400)" strokeWidth="1.5" style={{ marginBottom: 8 }}>
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: 'var(--text-muted)', margin: 0 }}>Click to upload image</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--text-subtle)', margin: '4px 0 0' }}>PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }}/>
            </label>
            {imagePreview && (
              <button onClick={() => { setImagePreview(null); setImageFile(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-500)', fontFamily: 'var(--font-sans)', fontSize: '.82rem', textAlign: 'left', padding: 0 }}>
                Remove image
              </button>
            )}
            {errors.image && <span className="cc-error">{errors.image}</span>}
          </div>
        )}

        {/* ── STEP 3: Documents ── */}
        {step === 3 && (() => {
          const config = getDocumentsForCategory(form.category)
          if (!config) return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
              No document requirements for this category.
            </div>
          )
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="cc-info-box" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{config.icon}</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '.875rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    {config.label} Campaign — Verification Documents
                  </p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Upload documents to verify your campaign is genuine. Verified campaigns get more donations.
                  </p>
                </div>
              </div>

              {config.documents.map(doc => {
                const preview = docPreviews[doc.id]
                const file    = uploadedDocs[doc.id]
                return (
                  <div key={doc.id} className="cc-doc-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '.875rem', color: 'var(--text-primary)', margin: 0 }}>{doc.name}</p>
                          <span className={doc.required ? 'cc-pill cc-pill-red' : 'cc-pill cc-pill-gray'}>
                            {doc.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.75rem', color: 'var(--text-muted)', margin: 0 }}>{doc.description}</p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: 'var(--text-subtle)', fontStyle: 'italic', margin: '2px 0 0' }}>e.g. {doc.example}</p>
                      </div>
                    </div>
                    {!file ? (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <div className="cc-upload-area" style={{ padding: '1.25rem', height: 'auto' }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="1.5" style={{ marginBottom: 6 }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.82rem', color: 'var(--text-muted)', margin: 0 }}>Click to upload</p>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: 'var(--text-subtle)', margin: '3px 0 0' }}>PDF, JPG, PNG up to 10MB</p>
                        </div>
                        <input type="file" accept={doc.accept} onChange={e => handleDocFile(doc.id, e)} style={{ display: 'none' }}/>
                      </label>
                    ) : (
                      <div style={{
                        border: '1px solid #bbf7d0', background: 'var(--teal-50)',
                        borderRadius: 12, padding: '10px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {preview?.type === 'image' ? (
                            <img src={preview.url} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}/>
                          ) : (
                            <div style={{ width: 40, height: 40, background: '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal-600)" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            </div>
                          )}
                          <div>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.82rem', fontWeight: 600, color: 'var(--teal-700)', margin: '0 0 2px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {file.name}
                            </p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.72rem', color: 'var(--teal-600)', margin: 0 }}>
                              {(file.size / 1024).toFixed(1)} KB · Ready ✓
                            </p>
                          </div>
                        </div>
                        <button onClick={() => removeDoc(doc.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-sans)', fontSize: '.75rem', fontWeight: 600,
                          color: 'var(--error-500)', padding: '4px 8px', borderRadius: 6,
                        }}>Remove</button>
                      </div>
                    )}
                  </div>
                )
              })}

              {errors.documents && (
                <div className="cc-info-box cc-info-error">⚠ {errors.documents}</div>
              )}
              <div className="cc-info-box cc-info-amber" style={{ fontSize: '.78rem' }}>
                🔒 Documents are reviewed by admins only and never shown publicly.
                Your campaign will be marked as <strong>pending verification</strong> until approved.
              </div>
            </div>
          )
        })()}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {txStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{ width: 64, height: 64, background: 'var(--teal-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal-600)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '.5rem' }}>Campaign created!</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Your documents have been submitted for admin review.</p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '.78rem', color: 'var(--text-subtle)' }}>Redirecting to home…</p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="cc-review-card">
                  {[
                    ['Payment type', isETH ? '◆ ETH / Crypto' : '💳 UPI / Card (₹)'],
                    userName     && ['Creator',   userName],
                    userUsername && ['Username',  `@${userUsername}`],
                    ['Title',     form.title],
                    ['Category',  form.category],
                    ['Goal',      isETH ? `${form.goal} ETH` : `₹${Number(form.goal).toLocaleString('en-IN')}`],
                    ['Deadline',  new Date(form.deadline).toLocaleDateString()],
                    ['Image',     imageFile ? imageFile.name : 'None'],
                    ['Documents', `${Object.keys(uploadedDocs).length} uploaded`],
                    account && ['Wallet', account],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--border-light)', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                      <span style={{
                        fontFamily: label === 'Wallet' ? 'monospace' : 'var(--font-sans)',
                        fontSize: label === 'Wallet' ? '.72rem' : '.82rem',
                        fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right',
                        maxWidth: 280, wordBreak: 'break-all',
                      }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="cc-info-box cc-info-blue" style={{ fontSize: '.78rem' }}>
                  ℹ Your campaign will be visible immediately but marked as <strong>pending verification</strong> until an admin reviews your documents.
                </div>

                {txStatus === 'error' && (
                  <div className="cc-info-box cc-info-error">
                    {isETH ? 'Transaction failed. Please try again.' : 'Failed to create campaign. Please try again.'}
                  </div>
                )}

                <button onClick={handleSubmit}
                  disabled={txStatus === 'uploading' || txStatus === 'pending'}
                  className="btn btn-primary"
                  style={{ width: '100%', minHeight: 52, fontSize: '.95rem', borderRadius: 14, opacity: (txStatus === 'uploading' || txStatus === 'pending') ? .6 : 1 }}>
                  {txStatus === 'uploading' ? 'Uploading to IPFS…' :
                   txStatus === 'pending'   ? (isETH ? 'Confirming transaction…' : 'Creating campaign…') :
                   isETH                   ? '🚀 Deploy campaign' : '🚀 Create campaign'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Nav buttons ── */}
        {txStatus !== 'success' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={back} disabled={step === 0} className="btn btn-secondary" style={{ opacity: step === 0 ? .4 : 1 }}>
              ← Back
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={next} className="btn btn-primary">
                Continue →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Styles ── */
const CC_STYLES = `
  .cc-back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer;
    font-family: var(--font-sans); font-size: .875rem;
    color: var(--text-muted); padding: 4px 0; margin-bottom: 1.25rem;
    transition: color .15s;
  }
  .cc-back-btn:hover { color: var(--text-primary); }

  .cc-type-card {
    text-align: left; cursor: pointer;
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 20px; padding: 1.5rem;
    transition: all .2s; position: relative;
    font-family: var(--font-sans);
  }
  .cc-type-card:hover {
    border-color: var(--card-accent, var(--purple-600));
    box-shadow: 0 8px 24px rgba(0,0,0,.1);
    transform: translateY(-2px);
  }
  .cc-radio {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid var(--border); background: var(--bg-muted);
    transition: all .15s; flex-shrink: 0;
  }
  .cc-type-card:hover .cc-radio {
    border-color: var(--card-accent, var(--purple-600));
    background: var(--card-accent, var(--purple-600));
    box-shadow: inset 0 0 0 4px var(--bg-card);
  }

  .cc-pill {
    font-family: var(--font-sans); font-size: .68rem; font-weight: 600;
    padding: 2px 9px; border-radius: var(--r-full);
  }
  .cc-pill-purple { background: rgba(124,58,237,.1); color: var(--purple-600); }
  .cc-pill-blue   { background: rgba(37,99,235,.1);  color: #2563eb; }
  .cc-pill-red    { background: var(--error-50);     color: var(--error-700); }
  .cc-pill-gray   { background: var(--bg-muted);     color: var(--text-muted); }

  .cc-label {
    display: block; font-family: var(--font-sans);
    font-size: .82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: .375rem;
  }
  .cc-field { display: flex; flex-direction: column; }

  .cc-input {
    width: 100%; padding: 11px 14px; box-sizing: border-box;
    background: var(--bg-muted); border: 1.5px solid var(--border);
    border-radius: 12px; font-family: var(--font-sans);
    font-size: .9rem; color: var(--text-primary); outline: none;
    transition: all .18s; min-height: 46px;
  }
  .cc-input::placeholder { color: var(--text-subtle); }
  .cc-input:focus {
    border-color: var(--purple-500); background: var(--bg-card);
    box-shadow: 0 0 0 3px rgba(124,58,237,.1);
  }

  .cc-textarea {
    width: 100%; padding: 11px 14px; box-sizing: border-box;
    background: var(--bg-muted); border: 1.5px solid var(--border);
    border-radius: 12px; font-family: var(--font-sans);
    font-size: .9rem; color: var(--text-primary); outline: none;
    transition: all .18s; resize: none;
  }
  .cc-textarea::placeholder { color: var(--text-subtle); }
  .cc-textarea:focus {
    border-color: var(--purple-500); background: var(--bg-card);
    box-shadow: 0 0 0 3px rgba(124,58,237,.1);
  }

  .cc-error {
    font-family: var(--font-sans); font-size: .75rem; color: var(--error-500);
    margin-top: 4px;
  }

  .cc-upload-area {
    border: 2px dashed var(--border); border-radius: 14px;
    background: var(--bg-muted); display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    transition: all .18s; width: 100%;
  }
  .cc-upload-area:hover {
    border-color: var(--purple-400); background: rgba(124,58,237,.04);
  }

  .cc-info-box {
    font-family: var(--font-sans); font-size: .82rem; line-height: 1.65;
    padding: .875rem 1rem; border-radius: 12px;
    background: var(--bg-muted); border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .cc-info-amber {
    background: var(--warning-50); border-color: #fde68a; color: #92400e;
  }
  .cc-info-blue {
    background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8;
  }
  .cc-info-error {
    background: var(--error-50); border-color: #fecaca; color: var(--error-700);
  }

  .cc-doc-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 14px; padding: 1rem;
  }

  .cc-review-card {
    background: var(--bg-muted); border: 1px solid var(--border);
    border-radius: 16px; padding: 1.125rem;
  }
  .cc-review-card > div:last-child { border-bottom: none !important; }

  /* Dark mode adjustments */
  [data-theme="dark"] .cc-info-amber { background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.2); color: #fbbf24; }
  [data-theme="dark"] .cc-info-blue  { background: rgba(37,99,235,.1);  border-color: rgba(37,99,235,.2);  color: #93c5fd; }
  [data-theme="dark"] .cc-pill-purple { background: rgba(124,58,237,.2); }
  [data-theme="dark"] .cc-pill-blue   { background: rgba(37,99,235,.2); }
`

export default CreateCampaign
