import { useState, useEffect, useCallback } from 'react'

// FIX: was VITE_API_URL + "/api" → double /api bug
// Now: VITE_API_URL already set to base, we add /api once here
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

export function useVerification() {
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API}/verification/status`, {  // ✅ fixed URL
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setStatus(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return {
    ...status,
    loading,
    error,
    refetch: fetchStatus,
  }
}