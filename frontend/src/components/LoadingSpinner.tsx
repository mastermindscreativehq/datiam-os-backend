interface Props {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ text = 'LOADING...', size = 'md' }: Props) {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16'
  return (
    <div className="flex flex-col items-center gap-5">
      <div className={`relative ${dim}`}>
        <div className="absolute inset-0 border-2 border-[#00ff41]/15 rounded-full" />
        <div className="absolute inset-0 border-2 border-transparent border-t-[#00ff41] rounded-full animate-spin" />
        <div className="absolute inset-2 border-2 border-transparent border-t-[#00d4ff] rounded-full spin-ccw" />
        <div className="absolute inset-4 w-1 h-1 bg-[#00ff41] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <div className="text-[#00ff41] text-xs font-mono tracking-[0.3em] text-glow-green animate-pulse">
        {text}
      </div>
    </div>
  )
}
