/**
 * ResendButton.jsx
 * Countdown timer + resend button — Vite + React
 */

import { useState, useEffect, useCallback } from "react";
import "./ResendButton.css";

export default function ResendButton({ onResend, initialDelay = 60, disabled = false }) {
  const [secondsLeft, setSecondsLeft] = useState(initialDelay);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleClick = useCallback(async () => {
    if (loading || secondsLeft > 0 || disabled) return;
    setLoading(true);
    try {
      await onResend?.();
    } finally {
      setLoading(false);
      setSecondsLeft(initialDelay);
    }
  }, [onResend, loading, secondsLeft, disabled, initialDelay]);

  return (
    <div className="resend-wrap">
      {secondsLeft > 0 ? (
        <p className="resend-timer">
          Resend OTP in <strong>{secondsLeft}s</strong>
        </p>
      ) : (
        <button
          type="button"
          className={`resend-btn${loading ? " resend-btn--loading" : ""}`}
          onClick={handleClick}
          disabled={loading || disabled}
        >
          {loading ? "Sending…" : "Resend OTP"}
        </button>
      )}
    </div>
  );
}
