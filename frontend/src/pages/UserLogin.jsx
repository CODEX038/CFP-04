import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

// ── OTP boxes ─────────────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled }) {
  const vals = (value + "      ").slice(0, 6).split("");
  const refs = useRef([]);
  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...vals]; next[i] = digit;
    onChange(next.join("").trimEnd());
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !vals[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }} onPaste={handlePaste}>
      {vals.map((v, i) => (
        <input key={i} ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={v.trim()} disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={{
            width: 46, height: 52, textAlign: "center",
            fontSize: "1.25rem", fontWeight: 700,
            fontFamily: "var(--font-sans)",
            border: `2px solid ${v.trim() ? "#7C3AED" : "#E5E7EB"}`,
            borderRadius: 12, outline: "none",
            background: v.trim() ? "#F5F3FF" : "#fff",
            color: "#111827", transition: "all .15s",
            opacity: disabled ? .5 : 1,
          }}
          onFocus={e => { if (!v.trim()) e.target.style.borderColor = "#A78BFA" }}
          onBlur={e => { if (!v.trim()) e.target.style.borderColor = "#E5E7EB" }}
        />
      ))}
    </div>
  );
}

// ── Resend button ─────────────────────────────────────────────────────────────
function ResendBtn({ onResend, disabled }) {
  const [secs, setSecs] = useState(60);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  const handle = async () => {
    if (secs > 0 || busy || disabled) return;
    setBusy(true);
    try { await onResend?.() } finally { setBusy(false); setSecs(60) }
  };
  return (
    <p style={{ textAlign: "center", fontFamily: "var(--font-sans)", fontSize: ".8rem", color: "#9CA3AF" }}>
      {secs > 0
        ? <>Resend code in <strong style={{ color: "#6B7280" }}>{secs}s</strong></>
        : <button onClick={handle} disabled={busy || disabled} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#7C3AED", fontWeight: 600, textDecoration: "underline", fontSize: ".8rem",
        }}>{busy ? "Sending…" : "Resend OTP"}</button>
      }
    </p>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "13px 16px", boxSizing: "border-box",
  fontFamily: "var(--font-sans)", fontSize: ".95rem", color: "#111827",
  background: "#F9FAFB", border: "1.5px solid #E5E7EB",
  borderRadius: 12, outline: "none", transition: "border-color .15s, background .15s",
};

