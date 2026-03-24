/**
 * useVerification.js
 * Fetches the logged-in user's verification status from the backend.
 * Vite + React — no Next.js dependencies.
 *
 * Usage:
 *   const { emailVerified, phoneVerified, canCreateCampaign, loading } = useVerification();
 */

import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function useVerification() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // adjust if you store JWT differently
      const res = await fetch(`${API}/verification/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setStatus(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...status,
    loading,
    error,
    refetch: fetchStatus,
  };
}
