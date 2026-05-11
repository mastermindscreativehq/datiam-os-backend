interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  loading?: boolean
}

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'DELETE', onConfirm, onCancel, danger = true, loading = false }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm border border-red-500/30 bg-[#0a0a0a] rounded-lg shadow-2xl">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-red-500 rounded-full flex-shrink-0" />
            <h2 className="text-[13px] font-bold font-mono tracking-[0.2em] text-red-400">{title}</h2>
          </div>
          <p className="text-gray-500 text-[12px] font-mono ml-4 leading-relaxed">{message}</p>
        </div>
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-[10px] font-mono tracking-widest px-4 py-2 border border-white/10 text-gray-500 hover:text-gray-400 rounded transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`text-[10px] font-mono tracking-widest px-5 py-2 rounded transition-colors disabled:opacity-50 ${danger ? 'border border-red-500/40 text-red-400 hover:bg-red-500/10' : 'border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10'}`}
          >
            {loading ? 'DELETING...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
