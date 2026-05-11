import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">System module crashed</h2>
          <p className="text-sm text-gray-400 mb-6">
            Check console or Railway logs with the request ID for this session.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reload application
          </button>
        </div>
      </div>
    )
  }
}