function Input({ type = "text", value, onChange, placeholder, onKeyDown }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = "#7C3AED"; e.target.style.background = "#fff" }}
      onBlur={e => { e.target.style.borderColor = "#E5E7EB"; e.target.style.background = "#F9FAFB" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const UserLogin = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState(0);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    name: "", username: "", email: "", password: "", confirm: "",
    phone: "", dob: "", location: "",
    profilePhotoFile: null, documentType: "", documentFile: null,
  });
  const emailOtpSent = useRef(false);

  const setL = (k, v) => setLoginForm(f => ({ ...f, [k]: v }));
  const setR = (k, v) => setReg(f => ({ ...f, [k]: v }));
  const clear = () => { setError(""); setSuccess("") };
  const labelIdx = step <= 1 ? 0 : step <= 3 ? 1 : 2;

  const validateBasic = () => {
    if (!reg.name) { setError("Name is required."); return false }
    if (!reg.username) { setError("Username is required."); return false }
    if (!reg.email || !/^\S+@\S+\.\S+$/.test(reg.email)) { setError("Valid email is required."); return false }
    if (!reg.password || reg.password.length < 6) { setError("Password must be at least 6 characters."); return false }
    if (reg.password !== reg.confirm) { setError("Passwords do not match."); return false }
    return true;
  };
  const validatePersonal = () => {
    if (!reg.phone) { setError("Phone number is required."); return false }
    if (!reg.dob) { setError("Date of birth is required."); return false }
    if (!reg.location) { setError("Location is required."); return false }
    return true;
  };

  const sendEmailOtp = async () => {
    setOtpLoading(true); clear(); emailOtpSent.current = false;
    try {
      const res = await fetch(`${API}/verification/send-email-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: reg.email, registration: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`OTP sent to ${reg.email}`); emailOtpSent.current = true;
    } catch (e) { setError(e.message) } finally { setOtpLoading(false) }
  };
  const verifyEmailOtp = async () => {
    const code = emailOtp.replace(/\s/g, "");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return }
    setOtpLoading(true); clear();
    try {
      const res = await fetch(`${API}/verification/verify-email-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: reg.email, otp: code, registration: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Email verified ✓"); setEmailOtp(""); setStep(2);
    } catch (e) { setError(e.message) } finally { setOtpLoading(false) }
  };
  const createAccount = async () => {
    const fd = new FormData();
    fd.append("name", reg.name); fd.append("username", reg.username);
    fd.append("email", reg.email); fd.append("password", reg.password);
    fd.append("phone", reg.phone); fd.append("dob", reg.dob); fd.append("location", reg.location);
    if (reg.profilePhotoFile) fd.append("profilePhoto", reg.profilePhotoFile);
    const res = await fetch(`${API}/auth/register`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    localStorage.setItem("token", data.token);
    return data.token;
  };
  const sendPhoneOtp = async () => {
    setOtpLoading(true); clear();
    try {
      const res = await fetch(`${API}/verification/send-phone-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: reg.phone, email: reg.email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`OTP sent to ${reg.phone}`);
    } catch (e) { setError(e.message) } finally { setOtpLoading(false) }
  };
  const verifyPhoneOtp = async () => {
    const code = phoneOtp.replace(/\s/g, "");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return }
    setOtpLoading(true); clear();
    try {
      const res = await fetch(`${API}/verification/verify-phone-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: reg.phone, otp: code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Phone verified ✓"); setPhoneOtp(""); setStep(4);
    } catch (e) { setError(e.message) } finally { setOtpLoading(false) }
  };
  const handleContinueBasic = async () => {
    if (!validateBasic()) return; clear();
    await sendEmailOtp();
    if (emailOtpSent.current) setStep(1);
  };
  const handleContinuePersonal = async () => {
    if (!validatePersonal()) return;
    setLoading(true); clear();
    try { await createAccount(); setSuccess("Account created! Sending phone OTP..."); await sendPhoneOtp(); setStep(3); }
    catch (e) { setError(e.message || "Failed to create account.") }
    finally { setLoading(false) }
  };
  const handleBack = () => { clear(); setStep(s => s === 1 ? 0 : s === 2 ? 1 : s === 3 ? 2 : s === 4 ? 3 : s) };
  const handlePhotoUpload = (e) => { const f = e.target.files[0]; if (!f) return; setR("profilePhotoFile", f); setPhotoPreview(URL.createObjectURL(f)) };
  const handleDocUpload = (e) => { const f = e.target.files[0]; if (!f) return; setR("documentFile", f); setDocPreview(f.name) };
  const handleFinish = async () => {
    setLoading(true); clear();
    try {
      const token = localStorage.getItem("token");
      if (reg.documentFile && token) {
        const fd = new FormData(); fd.append("document", reg.documentFile); fd.append("documentType", reg.documentType || "identity");
        await fetch(`${API}/auth/upload-document`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      setSuccess("All done! Signing you in...");
      setTimeout(async () => { await login(reg.email, reg.password); navigate("/app") }, 800);
    } catch { setTimeout(async () => { await login(reg.email, reg.password); navigate("/app") }, 800) }
    finally { setLoading(false) }
  };

  // ── FIXED LOGIN HANDLER ───────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    clear();
    try {
      await login(loginForm.email, loginForm.password);
      navigate("/app");
    } catch (e) {
      setError(e.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared button styles ──────────────────────────────────────────────────
  const btnPrimary = {
    width: "100%", padding: "14px", border: "none", borderRadius: 12,
    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
    color: "#fff", fontFamily: "var(--font-sans)", fontSize: "1rem", fontWeight: 600,
    cursor: "pointer", transition: "opacity .15s, transform .12s",
    boxShadow: "0 4px 14px rgba(124,58,237,.35)",
  };
  const btnSecondary = {
    flex: 1, padding: "12px", border: "1.5px solid #E5E7EB", borderRadius: 12,
    background: "#fff", color: "#6B7280",
    fontFamily: "var(--font-sans)", fontSize: ".9rem", fontWeight: 500, cursor: "pointer",
    transition: "all .15s",
  };
  const label = { display: "block", fontFamily: "var(--font-sans)", fontSize: ".85rem", fontWeight: 600, color: "#374151", marginBottom: 7 };

  return (
    <div style={{
      minHeight: "100vh", background: "#F3F4F6",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{
        background: "#fff", borderRadius: 24,
        boxShadow: "0 8px 40px rgba(0,0,0,.1)",
        width: "100%", maxWidth: 480,
        padding: "clamp(1.75rem, 5vw, 2.5rem)",
        border: "1px solid #F3F4F6",
      }}>

        {/* Logo + header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div onClick={() => navigate("/")} style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem", cursor: "pointer",
            boxShadow: "0 6px 20px rgba(124,58,237,.35)",
          }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", color: "#fff", fontWeight: 400 }}>CF</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 400, color: "#111827", margin: "0 0 .4rem", letterSpacing: "-.01em" }}>
            Welcome to FundChain
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: ".9rem", color: "#9CA3AF", margin: 0 }}>
            Sign in or create an account
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 14,
          padding: 4, marginBottom: "1.75rem",
        }}>
          {["login", "register"].map(t => (
            <button key={t} onClick={() => { setTab(t); clear(); setStep(0) }} style={{
              flex: 1, padding: "10px", borderRadius: 11, border: "none", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: ".9rem", fontWeight: 600,
              transition: "all .2s",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#111827" : "#9CA3AF",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.08)" : "none",
            }}>
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
            fontFamily: "var(--font-sans)", fontSize: ".875rem",
            padding: "12px 16px", borderRadius: 12, marginBottom: "1.25rem",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46",
            fontFamily: "var(--font-sans)", fontSize: ".875rem",
            padding: "12px 16px", borderRadius: 12, marginBottom: "1.25rem",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {success}
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {tab === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label style={label}>Email</label>
              <Input type="email" value={loginForm.email} onChange={e => setL("email", e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label style={label}>Password</label>
              <Input type="password" value={loginForm.password} onChange={e => setL("password", e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={loading} style={{ ...btnPrimary, opacity: loading ? .6 : 1, marginTop: 4 }}
              onMouseEnter={e => e.currentTarget.style.opacity = loading ? .6 : .9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        )}

        {/* ══ REGISTER ══ */}
        {tab === "register" && (
          <div>
            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.75rem" }}>
              {["Basic info", "Personal", "Documents"].map((lbl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-sans)", fontSize: ".75rem", fontWeight: 700,
                      background: i < labelIdx ? "#7C3AED" : i === labelIdx ? "#7C3AED" : "#F3F4F6",
                      color: i <= labelIdx ? "#fff" : "#9CA3AF",
                      boxShadow: i === labelIdx ? "0 0 0 4px #EDE9FE" : "none",
                      transition: "all .2s",
                    }}>
                      {i < labelIdx ? "✓" : i + 1}
                    </div>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: ".7rem", marginTop: 5, color: i === labelIdx ? "#7C3AED" : "#9CA3AF", fontWeight: i === labelIdx ? 600 : 400 }}>
                      {lbl}
                    </span>
                  </div>
                  {i < 2 && (
                    <div style={{ flex: 1, height: 2, margin: "0 8px 16px", background: i < labelIdx ? "#7C3AED" : "#E5E7EB", borderRadius: 1, transition: "background .3s" }} />
                  )}
                </div>
              ))}
            </div>

            {/* STEP 0 */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {/* Photo upload */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ cursor: "pointer", flexShrink: 0 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "#F5F3FF", border: "2px dashed #A78BFA",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", transition: "border-color .15s",
                    }}>
                      {photoPreview
                        ? <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      }
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  </label>
                  <div>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: ".875rem", fontWeight: 600, color: "#374151", margin: "0 0 3px" }}>Profile photo</p>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: ".75rem", color: "#9CA3AF", margin: 0 }}>Optional · Click to upload</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={label}>Full name</label>
                    <Input value={reg.name} onChange={e => setR("name", e.target.value)} placeholder="Bhushan Patil" />
                  </div>
                  <div>
                    <label style={label}>Username</label>
                    <Input value={reg.username} onChange={e => setR("username", e.target.value)} placeholder="bhushan_k" />
                  </div>
                </div>
                <div>
                  <label style={label}>Email address</label>
                  <Input type="email" value={reg.email} onChange={e => setR("email", e.target.value)} placeholder="you@example.com" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={label}>Password</label>
                    <Input type="password" value={reg.password} onChange={e => setR("password", e.target.value)} placeholder="Min. 6 chars" />
                  </div>
                  <div>
                    <label style={label}>Confirm</label>
                    <Input type="password" value={reg.confirm} onChange={e => setR("confirm", e.target.value)} placeholder="Repeat" />
                  </div>
                </div>
                <button onClick={handleContinueBasic} disabled={otpLoading}
                  style={{ ...btnPrimary, opacity: otpLoading ? .6 : 1, marginTop: 4 }}>
                  {otpLoading ? "Sending OTP…" : "Continue →"}
                </button>
              </div>
            )}

            {/* STEP 1: Email OTP */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✉️</div>
                  <p style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "#111827", margin: "0 0 6px", fontSize: "1rem" }}>Check your email</p>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: ".85rem", color: "#9CA3AF", margin: 0 }}>
                    We sent a 6-digit code to <strong style={{ color: "#7C3AED" }}>{reg.email}</strong>
                  </p>
                </div>
                <OtpBoxes value={emailOtp} onChange={setEmailOtp} disabled={otpLoading} />
                <ResendBtn onResend={sendEmailOtp} disabled={otpLoading} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleBack} style={btnSecondary}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>← Back</button>
                  <button onClick={verifyEmailOtp}
                    disabled={otpLoading || emailOtp.replace(/\s/g, "").length < 6}
                    style={{ ...btnPrimary, flex: 1, width: "auto", opacity: (otpLoading || emailOtp.replace(/\s/g, "").length < 6) ? .5 : 1 }}>
                    {otpLoading ? "Verifying…" : "Verify Email"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Personal */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: ".8rem", color: "#065F46", margin: 0 }}>
                    <strong>{reg.email}</strong> verified
                  </p>
                </div>
                <div>
                  <label style={label}>Phone number</label>
                  <Input type="tel" value={reg.phone} onChange={e => setR("phone", e.target.value)} placeholder="+919876543210" />
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: ".75rem", color: "#9CA3AF", margin: "6px 0 0" }}>Include country code e.g. +91</p>
                </div>
                <div>
                  <label style={label}>Date of birth</label>
                  <Input type="date" value={reg.dob} onChange={e => setR("dob", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label style={label}>Location</label>
                  <Input value={reg.location} onChange={e => setR("location", e.target.value)} placeholder="Mumbai, Maharashtra, India" />
                </div>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: ".78rem", color: "#1D4ED8" }}>
                  ℹ Clicking Continue will create your account and send a phone OTP.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleBack} style={btnSecondary}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Back</button>
                  <button onClick={handleContinuePersonal} disabled={loading || otpLoading}
                    style={{ ...btnPrimary, flex: 1, width: "auto", opacity: (loading || otpLoading) ? .6 : 1 }}>
                    {loading ? "Creating…" : otpLoading ? "Sending OTP…" : "Continue →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Phone OTP */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📱</div>
                  <p style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "#111827", margin: "0 0 6px", fontSize: "1rem" }}>Verify your phone</p>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: ".85rem", color: "#9CA3AF", margin: 0 }}>
                    Code sent to <strong style={{ color: "#7C3AED" }}>{reg.phone}</strong>
                  </p>
                </div>
                <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} disabled={otpLoading} />
                <ResendBtn onResend={sendPhoneOtp} disabled={otpLoading} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleBack} style={btnSecondary}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>← Back</button>
                  <button onClick={verifyPhoneOtp}
                    disabled={otpLoading || phoneOtp.replace(/\s/g, "").length < 6}
                    style={{ ...btnPrimary, flex: 1, width: "auto", opacity: (otpLoading || phoneOtp.replace(/\s/g, "").length < 6) ? .5 : 1 }}>
                    {otpLoading ? "Verifying…" : "Verify Phone"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Documents */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6L9 17l-5-5" /></svg>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: ".8rem", color: "#065F46", margin: 0 }}>
                    Email &amp; phone verified — account created!
                  </p>
                </div>
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: ".78rem", color: "#92400E" }}>
                  🔒 Documents are only visible to admins for verification.
                </div>
                <div>
                  <label style={label}>Document type</label>
                  <select value={reg.documentType} onChange={e => setR("documentType", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
                    <option value="">Select document type</option>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="passport">Passport</option>
                    <option value="driving">Driving License</option>
                    <option value="voter">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Upload document <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(optional)</span></label>
                  <label style={{ cursor: "pointer", display: "block" }}>
                    <div style={{
                      border: `2px dashed ${docPreview ? "#7C3AED" : "#E5E7EB"}`,
                      borderRadius: 12, padding: "1.75rem",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      background: docPreview ? "#F5F3FF" : "#FAFAFA",
                      transition: "all .15s",
                    }}>
                      {docPreview ? (
                        <>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: ".85rem", fontWeight: 600, color: "#7C3AED", margin: 0 }}>{docPreview}</p>
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: ".72rem", color: "#A78BFA", margin: 0 }}>Click to change</p>
                        </>
                      ) : (
                        <>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: ".875rem", color: "#6B7280", margin: 0 }}>Click to upload</p>
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: ".75rem", color: "#9CA3AF", margin: 0 }}>PDF, JPG, PNG up to 10MB</p>
                        </>
                      )}
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleBack} style={btnSecondary}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Back</button>
                  <button onClick={handleFinish} disabled={loading}
                    style={{ ...btnPrimary, flex: 1, width: "auto", opacity: loading ? .6 : 1 }}>
                    {loading ? "Finishing…" : "Enter FundChain →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "#F3F4F6" }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: ".78rem", color: "#D1D5DB" }}>or continue with wallet</span>
          <div style={{ flex: 1, height: 1, background: "#F3F4F6" }} />
        </div>

        {/* Wallet section */}
        {account ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
              <p style={{ fontFamily: "monospace", fontSize: ".8rem", color: "#065F46", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account}</p>
            </div>
            <button onClick={() => navigate("/app")} style={{
              ...btnSecondary, width: "100%", textAlign: "center",
              background: "#F9FAFB", color: "#374151", fontWeight: 600,
            }}>Continue to app →</button>
          </div>
        ) : (
          <button onClick={connectWallet} disabled={isConnecting} style={{
            ...btnSecondary, width: "100%", justifyContent: "center",
            display: "flex", alignItems: "center", gap: 10,
            opacity: isConnecting ? .6 : 1, padding: 14,
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
            {isConnecting ? "Connecting…" : "Connect MetaMask"}
          </button>
        )}

        {/* Footer */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: ".82rem", color: "#9CA3AF",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#6B7280"}
            onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}>
            ← Back to home
          </button>
          <button onClick={() => navigate("/admin-login")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontSize: ".82rem", fontWeight: 600, color: "#F97316",
          }}>Admin login →</button>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
