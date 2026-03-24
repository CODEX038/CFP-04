/**
 * pages/verify/PhoneVerification.jsx
 * Phone OTP verification — Vite + React + React Router v6
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import OtpInput from "../../components/OtpInput";
import ResendButton from "../../components/ResendButton";
import "./Verification.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function PhoneVerification() {
  const [step, setStep]       = useState("enterPhone"); // enterPhone | enterOtp | done
  const [phone, setPhone]     = useState("");
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
    if (!phone.trim()) return setError("Please enter your phone number.");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API}/verification/send-phone-otp`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ phone: phone.trim() }),
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
      const res   = await fetch(`${API}/verification/verify-phone-otp`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ phone: phone.trim(), otp }),
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
    const res   = await fetch(`${API}/verification/send-phone-otp`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setSuccess("OTP resent successfully.");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const steps = ["enterPhone", "enterOtp", "done"];

  return (
    <div className="verify-page">
      <div className="verify-card">

        {/* Header */}
        <div className="verify-header">
          <div className="verify-icon">📱</div>
          <h1>Phone Verification</h1>
          <p className="verify-subtitle">
            {step === "enterPhone" && "Enter your phone number to receive an SMS code."}
            {step === "enterOtp"   && `Code sent to ${phone}`}
            {step === "done"       && "Your phone has been verified!"}
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

        {/* Step 1 — enter phone */}
        {step === "enterPhone" && (
          <form onSubmit={handleSendOtp} className="verify-form">
            <div className="verify-field">
              <label htmlFor="phone">Phone Number</label>
              <span className="verify-field-hint">
                Include country code — e.g. +91 98765 43210
              </span>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                disabled={loading}
                autoComplete="tel"
                required
              />
            </div>
            <button type="submit" className="verify-btn-primary" disabled={loading}>
              {loading ? <span className="verify-spinner" /> : "Send SMS Code"}
            </button>
          </form>
        )}

        {/* Step 2 — enter OTP */}
        {step === "enterOtp" && (
          <form onSubmit={handleVerifyOtp} className="verify-form">
            <div className="verify-field">
              <label>Enter 6-digit SMS code</label>
              <OtpInput length={6} onChange={setOtp} disabled={loading} />
            </div>
            <button
              type="submit"
              className="verify-btn-primary"
              disabled={loading || otp.length < 6}
            >
              {loading ? <span className="verify-spinner" /> : "Verify Phone"}
            </button>
            <ResendButton onResend={handleResend} initialDelay={60} />
            <button
              type="button"
              className="verify-btn-ghost"
              onClick={() => { setStep("enterPhone"); clearMessages(); setOtp(""); }}
            >
              ← Change phone number
            </button>
          </form>
        )}

        {/* Step 3 — done */}
        {step === "done" && (
          <div className="verify-done">
            <div className="verify-checkmark">✓</div>
            <p>Your phone number has been verified. You can now create campaigns!</p>
            <Link to="/app" className="verify-btn-primary verify-btn-link">
              Go to Home →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
