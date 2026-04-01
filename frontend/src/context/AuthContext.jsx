import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function decodeToken(t) {
  try {
    return JSON.parse(atob(t.split('.')[1]))
  } catch {
    return null
  }
}

function rehydrateUser() {
  try {
    const t = localStorage.getItem('admin_token')
    if (!t) return null
    const payload = decodeToken(t)
    if (!payload) return null
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

    const fullUser = {
      ...payload,
      id:            data.user?._id          || data.user?.id       || payload?.id  || payload?._id,
      name:          data.user?.name         || payload?.name       || '',
      username:      data.user?.username     || payload?.username   || '',
      email:         data.user?.email        || payload?.email      || email,
      phone:         data.user?.phone        || payload?.phone      || '',
      isAdmin:       data.isAdmin            || payload?.isAdmin    || false,
      // ✅ FIX: always store verification flags from server response
      emailVerified: data.user?.emailVerified ?? payload?.emailVerified ?? false,
      phoneVerified: data.user?.phoneVerified ?? payload?.phoneVerified ?? false,
      isVerified:    data.user?.isVerified    ?? payload?.isVerified    ?? false,
    }

    localStorage.setItem('admin_token', t)
    localStorage.setItem('user_profile', JSON.stringify(fullUser))

    setToken(t)
    setUser(fullUser)
    setIsAdmin(fullUser.isAdmin)

    // ✅ Return fullUser so callers can check verification status immediately
    return fullUser
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
