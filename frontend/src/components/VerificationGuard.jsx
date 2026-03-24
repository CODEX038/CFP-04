/**
 * VerificationGuard.jsx
 * Wraps pages that require verification.
 * Uses React Router v6 — no Next.js dependencies.
 *
 * Usage:
 *   <VerificationGuard requirePhone>
 *     <CreateCampaignForm />
 *   </VerificationGuard>
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVerification } from "../hooks/useVerification";
import "./VerificationGuard.css";

export default function VerificationGuard({
  requireEmail = true,
  requirePhone  = false,
  children,
}) {
  const navigate = useNavigate();
  const { emailVerified, phoneVerified, loading } = useVerification();

  useEffect(() => {
    if (loading) return;
    if (requireEmail && !emailVerified) {
      navigate("/verify/email", { replace: true });
      return;
    }
    if (requirePhone && !phoneVerified) {
      navigate("/verify/phone", { replace: true });
    }
  }, [loading, emailVerified, phoneVerified, requireEmail, requirePhone, navigate]);

  if (loading) {
    return (
      <div className="vguard-loading">
        <div className="vguard-spinner" />
      </div>
    );
  }

  const emailOk = !requireEmail || emailVerified;
  const phoneOk = !requirePhone || phoneVerified;
  if (!emailOk || !phoneOk) return null;

  return <>{children}</>;
}
