import { useEffect } from 'react'

type Color = 'green' | 'cyan' | 'purple' | 'fuchsia' | 'orange'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  color?: Color
  children: React.ReactNode
  footer?: React.ReactNode
}

const COLORS: Record<Color, { border: string; title: string; bar: string; btn: string }> = {
  green:   { border: 'border-[#00ff41]/30',   title: 'text-[#00ff41]',   bar: 'bg-[#00ff41]',   btn: 'border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/10' },
  cyan:    { border: 'border-[#00d4ff]/30',   title: 'text-[#00d4ff]',   bar: 'bg-[#00d4ff]',   btn: 'border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10' },
  purple:  { border: 'border-purple-400/30',  title: 'text-purple-400',  bar: 'bg-purple-400',  btn: 'border-purple-400/40 text-purple-400 hover:bg-purple-400/10' },
  fuchsia: { border: 'border-fuchsia-400/30', title: 'text-fuchsia-400', bar: 'bg-fuchsia-400', btn: 'border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10' },
  orange:  { border: 'border-orange-400/30',  title: 'text-orange-400',  bar: 'bg-orange-400',  btn: 'border-orange-400/40 text-orange-400 hover:bg-orange-400/10' },
}

export default function Modal({ isOpen, onClose, title, subtitle, color = 'cyan', children, footer }: ModalProps) {
  const c = COLORS[color]

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative w-full max-w-lg border ${c.border} bg-[#0a0a0a] rounded-lg shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-5 ${c.bar} rounded-full flex-shrink-0`} />
            <div>
              <h2 className={`text-[13px] font-bold font-mono tracking-[0.2em] ${c.title}`}>{title}</h2>
              {subtitle && (
                <p className="text-gray-600 text-[10px] font-mono tracking-[0.15em] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 font-mono text-lg leading-none ml-4 flex-shrink-0 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Reusable form field components for use inside Modal forms

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}

export function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] font-mono text-gray-700">{hint}</p>}
    </div>
  )
}

const INPUT_BASE = 'w-full bg-[#0d0d0d] border border-white/10 rounded px-3 py-2 text-[12px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-white/25 transition-colors'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input(props: InputProps) {
  return <input {...props} className={`${INPUT_BASE} ${props.className ?? ''}`} />
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea(props: TextareaProps) {
  return <textarea {...props} className={`${INPUT_BASE} resize-none ${props.className ?? ''}`} rows={props.rows ?? 3} />
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}
export function Select({ children, ...props }: SelectProps) {
  return (
    <select {...props} className={`${INPUT_BASE} ${props.className ?? ''}`}>
      {children}
    </select>
  )
}
