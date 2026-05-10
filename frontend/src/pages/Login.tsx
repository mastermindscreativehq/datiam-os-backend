import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp
  } catch {
    return true // malformed token — treat as expired
  }
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const login           = useAuthStore((s) => s.login)
  const verifyToken     = useAuthStore((s) => s.verifyToken)
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate        = useNavigate()

  useEffect(() => {
    // Drop tokens that are already expired so verifyToken doesn't waste a
    // round-trip and the race condition (stale 401 removing a fresh token) can't
    // happen for the most common "returning with old token" scenario.
    const stored = localStorage.getItem('datiam_token')
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem('datiam_token')
    }
    verifyToken()
  }, []) // verifyToken is a stable Zustand action — omitting from deps is intentional

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'AUTHENTICATION FAILED — CHECK CREDENTIALS'
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center matrix-bg relative overflow-hidden">
      <div className="scanline-anim" />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-r border-b border-[#00ff41]/10" />
      <div className="absolute top-0 right-0 w-32 h-32 border-l border-b border-[#00ff41]/10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-r border-t border-[#00ff41]/10" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-l border-t border-[#00ff41]/10" />

      <div className="w-full max-w-sm px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-[#00ff41] text-5xl font-bold font-mono tracking-[0.35em] text-glow-green mb-2">
            DATIAM
          </div>
          <div className="text-[#00d4ff] text-lg font-mono tracking-[0.6em] mb-1">
            OS
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#00ff41]/30" />
            <div className="text-[#00ff41]/40 text-[10px] font-mono tracking-[0.3em]">v3.0</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#00ff41]/30" />
          </div>
          <div className="text-gray-700 text-[10px] font-mono tracking-widest mt-3">
            MATRIX INTELLIGENCE PLATFORM
          </div>
        </div>

        {/* Card */}
        <div className="border border-[#00ff41]/20 rounded-lg p-7 bg-[#0d0d0d] glow-green">
          <div className="text-[#00ff41]/50 text-[10px] font-mono tracking-[0.25em] mb-6 uppercase">
            Operator Authentication
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono tracking-[0.2em] text-gray-600 block mb-1.5">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111] border border-[#00ff41]/15 rounded px-4 py-2.5 text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#00ff41]/50 transition-colors placeholder-gray-700"
                placeholder="operator@datiam.os"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono tracking-[0.2em] text-gray-600 block mb-1.5">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#00ff41]/15 rounded px-4 py-2.5 text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#00ff41]/50 transition-colors placeholder-gray-700"
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-red-400 text-[11px] font-mono tracking-wider border border-red-500/25 rounded px-4 py-3 bg-red-500/5">
                ⊗ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-[#00ff41]/8 border border-[#00ff41]/30 text-[#00ff41] font-mono text-xs tracking-[0.3em] rounded hover:bg-[#00ff41]/15 hover:border-[#00ff41]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 glow-green"
            >
              {isLoading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-gray-800 text-[10px] font-mono tracking-wider">
          DATIAM OS © 2024 — AUTHORIZED ACCESS ONLY
        </div>
      </div>
    </div>
  )
}
