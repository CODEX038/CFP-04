/**
 * OtpInput.jsx
 * 6-box OTP input — works with Vite + React (no Next.js dependencies)
 */

import { useRef, useState, useEffect } from "react";
import "./OtpInput.css";

export default function OtpInput({ length = 6, onChange, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = val;
    setValues(next);
    onChange?.(next.join(""));
    if (val && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        const next = [...values];
        next[index] = "";
        setValues(next);
        onChange?.(next.join(""));
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft"  && index > 0)          refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const next = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setValues(next);
    onChange?.(next.join(""));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-grid" onPaste={handlePaste}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`otp-cell${v ? " otp-cell--filled" : ""}${disabled ? " otp-cell--disabled" : ""}`}
          autoComplete="one-time-code"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
