import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Inline OTP boxes ──────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled }) {
  const vals = (value + "      ").slice(0, 6).split("");
  const refs = Array.from({ length: 6 }, () => null);

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...vals]; next[i] = digit;
    onChange(next.join("").trimEnd());
    if (digit && i < 5) refs[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !vals[i]?.trim() && i > 0) refs[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {vals.map((v, i) => (
        <input key={i} ref={(el) => (refs[i] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={v.trim()} disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-10 h-12 text-center text-lg font-bold border-2 rounded-xl outline-none transition-all
            ${v.trim() ? "border-purple-500 bg-purple-50" : "border-gray-200"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "focus:border-purple-400"}`}
        />
      ))}
    </div>
  );
}

// ── Resend button with countdown ──────────────────────────────────────────────
function ResendBtn({ onResend, disabled }) {
  const [secs, setSecs] = useState(60);
  const [busy, setBusy] = useState(false);

  useState(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  });

  const handle = async () => {
    if (secs > 0 || busy || disabled) return;
    setBusy(true);
    try { await onResend?.(); } finally { setBusy(false); setSecs(60); }
  };

  return secs > 0
    ? <p className="text-xs text-gray-400 text-center">Resend in <strong className="text-gray-600">{secs}s</strong></p>
    : <button type="button" onClick={handle} disabled={busy || disabled}
        className="text-xs text-purple-600 underline underline-offset-2 hover:text-purple-800 disabled:opacity-50 w-full text-center">
        {busy ? "Sending…" : "Resend OTP"}
      </button>;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * REGISTRATION FLOW (5 internal steps mapped to 3 visual steps):
 *
 * step 0 → Basic info (name, username, email, password)
 *           ↓ Continue → send email OTP
 * step 1 → ✉️ Verify Email OTP
 *           ↓ Verify → email verified in DB
 * step 2 → 📋 Personal details (phone, dob, location) + CREATE ACCOUNT HERE
 *           ↓ Continue → account created → send phone OTP
 * step 3 → 📱 Verify Phone OTP
 *           ↓ Verify → phone verified in DB
 * step 4 → 📄 Documents (optional)
 *           ↓ Create account (final) → auto-login → /app
 *
 * Account is created at step 2→3 transition so the user exists
 * in MongoDB before phone OTP is sent.
 */
const UserLogin = () => {
  const { account, connectWallet, isConnecting } = useWallet();
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [tab, setTab]         = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep]       = useState(0);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview]     = useState(null);
  const [emailOtp, setEmailOtp]         = useState("");
  const [phoneOtp, setPhoneOtp]         = useState("");
  const [otpLoading, setOtpLoading]     = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    name: "", username: "", email: "", password: "", confirm: "",
    phone: "", dob: "", location: "",
    profilePhotoFile: null, documentType: "", documentFile: null,
  });

  const setL = (k, v) => setLoginForm((f) => ({ ...f, [k]: v }));
  const setR = (k, v) => setReg((f) => ({ ...f, [k]: v }));
  const clear = ()     => { setError(""); setSuccess(""); };

  // Visual step indicator: 0,1→label0 | 2,3→label1 | 4→label2
  const labelIdx = step <= 1 ? 0 : step <= 3 ? 1 : 2;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateBasic = () => {
    if (!reg.name)     { setError("Name is required.");     return false; }
    if (!reg.username) { setError("Username is required."); return false; }
    if (!reg.email || !/^\S+@\S+\.\S+$/.test(reg.email))
                       { setError("Valid email is required."); return false; }
    if (!reg.password || reg.password.length < 6)
                       { setError("Password must be at least 6 characters."); return false; }
    if (reg.password !== reg.confirm)
                       { setError("Passwords do not match."); return false; }
    return true;
  };

  const validatePersonal = () => {
    if (!reg.phone)    { setError("Phone number is required."); return false; }
    if (!reg.dob)      { setError("Date of birth is required."); return false; }
    if (!reg.location) { setError("Location is required.");     return false; }
    return true;
  };

  // ── Email OTP ────────────────────────────────────────────────────────────────
  const sendEmailOtp = async () => {
    setOtpLoading(true); clear();
    try {
      const res  = await fetch(`${API}/verification/send-email-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reg.email, registration: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`OTP sent to ${reg.email}`);
    } catch (e) { setError(e.message); }
    finally     { setOtpLoading(false); }
  };

  const verifyEmailOtp = async () => {
    const code = emailOtp.replace(/\s/g, "");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setOtpLoading(true); clear();
    try {
      const res  = await fetch(`${API}/verification/verify-email-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reg.email, otp: code, registration: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Email verified ✓");
      setEmailOtp("");
      setStep(2); // → personal details
    } catch (e) { setError(e.message); }
    finally     { setOtpLoading(false); }
  };

  // ── Create account (called at step 2 → 3 transition) ─────────────────────────
  const createAccount = async () => {
    let profilePhotoUrl = "";
    if (reg.profilePhotoFile) {
      const fd = new FormData(); fd.append("file", reg.profilePhotoFile);
      const { data } = await axios.post(`${API}/auth/upload/photos`, fd,
        { headers: { "Content-Type": "multipart/form-data" } });
      profilePhotoUrl = data.url;
    }
    // Mark emailVerified when creating account (already verified via OTP)
await axios.post(`${API}/auth/register`, {
      name: reg.name, username: reg.username,
      email: reg.email, password: reg.password,
      phone: reg.phone, dob: reg.dob, location: reg.location,
      profilePhoto: profilePhotoUrl,
    });
  };

  // ── Phone OTP ────────────────────────────────────────────────────────────────
  const sendPhoneOtp = async () => {
    setOtpLoading(true); clear();
    try {
      const res  = await fetch(`${API}/verification/send-phone-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        // ✅ send email too so backend can find the user
        body: JSON.stringify({ phone: reg.phone, email: reg.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`OTP sent to ${reg.phone}`);
    } catch (e) { setError(e.message); }
    finally     { setOtpLoading(false); }
  };

  const verifyPhoneOtp = async () => {
    const code = phoneOtp.replace(/\s/g, "");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setOtpLoading(true); clear();
    try {
      const res  = await fetch(`${API}/verification/verify-phone-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reg.phone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess("Phone verified ✓");
      setPhoneOtp("");
      setStep(4); // → documents
    } catch (e) { setError(e.message); }
    finally     { setOtpLoading(false); }
  };

  // ── Step navigation ───────────────────────────────────────────────────────────
  // Step 0 → validate basic → send email OTP → go to step 1
  const handleContinueBasic = async () => {
    if (!validateBasic()) return;
    clear(); await sendEmailOtp(); if (!error) setStep(1);
  };

  // Step 2 → validate personal → CREATE ACCOUNT → send phone OTP → go to step 3
  const handleContinuePersonal = async () => {
    if (!validatePersonal()) return;
    setLoading(true); clear();
    try {
      await createAccount();              // ✅ user now exists in DB
      setSuccess("Account created! Sending phone OTP...");
      await sendPhoneOtp();               // ✅ now this will find the user
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    clear();
    setStep(s => s === 1 ? 0 : s === 2 ? 1 : s === 3 ? 2 : s === 4 ? 3 : s);
  };

  // ── File uploads ──────────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setR("profilePhotoFile", f); setPhotoPreview(URL.createObjectURL(f));
  };
  const handleDocUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setR("documentFile", f); setDocPreview(f.name);
  };

  // ── Final step: upload document + auto-login ──────────────────────────────────
  const handleFinish = async () => {
    setLoading(true); clear();
    try {
      // Upload document if provided
      if (reg.documentFile) {
        const fd = new FormData(); fd.append("file", reg.documentFile);
        const { data } = await axios.post(`${API}/auth/upload/docs`, fd,
          { headers: { "Content-Type": "multipart/form-data" } });
        // Update user document fields
        const token = localStorage.getItem("token") ||
          (await axios.post(`${API}/auth/login`, { email: reg.email, password: reg.password })).data.token;
        await axios.patch(`${API}/auth/me/document`, {
          documentType: reg.documentType,
          documentHash: data.filename,
          documentUrl:  data.url,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setSuccess("All done! Signing you in...");
      setTimeout(async () => {
        await login(reg.email, reg.password);
        navigate("/app");
      }, 800);
    } catch (e) {
      // Even if document upload fails, still log in
      setSuccess("Signing you in...");
      setTimeout(async () => {
        await login(reg.email, reg.password);
        navigate("/app");
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) { setError("Please fill in all fields."); return; }
    setLoading(true); clear();
    try {
      await login(loginForm.email, loginForm.password);
      const token = localStorage.getItem("token");
      if (token) {
        const p = JSON.parse(atob(token.split(".")[1]));
        if (!p.emailVerified) return navigate("/verify/email", { state: { email: loginForm.email } });
        if (!p.phoneVerified) return navigate("/verify/phone");
      }
      navigate("/app");
    } catch (e) { setError(e.response?.data?.message || "Invalid credentials"); }
    finally     { setLoading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-white font-bold">CF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to FundChain</h1>
          <p className="text-gray-500 text-sm">Sign in or create an account</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {["login","register"].map((t) => (
            <button key={t} onClick={() => { setTab(t); clear(); setStep(0); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error   && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

        {/* ══ LOGIN ══ */}
        {tab === "login" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={loginForm.email} onChange={(e) => setL("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setL("password", e.target.value)}
                placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        )}

        {/* ══ REGISTER ══ */}
        {tab === "register" && (
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-6">
              {["Basic info","Personal details","Documents"].map((label, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      i < labelIdx ? "bg-purple-600 text-white"
                      : i === labelIdx ? "bg-purple-600 text-white ring-4 ring-purple-100"
                      : "bg-gray-100 text-gray-400"}`}>
                      {i < labelIdx ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-1 ${i === labelIdx ? "text-purple-600 font-medium" : "text-gray-400"}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px mx-2 mb-4 ${i < labelIdx ? "bg-purple-400" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>

            {/* ─ STEP 0: Basic info ─ */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors">
                      {photoPreview
                        ? <img src={photoPreview} alt="profile" className="w-full h-full object-cover" />
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <div><p className="text-sm font-medium text-gray-700">Profile photo</p><p className="text-xs text-gray-400">Click to upload</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                    <input type="text" value={reg.name} onChange={(e) => setR("name", e.target.value)} placeholder="Bhushan Patil"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input type="text" value={reg.username} onChange={(e) => setR("username", e.target.value)} placeholder="bhushan_k"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={reg.email} onChange={(e) => setR("email", e.target.value)} placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" value={reg.password} onChange={(e) => setR("password", e.target.value)} placeholder="Min. 6 chars"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                    <input type="password" value={reg.confirm} onChange={(e) => setR("confirm", e.target.value)} placeholder="Repeat password"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400" />
                  </div>
                </div>
                <button onClick={handleContinueBasic} disabled={otpLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                  {otpLoading ? "Sending OTP..." : "Continue →"}
                </button>
              </div>
            )}

            {/* ─ STEP 1: Email OTP ─ */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="text-4xl mb-3">✉️</div>
                  <p className="text-sm font-semibold text-gray-800">Verify your email</p>
                  <p className="text-xs text-gray-400 mt-1">We sent a 6-digit code to</p>
                  <p className="text-xs font-semibold text-purple-600 mt-0.5">{reg.email}</p>
                </div>
                <OtpBoxes value={emailOtp} onChange={setEmailOtp} disabled={otpLoading} />
                <ResendBtn onResend={sendEmailOtp} disabled={otpLoading} />
                <div className="flex gap-3 pt-1">
                  <button onClick={handleBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button onClick={verifyEmailOtp} disabled={otpLoading || emailOtp.replace(/\s/g,"").length < 6}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                    {otpLoading ? "Verifying..." : "Verify Email"}
                  </button>
                </div>
              </div>
            )}

            {/* ─ STEP 2: Personal details ─ */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-xs text-green-700">Email <strong>{reg.email}</strong> verified</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                  <input type="tel" value={reg.phone} onChange={(e) => setR("phone", e.target.value)} placeholder="+919876543210"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400" />
                  <p className="text-xs text-gray-400 mt-1">Include country code e.g. +91</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <input type="date" value={reg.dob} onChange={(e) => setR("dob", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={reg.location} onChange={(e) => setR("location", e.target.value)} placeholder="Mumbai, Maharashtra, India"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400" />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-600">
                  ℹ Clicking Continue will create your account and send a phone OTP.
                </div>
                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Back</button>
                  <button onClick={handleContinuePersonal} disabled={loading || otpLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                    {loading ? "Creating..." : otpLoading ? "Sending OTP..." : "Continue →"}
                  </button>
                </div>
              </div>
            )}

            {/* ─ STEP 3: Phone OTP ─ */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="text-4xl mb-3">📱</div>
                  <p className="text-sm font-semibold text-gray-800">Verify your phone</p>
                  <p className="text-xs text-gray-400 mt-1">We sent a 6-digit SMS code to</p>
                  <p className="text-xs font-semibold text-purple-600 mt-0.5">{reg.phone}</p>
                </div>
                <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} disabled={otpLoading} />
                <ResendBtn onResend={sendPhoneOtp} disabled={otpLoading} />
                <div className="flex gap-3 pt-1">
                  <button onClick={handleBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">← Back</button>
                  <button onClick={verifyPhoneOtp} disabled={otpLoading || phoneOtp.replace(/\s/g,"").length < 6}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                    {otpLoading ? "Verifying..." : "Verify Phone"}
                  </button>
                </div>
              </div>
            )}

            {/* ─ STEP 4: Documents ─ */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-xs text-green-700">Email &amp; phone verified — account created!</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  Documents are only visible to admins for verification purposes.
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document type</label>
                  <select value={reg.documentType} onChange={(e) => setR("documentType", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-400 bg-white">
                    <option value="">Select document type</option>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="passport">Passport</option>
                    <option value="driving">Driving License</option>
                    <option value="voter">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload document <span className="text-gray-400">(optional)</span></label>
                  <label className="block cursor-pointer">
                    <div className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors ${
                      docPreview ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:border-purple-300"}`}>
                      {docPreview
                        ? <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" className="mb-2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <p className="text-sm text-purple-700 font-medium">{docPreview}</p>
                            <p className="text-xs text-purple-400 mt-1">Click to change</p></>
                        : <><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="mb-2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
                              <line x1="12" y1="3" x2="12" y2="15"/>
                            </svg>
                            <p className="text-sm text-gray-500">Click to upload document</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p></>}
                    </div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleDocUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Back</button>
                  <button onClick={handleFinish} disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                    {loading ? "Finishing..." : "Enter FundChain →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or continue with wallet</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Wallet */}
        {account ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="font-mono text-xs text-green-800 truncate">{account}</p>
            </div>
            <button onClick={() => navigate("/app")} className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">
              Continue to app →
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
            </svg>
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
        )}

        <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-gray-400 hover:text-gray-600">← Back to home</button>
          <button onClick={() => navigate("/admin-login")} className="text-sm text-orange-500 hover:text-orange-600 font-medium">Admin login →</button>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
