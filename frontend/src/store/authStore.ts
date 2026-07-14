import { create } from 'zustand'
import { auth } from '../api/client'

interface User {
  id: string
  email: string
  full_name?: string
  name?: string
  role?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  verifyToken: () => Promise<void>
}

const storedToken = localStorage.getItem('datiam_token')

// Generation counter — incremented whenever login() or logout() is called so
// any in-flight verifyToken() call can detect it has become stale and bail out
// without modifying state or removing a freshly issued token.
let _verifyGen = 0

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: storedToken,
  // Start loading only when a stored token exists — ProtectedLayout shows a
  // spinner while we verify rather than flashing a redirect to /login.
  isLoading: !!storedToken,
  isAuthenticated: false,

  login: async (email, password) => {
    // Invalidate any concurrent verifyToken() call so its result is ignored.
    _verifyGen++
    set({ isLoading: true })
    try {
      const res = await auth.login(email, password)
      // Backend returns { success: true, data: { user, token } }
      const payload = res.data?.data ?? res.data
      const token: string = payload?.token || payload?.access_token || payload?.jwt || ''
      if (!token) throw new Error('Server did not return a token')
      const user: User = payload?.user ?? { id: '', email }
      localStorage.setItem('datiam_token', token)
      set({ token, user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: () => {
    _verifyGen++
    localStorage.removeItem('datiam_token')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  verifyToken: async () => {
    // Capture the current generation; if login() or logout() fires before this
    // completes, the generation changes and we discard the stale result.
    const myGen = ++_verifyGen
    const token = localStorage.getItem('datiam_token')
    if (!token) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }
    try {
      const res = await auth.me()
      if (_verifyGen !== myGen) return // stale — a login/logout happened, ignore
      const payload = res.data?.data ?? res.data
      const user: User = payload?.user ?? payload
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err: any) {
      if (_verifyGen !== myGen) return // stale — do NOT remove the new valid token
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        // Genuine auth failure — the backend explicitly rejected this token.
        localStorage.removeItem('datiam_token')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      } else {
        // Transient failure (network error, backend 5xx, timeout) — we have no
        // evidence the token itself is invalid. Keep it and stay authenticated
        // so a temporary backend outage doesn't silently sign the user out and
        // strip the Authorization header from every subsequent request.
        set({ isAuthenticated: true, isLoading: false })
      }
    }
  },
}))
