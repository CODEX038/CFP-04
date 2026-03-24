import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken]   = useState(localStorage.getItem('admin_token'))
  const [user, setUser]     = useState(() => {
    try {
      const t = localStorage.getItem('admin_token')
      if (!t) return null
      const payload = JSON.parse(atob(t.split('.')[1]))
      return payload
    } catch { return null }
  })
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const t = localStorage.getItem('admin_token')
      if (!t) return false
      const payload = JSON.parse(atob(t.split('.')[1]))
      return payload.isAdmin || false
    } catch { return false }
  })

  const login = async (email, password) => {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/login`,
      { email, password }
    )
    localStorage.setItem('admin_token', data.token)
    const payload = JSON.parse(atob(data.token.split('.')[1]))
    setToken(data.token)
    setUser(payload)
    setIsAdmin(data.isAdmin)
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
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