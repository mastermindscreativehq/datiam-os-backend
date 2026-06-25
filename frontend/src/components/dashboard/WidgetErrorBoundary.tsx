import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Widget: ${this.props.title}] render error`, {
      message: error.message,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="px-5 py-5 flex items-center justify-between">
        <span className="text-[11px] font-mono text-red-400/60 tracking-widest">
          ⚠ Widget crashed
        </span>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="text-[10px] font-mono text-red-400/40 hover:text-red-400 tracking-widest transition-colors"
        >
          RETRY
        </button>
      </div>
    )
  }
}
