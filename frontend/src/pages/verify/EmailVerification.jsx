/**
 * pages/verify/EmailVerification.jsx
 * Email OTP verification — Vite + React + React Router v6
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import OtpInput from "../../components/OtpInput";
import ResendButton from "../../components/ResendButton";
import "./Verification.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function EmailVerification() {
  const location = useLocation();
  const [step, setStep]       = useState("enterEmail"); // enterEmail | enterOtp | done
  const [email, setEmail]     = useState(location.state?.email || ""); // ✅ pre-filled from register
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) return setError("Please enter your email address.");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/verification/send-email-otp`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP.");
      setSuccess(data.message);
      setStep("enterOtp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault();
    clearMessages();
    if (otp.length < 6) return setError("Please enter the full 6-digit OTP.");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/verification/verify-email-otp`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed.");
      setSuccess(data.message);
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  async function handleResend() {
    clearMessages();
    const token = localStorage.getItem("token");
    const res   = await fetch(`${API}/verification/send-email-otp`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setSuccess("OTP resent successfully.");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const steps = ["enterEmail", "enterOtp", "done"];

  return (
    <div className="verify-page">
      <div className="verify-card">

        {/* Header */}
        <div className="verify-header">
          <div className="verify-icon">✉️</div>
          <h1>Email Verification</h1>
          <p className="verify-subtitle">
            {step === "enterEmail" && "Enter your email to receive a verification code."}
            {step === "enterOtp"   && `We sent a 6-digit code to ${email}`}
            {step === "done"       && "Your email has been verified!"}
          </p>
        </div>

        {/* Progress dots */}
        <div className="verify-progress">
          {steps.map((s, i) => (
            <div
              key={s}
              className={[
                "verify-dot",
                step === s                        ? "verify-dot--active" : "",
                steps.indexOf(step) > i           ? "verify-dot--done"   : "",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Alerts */}
        {error   && <div className="verify-alert verify-alert--error">⚠ {error}</div>}
        {success && !error && <div className="verify-alert verify-alert--success">✓ {success}</div>}

        {/* Step 1 — enter email */}
        {step === "enterEmail" && (
          <form onSubmit={handleSendOtp} className="verify-form">
            <div className="verify-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" className="verify-btn-primary" disabled={loading}>
              {loading ? <span className="verify-spinner" /> : "Send Verification Code"}
            </button>
          </form>
        )}

        {/* Step 2 — enter OTP */}
        {step === "enterOtp" && (
          <form onSubmit={handleVerifyOtp} className="verify-form">
            <div className="verify-field">
              <label>Enter 6-digit code</label>
              <OtpInput length={6} onChange={setOtp} disabled={loading} />
            </div>
            <button
              type="submit"
              className="verify-btn-primary"
              disabled={loading || otp.length < 6}
            >
              {loading ? <span className="verify-spinner" /> : "Verify Email"}
            </button>
            <ResendButton onResend={handleResend} initialDelay={60} />
            <button
              type="button"
              className="verify-btn-ghost"
              onClick={() => { setStep("enterEmail"); clearMessages(); setOtp(""); }}
            >
              ← Change email
            </button>
          </form>
        )}

        {/* Step 3 — done */}
        {step === "done" && (
          <div className="verify-done">
            <div className="verify-checkmark">✓</div>
            <p>Your email address has been successfully verified.</p>
            <Link to="/app" className="verify-btn-primary verify-btn-link">
              Go to Home →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
