interface Props {
  message?: string
  onRetry?: () => void
}

export default function ErrorMessage({ message = 'CONNECTION FAILED', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 px-8 border border-red-500/30 rounded-lg bg-red-500/5 max-w-lg mx-auto mt-8">
      <div className="text-red-500 text-5xl">⊗</div>
      <div className="text-red-400 text-sm font-mono tracking-widest text-center">{message}</div>
      <div className="text-red-900 text-xs font-mono">MATRIX SIGNAL LOST</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-2 text-xs font-mono tracking-widest text-[#00ff41] border border-[#00ff41]/30 rounded hover:bg-[#00ff41]/10 hover:border-[#00ff41]/60 transition-all duration-200"
        >
          RETRY CONNECTION
        </button>
      )}
    </div>
  )
}
