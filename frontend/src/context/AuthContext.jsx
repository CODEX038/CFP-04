import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Decode JWT payload safely ─────────────────────────────────────────────────
function decodeToken(t) {
  try {
    return JSON.parse(atob(t.split('.')[1]))
  } catch {
    return null
  }
}

// ── Rehydrate user from stored token on page load ─────────────────────────────
function rehydrateUser() {
  try {
    const t = localStorage.getItem('admin_token')
    if (!t) return null
    const payload = decodeToken(t)
    if (!payload) return null

    // Merge stored profile if available (richer data than JWT payload alone)
    const stored = localStorage.getItem('user_profile')
    if (stored) {
      return { ...payload, ...JSON.parse(stored) }
    }
    return payload
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken]     = useState(localStorage.getItem('admin_token'))
  const [user, setUser]       = useState(rehydrateUser)
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const t = localStorage.getItem('admin_token')
      if (!t) return false
      return decodeToken(t)?.isAdmin || false
    } catch { return false }
  })

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password })

    const t       = data.token
    const payload = decodeToken(t)

    // Build a rich user object — backend may return user fields directly
    // or only inside the JWT. We merge both so nothing is lost.
    const fullUser = {
      ...payload,
      // Explicit overrides from the login response body (richer than JWT)
      id:       data.user?._id       || data.user?.id  || payload?.id  || payload?._id,
      name:     data.user?.name      || payload?.name  || '',
      username: data.user?.username  || payload?.username || '',
      email:    data.user?.email     || payload?.email || email,
      phone:    data.user?.phone     || payload?.phone || '',
      isAdmin:  data.isAdmin         || payload?.isAdmin || false,
    }

    localStorage.setItem('admin_token', t)
    localStorage.setItem('user_profile', JSON.stringify(fullUser))

    setToken(t)
    setUser(fullUser)
    setIsAdmin(fullUser.isAdmin)
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('user_profile')
    setToken(null)
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
