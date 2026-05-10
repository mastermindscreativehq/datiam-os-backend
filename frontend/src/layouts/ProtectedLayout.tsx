import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)
  const verifyToken     = useAuthStore((s) => s.verifyToken)
  const navigate        = useNavigate()

  useEffect(() => {
    verifyToken()
  }, []) // verifyToken is a stable Zustand action — omitting from deps is intentional

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] matrix-bg">
        <div className="scanline-anim" />
        <LoadingSpinner text="INITIALIZING MATRIX..." size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] matrix-bg">
      <div className="scanline-anim" />
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
