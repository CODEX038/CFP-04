/**
 * VerificationBadge.jsx
 * Shows email / phone verification status as a badge.
 * Usage: <VerificationBadge type="email" verified={true} />
 */

import "./VerificationBadge.css";

export default function VerificationBadge({ type = "email", verified = false }) {
  const label = type === "email" ? "Email" : "Phone";
  return (
    <span className={`vbadge ${verified ? "vbadge--verified" : "vbadge--unverified"}`}>
      {verified ? "✓" : "!"} {label} {verified ? "Verified" : "Unverified"}
    </span>
  );
}
