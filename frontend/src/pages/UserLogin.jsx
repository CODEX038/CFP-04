import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useWallet } from "../context/WalletContext"
import { useAuth } from "../context/AuthContext"

const API = import.meta.env.VITE_API_URL

/* ══════════════════════════════════════════════════════════════
   OTP INPUT BOXES
══════════════════════════════════════════════════════════════ */
function OtpBoxes({ value, onChange, disabled }) {
  const vals = (value + "      ").slice(0, 6).split("")
  const refs = useRef([])

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1)
    const next = [...vals]; next[i] = digit
    onChange(next.join("").trimEnd())
    if (digit && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !vals[i]?.trim() && i > 0)
      refs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    onChange(pasted)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div style={{ display:"flex", gap:10, justifyContent:"center" }} onPaste={handlePaste}>
      {vals.map((v, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={v.trim()} disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={{
            width:46, height:54, textAlign:"center",
            fontSize:"1.25rem", fontWeight:700,
            fontFamily:"var(--font-sans)",
            border:`2px solid ${v.trim() ? "var(--purple-600)" : "#e5e7eb"}`,
            borderRadius:12, outline:"none",
            background: v.trim() ? "var(--purple-50)" : "#fff",
            color:"#111827", transition:"all .15s",
            opacity: disabled ? .5 : 1,
          }}
          onFocus={e => { if (!v.trim()) e.target.style.borderColor = "var(--purple-400)" }}
          onBlur={e  => { if (!v.trim()) e.target.style.borderColor = "#e5e7eb" }}
        />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   RESEND BUTTON
══════════════════════════════════════════════════════════════ */
function ResendBtn({ onResend, disabled }) {
  const [secs, setSecs] = useState(60)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const handle = async () => {
    if (secs > 0 || busy || disabled) return
    setBusy(true)
    try { await onResend?.() } finally { setBusy(false); setSecs(60) }
  }

  return (
    <p style={{ textAlign:"center", fontFamily:"var(--font-sans)", fontSize:".8rem", color:"#9ca3af", margin:0 }}>
      {secs > 0
        ? <>Resend code in <strong style={{ color:"#6b7280" }}>{secs}s</strong></>
        : <button onClick={handle} disabled={busy || disabled} style={{
            background:"none", border:"none", cursor:"pointer",
            color:"var(--purple-600)", fontWeight:600, textDecoration:"underline",
            fontSize:".8rem", fontFamily:"var(--font-sans)",
          }}>{busy ? "Sending…" : "Resend OTP"}</button>
      }
    </p>
  )
}

/* ══════════════════════════════════════════════════════════════
   STEP INDICATOR
══════════════════════════════════════════════════════════════ */
function StepIndicator({ labelIdx }) {
  const LABELS = ["Basic info", "Personal", "Documents"]
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:"1.75rem" }}>
      {LABELS.map((lbl, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", flex: i < 2 ? 1 : "none" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:".78rem", fontWeight:700,
              transition:"all .2s",
              background: i < labelIdx ? "var(--purple-600)" : i === labelIdx ? "var(--purple-600)" : "#f3f4f6",
              color: i <= labelIdx ? "#fff" : "#9ca3af",
              boxShadow: i === labelIdx ? "0 0 0 4px #ede9fe" : "none",
            }}>
              {i < labelIdx
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                : i + 1
              }
            </div>
            <span style={{
              fontFamily:"var(--font-sans)", fontSize:".72rem", marginTop:5,
              color: i === labelIdx ? "var(--purple-600)" : "#9ca3af",
              fontWeight: i === labelIdx ? 600 : 400,
            }}>{lbl}</span>
          </div>
          {i < 2 && (
            <div style={{
              flex:1, height:2, margin:"0 8px 16px",
              background: i < labelIdx ? "var(--purple-600)" : "#e5e7eb",
              borderRadius:1, transition:"background .3s",
            }}/>
          )}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SHARED INPUT COMPONENT
══════════════════════════════════════════════════════════════ */
function Input({ type = "text", value, onChange, placeholder, onKeyDown, max, disabled, autoComplete }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} onKeyDown={onKeyDown}
      max={max} disabled={disabled} autoComplete={autoComplete}
      style={{
        width:"100%", padding:"12px 14px", boxSizing:"border-box",
        fontFamily:"var(--font-sans)", fontSize:".9rem", color:"#111827",
        background:"#f9fafb", border:"1.5px solid #e5e7eb",
        borderRadius:12, outline:"none", transition:"border-color .15s, background .15s",
        minHeight:44,
        opacity: disabled ? .6 : 1,
      }}
      onFocus={e => { e.target.style.borderColor="var(--purple-500)"; e.target.style.background="#fff" }}
      onBlur={e  => { e.target.style.borderColor="#e5e7eb"; e.target.style.background="#f9fafb" }}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const UserLogin = () => {
  const { account, connectWallet, isConnecting } = useWallet()
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]       = useState("login")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState("")
  const [step,    setStep]    = useState(0)

  const [photoPreview, setPhotoPreview] = useState(null)
  const [docPreview,   setDocPreview]   = useState(null)
  const [emailOtp,     setEmailOtp]     = useState("")
  const [phoneOtp,     setPhoneOtp]     = useState("")
  const [otpLoading,   setOtpLoading]   = useState(false)

  const [loginForm, setLoginForm] = useState({ email:"", password:"" })
  const [reg, setReg] = useState({
    name:"", username:"", email:"", password:"", confirm:"",
    phone:"", dob:"", location:"",
    profilePhotoFile:null, documentType:"", documentFile:null,
  })

  const emailOtpSent = useRef(false)
  const accountCreated = useRef(false) // prevent double-registration

  /* ── Clear messages when changing tab or step ── */
  const switchTab = (t) => {
    setTab(t); setError(""); setSuccess("")
    setStep(0); setEmailOtp(""); setPhoneOtp("")
    accountCreated.current = false
  }

  const setL = (k, v) => setLoginForm(f => ({ ...f, [k]: v }))
  const setR = (k, v) => setReg(f => ({ ...f, [k]: v }))
  const clear = () => { setError(""); setSuccess("") }

  /* Step → label index mapping */
  const labelIdx = step <= 1 ? 0 : step <= 3 ? 1 : 2

  /* ── Validation ── */
  const validateBasic = () => {
    if (!reg.name.trim())       { setError("Full name is required."); return false }
    if (!reg.username.trim())   { setError("Username is required."); return false }
    if (!reg.email || !/^\S+@\S+\.\S+$/.test(reg.email)) { setError("Valid email is required."); return false }
    if (!reg.password || reg.password.length < 6) { setError("Password must be at least 6 characters."); return false }
    if (reg.password !== reg.confirm) { setError("Passwords do not match."); return false }
    return true
  }

  const validatePersonal = () => {
    if (!reg.phone.trim())    { setError("Phone number is required."); return false }
    if (!reg.dob)             { setError("Date of birth is required."); return false }
    if (!reg.location.trim()) { setError("Location is required."); return false }
    return true
  }

  /* ── OTP: Send email OTP ── */
  const sendEmailOtp = async () => {
    setOtpLoading(true); clear(); emailOtpSent.current = false
    try {
      const res  = await fetch(`${API}/verification/send-email-otp`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email: reg.email.trim(), registration:true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send OTP.")
      setSuccess(`Verification code sent to ${reg.email}`)
      emailOtpSent.current = true
    } catch(e) { setError(e.message) }
    finally { setOtpLoading(false) }
  }

  /* ── OTP: Verify email OTP ── */
  const verifyEmailOtp = async () => {
    const code = emailOtp.replace(/\s/g, "")
    if (code.length < 6) { setError("Enter the full 6-digit code."); return }
    setOtpLoading(true); clear()
    try {
      const res  = await fetch(`${API}/verification/verify-email-otp`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email: reg.email.trim(), otp:code, registration:true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Verification failed.")
      setSuccess("Email verified ✓")
      setEmailOtp("")
      setStep(2)
    } catch(e) { setError(e.message) }
    finally { setOtpLoading(false) }
  }

  /* ── Create account (only once) ── */
  const createAccount = async () => {
    if (accountCreated.current) return localStorage.getItem("token")

    const fd = new FormData()
    fd.append("name",     reg.name.trim())
    fd.append("username", reg.username.trim())
    fd.append("email",    reg.email.trim())
    fd.append("password", reg.password)
    fd.append("phone",    reg.phone.trim())
    fd.append("dob",      reg.dob)
    fd.append("location", reg.location.trim())
    if (reg.profilePhotoFile) fd.append("profilePhoto", reg.profilePhotoFile)

    const res  = await fetch(`${API}/auth/register`, { method:"POST", body:fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Registration failed.")

    localStorage.setItem("token", data.token)
    accountCreated.current = true
    return data.token
  }

  /* ── OTP: Send phone OTP ── */
  const sendPhoneOtp = async () => {
    setOtpLoading(true); clear()
    try {
      const res  = await fetch(`${API}/verification/send-phone-otp`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ phone: reg.phone.trim(), email: reg.email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send SMS.")
      setSuccess(`SMS code sent to ${reg.phone}`)
    } catch(e) { setError(e.message) }
    finally { setOtpLoading(false) }
  }

  /* ── OTP: Verify phone OTP ── */
  const verifyPhoneOtp = async () => {
    const code = phoneOtp.replace(/\s/g, "")
    if (code.length < 6) { setError("Enter the full 6-digit code."); return }
    setOtpLoading(true); clear()
    try {
      const res  = await fetch(`${API}/verification/verify-phone-otp`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ phone: reg.phone.trim(), otp:code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Verification failed.")
      setSuccess("Phone verified ✓")
      setPhoneOtp("")
      setStep(4)
    } catch(e) { setError(e.message) }
    finally { setOtpLoading(false) }
  }

  /* ── Step handlers ── */
  const handleContinueBasic = async () => {
    clear()
    if (!validateBasic()) return
    await sendEmailOtp()
    if (emailOtpSent.current) setStep(1)
  }

  const handleContinuePersonal = async () => {
    clear()
    if (!validatePersonal()) return
    setLoading(true)
    try {
      await createAccount()
      setSuccess("Account created! Sending phone verification…")
      await sendPhoneOtp()
      setStep(3)
    } catch(e) {
      setError(e.message || "Failed to create account.")
    } finally { setLoading(false) }
  }

  const handleBack = () => {
    clear()
    if      (step === 1) setStep(0)
    else if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(3)
  }

  const handleFinish = async () => {
    setLoading(true); clear()
    try {
      const token = localStorage.getItem("token")
      if (reg.documentFile && token) {
        const fd = new FormData()
        fd.append("document",     reg.documentFile)
        fd.append("documentType", reg.documentType || "identity")
        await fetch(`${API}/auth/upload-document`, {
          method:"POST",
          headers:{ Authorization:`Bearer ${token}` },
          body:fd,
        })
      }
      setSuccess("All done! Signing you in…")
      setTimeout(async () => {
        try {
          await login(reg.email, reg.password)
          navigate("/app")
        } catch {
          navigate("/app")
        }
      }, 800)
    } catch {
      setTimeout(async () => {
        try { await login(reg.email, reg.password); navigate("/app") }
        catch { navigate("/app") }
      }, 800)
    } finally { setLoading(false) }
  }

  /* ── Login ── */
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setError("Please fill in all fields.")
      return
    }
    setLoading(true); clear()
    try {
      await login(loginForm.email, loginForm.password)
      navigate("/app")
    } catch(e) {
      setError(e.response?.data?.message || "Invalid credentials. Please try again.")
    } finally { setLoading(false) }
  }

  /* ── File uploads ── */
  const handlePhotoUpload = (e) => {
    const f = e.target.files[0]; if (!f) return
    setR("profilePhotoFile", f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleDocUpload = (e) => {
    const f = e.target.files[0]; if (!f) return
    setR("documentFile", f)
    setDocPreview(f.name)
  }

  /* ── Shared styles ── */
  const btnPrimary = {
    width:"100%", padding:"13px", border:"none", borderRadius:12,
    background:"linear-gradient(135deg, var(--purple-600), var(--purple-700))",
    color:"#fff", fontFamily:"var(--font-sans)", fontSize:".9rem", fontWeight:600,
    cursor:"pointer", transition:"all .15s",
    boxShadow:"0 4px 14px rgba(124,58,237,.3)",
    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
    minHeight:48,
  }

  const btnSecondary = {
    padding:"12px", borderRadius:12, border:"1.5px solid #e5e7eb",
    background:"#fff", color:"#6b7280",
    fontFamily:"var(--font-sans)", fontSize:".875rem", fontWeight:500,
    cursor:"pointer", transition:"all .15s", flex:1, minHeight:44,
  }

  const labelStyle = {
    display:"block", fontFamily:"var(--font-sans)",
    fontSize:".82rem", fontWeight:600, color:"#374151", marginBottom:6,
  }

  const spinnerStyle = {
    width:16, height:16, borderRadius:"50%",
    border:"2px solid rgba(255,255,255,.4)",
    borderTopColor:"#fff",
    animation:"ul-spin .7s linear infinite",
    display:"inline-block", flexShrink:0,
  }

  return (
    <>
      <style>{`
        @keyframes ul-spin  { to { transform: rotate(360deg); } }
        @keyframes ul-rise  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .ul-page {
          min-height: 100dvh;
          background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 50%, #eff6ff 100%);
          display: flex; align-items: center; justify-content: center;
          padding: clamp(1rem, 4vw, 2rem);
          font-family: var(--font-sans);
        }
        .ul-card {
          background: #fff; border-radius: 24px;
          box-shadow: 0 20px 60px rgba(124,58,237,.1), 0 4px 16px rgba(0,0,0,.06);
          width: 100%; max-width: 480px;
          padding: clamp(1.75rem, 5vw, 2.5rem);
          border: 1px solid rgba(124,58,237,.08);
          animation: ul-rise .4s ease both;
        }
        .ul-tab-wrap {
          display: flex; gap:4px; background:#f3f4f6; border-radius:14px;
          padding:4px; margin-bottom:1.75rem;
        }
        .ul-tab {
          flex:1; padding:10px; border-radius:11px; border:none; cursor:pointer;
          font-family:var(--font-sans); font-size:.875rem; font-weight:600;
          transition:all .2s;
        }
        .ul-tab-active  { background:#fff; color:#111827; box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .ul-tab-inactive{ background:transparent; color:#9ca3af; }
        .ul-alert-error {
          background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
          font-size:.82rem; padding:11px 14px; border-radius:12px;
          margin-bottom:1.25rem; display:flex; align-items:flex-start; gap:8px;
          animation: ul-rise .25s ease;
        }
        .ul-alert-success {
          background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46;
          font-size:.82rem; padding:11px 14px; border-radius:12px;
          margin-bottom:1.25rem; display:flex; align-items:center; gap:8px;
          animation: ul-rise .25s ease;
        }
        .ul-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width: 400px) { .ul-grid-2 { grid-template-columns:1fr; } }
        .ul-photo-ring {
          width:64px; height:64px; border-radius:50%;
          background:var(--purple-50); border:2px dashed var(--purple-300);
          display:flex; align-items:center; justify-content:center;
          overflow:hidden; cursor:pointer; transition:border-color .15s; flex-shrink:0;
        }
        .ul-photo-ring:hover { border-color:var(--purple-500); }
        .ul-upload-area {
          border:2px dashed #e5e7eb; border-radius:14px; padding:1.75rem;
          display:flex; flex-direction:column; align-items:center; gap:8px;
          transition:all .15s; cursor:pointer; background:#fafafa;
        }
        .ul-upload-area:hover { border-color:var(--purple-300); background:var(--purple-50); }
        .ul-wallet-chip {
          display:flex; align-items:center; gap:8px;
          background:#ecfdf5; border:1px solid #a7f3d0;
          border-radius:12px; padding:11px 14px;
        }
        .ul-divider {
          display:flex; align-items:center; gap:12px; margin:1.5rem 0 1.25rem;
        }
        .ul-divider-line { flex:1; height:1px; background:#f3f4f6; }
        .ul-divider-text { font-size:.75rem; color:#d1d5db; white-space:nowrap; }
        .ul-footer-row {
          margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid #f3f4f6;
          display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;
        }
        .ul-ghost-btn {
          background:none; border:none; cursor:pointer;
          font-family:var(--font-sans); font-size:.82rem; color:#9ca3af;
          transition:color .15s; padding:0;
        }
        .ul-ghost-btn:hover { color:#6b7280; }
      `}</style>

      <div className="ul-page">
        <div className="ul-card">

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
            <div onClick={() => navigate("/")} style={{
              width:64, height:64, borderRadius:18,
              background:"linear-gradient(135deg, var(--purple-600), var(--purple-700))",
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 1.25rem", cursor:"pointer",
              boxShadow:"0 6px 20px rgba(124,58,237,.35)",
            }}>
              <span style={{ fontFamily:"var(--font-serif)", fontSize:"1.1rem", color:"#fff" }}>CF</span>
            </div>
            <h1 style={{
              fontFamily:"var(--font-serif)", fontSize:"clamp(1.5rem, 4vw, 1.85rem)",
              fontWeight:400, color:"#111827", margin:"0 0 .35rem", letterSpacing:"-.01em",
            }}>
              Welcome to FundChain
            </h1>
            <p style={{ fontFamily:"var(--font-sans)", fontSize:".875rem", color:"#9ca3af", margin:0 }}>
              Sign in or create an account
            </p>
          </div>

          {/* Tabs */}
          <div className="ul-tab-wrap">
            {["login","register"].map(t => (
              <button key={t} onClick={() => switchTab(t)} className={`ul-tab ${tab===t?"ul-tab-active":"ul-tab-inactive"}`}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="ul-alert-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}
          {success && !error && (
            <div className="ul-alert-success">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink:0 }}>
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              {success}
            </div>
          )}

          {/* ══ LOGIN TAB ══ */}
          {tab === "login" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <Input type="email" value={loginForm.email} onChange={e => setL("email", e.target.value)}
                  placeholder="you@example.com" autoComplete="email"/>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <Input type="password" value={loginForm.password} onChange={e => setL("password", e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key==="Enter" && handleLogin()} autoComplete="current-password"/>
              </div>
              <button onClick={handleLogin} disabled={loading} style={{ ...btnPrimary, marginTop:4, opacity:loading?.6:1 }}>
                {loading ? <><span style={spinnerStyle}/> Signing in…</> : "Sign in"}
              </button>
            </div>
          )}

          {/* ══ REGISTER TAB ══ */}
          {tab === "register" && (
            <div>
              <StepIndicator labelIdx={labelIdx}/>

              {/* STEP 0 — Basic info */}
              {step === 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                  {/* Photo */}
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <label className="ul-photo-ring" title="Upload profile photo">
                      {photoPreview
                        ? <img src={photoPreview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--purple-400)" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                      }
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }}/>
                    </label>
                    <div>
                      <p style={{ fontFamily:"var(--font-sans)", fontSize:".875rem", fontWeight:600, color:"#374151", margin:"0 0 3px" }}>Profile photo</p>
                      <p style={{ fontFamily:"var(--font-sans)", fontSize:".75rem", color:"#9ca3af", margin:0 }}>Optional · Click to upload</p>
                    </div>
                  </div>

                  <div className="ul-grid-2">
                    <div>
                      <label style={labelStyle}>Full name</label>
                      <Input value={reg.name} onChange={e => setR("name", e.target.value)} placeholder="Bhushan Patil"/>
                    </div>
                    <div>
                      <label style={labelStyle}>Username</label>
                      <Input value={reg.username} onChange={e => setR("username", e.target.value)} placeholder="bhushan_k"/>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Email address</label>
                    <Input type="email" value={reg.email} onChange={e => setR("email", e.target.value)}
                      placeholder="you@example.com" autoComplete="email"/>
                  </div>

                  <div className="ul-grid-2">
                    <div>
                      <label style={labelStyle}>Password</label>
                      <Input type="password" value={reg.password} onChange={e => setR("password", e.target.value)} placeholder="Min. 6 chars"/>
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm</label>
                      <Input type="password" value={reg.confirm} onChange={e => setR("confirm", e.target.value)} placeholder="Repeat"/>
                    </div>
                  </div>

                  <button onClick={handleContinueBasic} disabled={otpLoading}
                    style={{ ...btnPrimary, marginTop:4, opacity:otpLoading?.6:1 }}>
                    {otpLoading ? <><span style={spinnerStyle}/> Sending OTP…</> : "Continue →"}
                  </button>
                </div>
              )}

              {/* STEP 1 — Email OTP */}
              {step === 1 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
                  <div style={{ textAlign:"center", padding:".5rem 0" }}>
                    <div style={{ fontSize:"2.5rem", marginBottom:12 }}>✉️</div>
                    <p style={{ fontFamily:"var(--font-sans)", fontWeight:700, color:"#111827", margin:"0 0 6px" }}>
                      Check your email
                    </p>
                    <p style={{ fontFamily:"var(--font-sans)", fontSize:".85rem", color:"#9ca3af", margin:0 }}>
                      We sent a 6-digit code to <strong style={{ color:"var(--purple-600)" }}>{reg.email}</strong>
                    </p>
                  </div>

                  <OtpBoxes value={emailOtp} onChange={setEmailOtp} disabled={otpLoading}/>
                  <ResendBtn onResend={sendEmailOtp} disabled={otpLoading}/>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={handleBack} style={btnSecondary}>← Back</button>
                    <button onClick={verifyEmailOtp}
                      disabled={otpLoading || emailOtp.replace(/\s/g,"").length < 6}
                      style={{ ...btnPrimary, flex:1, width:"auto", opacity:(otpLoading || emailOtp.replace(/\s/g,"").length < 6)?.5:1 }}>
                      {otpLoading ? <><span style={spinnerStyle}/> Verifying…</> : "Verify Email"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — Personal info */}
              {step === 2 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                  <div style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    <p style={{ fontFamily:"var(--font-sans)", fontSize:".8rem", color:"#065f46", margin:0 }}>
                      <strong>{reg.email}</strong> verified
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>Phone number</label>
                    <Input type="tel" value={reg.phone} onChange={e => setR("phone", e.target.value)}
                      placeholder="+919876543210" autoComplete="tel"/>
                    <p style={{ fontFamily:"var(--font-sans)", fontSize:".73rem", color:"#9ca3af", margin:"5px 0 0" }}>
                      Include country code e.g. +91
                    </p>
                  </div>

                  <div>
                    <label style={labelStyle}>Date of birth</label>
                    <Input type="date" value={reg.dob} onChange={e => setR("dob", e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}/>
                  </div>

                  <div>
                    <label style={labelStyle}>Location</label>
                    <Input value={reg.location} onChange={e => setR("location", e.target.value)}
                      placeholder="Mumbai, Maharashtra, India"/>
                  </div>

                  <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 14px", fontFamily:"var(--font-sans)", fontSize:".78rem", color:"#1d4ed8" }}>
                    ℹ Clicking Continue will create your account and send a phone verification code.
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={handleBack} style={btnSecondary}>Back</button>
                    <button onClick={handleContinuePersonal} disabled={loading || otpLoading}
                      style={{ ...btnPrimary, flex:1, width:"auto", opacity:(loading || otpLoading)?.6:1 }}>
                      {loading ? <><span style={spinnerStyle}/> Creating account…</>
                       : otpLoading ? <><span style={spinnerStyle}/> Sending OTP…</>
                       : "Continue →"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Phone OTP */}
              {step === 3 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
                  <div style={{ textAlign:"center", padding:".5rem 0" }}>
                    <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📱</div>
                    <p style={{ fontFamily:"var(--font-sans)", fontWeight:700, color:"#111827", margin:"0 0 6px" }}>
                      Verify your phone
                    </p>
                    <p style={{ fontFamily:"var(--font-sans)", fontSize:".85rem", color:"#9ca3af", margin:0 }}>
                      Code sent to <strong style={{ color:"var(--purple-600)" }}>{reg.phone}</strong>
                    </p>
                  </div>

                  <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} disabled={otpLoading}/>
                  <ResendBtn onResend={sendPhoneOtp} disabled={otpLoading}/>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={handleBack} style={btnSecondary}>← Back</button>
                    <button onClick={verifyPhoneOtp}
                      disabled={otpLoading || phoneOtp.replace(/\s/g,"").length < 6}
                      style={{ ...btnPrimary, flex:1, width:"auto", opacity:(otpLoading || phoneOtp.replace(/\s/g,"").length < 6)?.5:1 }}>
                      {otpLoading ? <><span style={spinnerStyle}/> Verifying…</> : "Verify Phone"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — Documents */}
              {step === 4 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"1.1rem" }}>
                  <div style={{ background:"#ecfdf5", border:"1px solid #a7f3d0", borderRadius:10, padding:"10px 14px", display:"flex", gap:8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ flexShrink:0, marginTop:1 }}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <p style={{ fontFamily:"var(--font-sans)", fontSize:".8rem", color:"#065f46", margin:0 }}>
                      Email &amp; phone verified — account created!
                    </p>
                  </div>

                  <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", fontFamily:"var(--font-sans)", fontSize:".78rem", color:"#92400e" }}>
                    🔒 Documents are only visible to admins for identity verification.
                  </div>

                  <div>
                    <label style={labelStyle}>Document type</label>
                    <select value={reg.documentType} onChange={e => setR("documentType", e.target.value)}
                      style={{
                        width:"100%", padding:"11px 14px", boxSizing:"border-box",
                        fontFamily:"var(--font-sans)", fontSize:".9rem", color:"#111827",
                        background:"#f9fafb", border:"1.5px solid #e5e7eb",
                        borderRadius:12, outline:"none", cursor:"pointer", minHeight:44,
                      }}>
                      <option value="">Select document type</option>
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="passport">Passport</option>
                      <option value="driving">Driving License</option>
                      <option value="voter">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Upload document <span style={{ color:"#9ca3af", fontWeight:400 }}>(optional)</span>
                    </label>
                    <label style={{ cursor:"pointer", display:"block" }}>
                      <div className="ul-upload-area" style={{
                        borderColor: docPreview ? "var(--purple-400)" : "#e5e7eb",
                        background:  docPreview ? "var(--purple-50)" : "#fafafa",
                      }}>
                        {docPreview ? (
                          <>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--purple-600)" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <p style={{ fontFamily:"var(--font-sans)", fontSize:".85rem", fontWeight:600, color:"var(--purple-600)", margin:0 }}>{docPreview}</p>
                            <p style={{ fontFamily:"var(--font-sans)", fontSize:".72rem", color:"var(--purple-400)", margin:0 }}>Click to change</p>
                          </>
                        ) : (
                          <>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <p style={{ fontFamily:"var(--font-sans)", fontSize:".875rem", color:"#6b7280", margin:0 }}>Click to upload</p>
                            <p style={{ fontFamily:"var(--font-sans)", fontSize:".75rem", color:"#9ca3af", margin:0 }}>PDF, JPG, PNG up to 10MB</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} style={{ display:"none" }}/>
                    </label>
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={handleBack} style={btnSecondary}>Back</button>
                    <button onClick={handleFinish} disabled={loading}
                      style={{ ...btnPrimary, flex:1, width:"auto", opacity:loading?.6:1 }}>
                      {loading ? <><span style={spinnerStyle}/> Finishing…</> : "Enter FundChain →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="ul-divider">
            <div className="ul-divider-line"/>
            <span className="ul-divider-text">or continue with wallet</span>
            <div className="ul-divider-line"/>
          </div>

          {/* Wallet section */}
          {account ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div className="ul-wallet-chip">
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", flexShrink:0 }}/>
                <p style={{ fontFamily:"monospace", fontSize:".8rem", color:"#065f46", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{account}</p>
              </div>
              <button onClick={() => navigate("/app")} style={{
                ...btnSecondary, width:"100%", textAlign:"center", display:"block",
                background:"#f9fafb", color:"#374151", fontWeight:600, fontSize:".875rem",
              }}>Continue to app →</button>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={isConnecting} style={{
              ...btnSecondary, width:"100%",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              padding:14, opacity:isConnecting?.6:1,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
              </svg>
              {isConnecting ? "Connecting…" : "Connect MetaMask"}
            </button>
          )}

          {/* Footer */}
          <div className="ul-footer-row">
            <button className="ul-ghost-btn" onClick={() => navigate("/")}>← Back to home</button>
            <button onClick={() => navigate("/admin-login")} style={{
              background:"none", border:"none", cursor:"pointer",
              fontFamily:"var(--font-sans)", fontSize:".82rem", fontWeight:600, color:"#f97316",
            }}>Admin login →</button>
          </div>

        </div>
      </div>
    </>
  )
}

export default UserLogin
