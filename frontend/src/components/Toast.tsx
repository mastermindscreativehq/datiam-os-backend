import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isSuccess = type === 'success'

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded border font-mono text-[11px] tracking-[0.1em] shadow-lg transition-all ${
        isSuccess
          ? 'bg-[#0a0a0a] border-[#00ff41]/40 text-[#00ff41]'
          : 'bg-[#0a0a0a] border-red-500/40 text-red-400'
      }`}
      onClick={onDismiss}
      style={{ cursor: 'pointer' }}
    >
      <span className="text-base leading-none">{isSuccess ? '◆' : '◇'}</span>
      <span>{message}</span>
    </div>
  )
}
