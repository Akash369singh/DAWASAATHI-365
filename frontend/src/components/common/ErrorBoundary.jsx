import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("DawaSaathi 365 ErrorBoundary caught an error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    localStorage.removeItem("carecircle_token")
    localStorage.removeItem("carecircle_user")
    window.location.href = "/login"
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-3xl border border-red-200 dark:border-red-900/50 p-8 shadow-xl text-left">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-xl font-bold">Display Error Detected</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  DawaSaathi 365 graceful recovery active
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              An unexpected render error occurred in the interface:
            </p>
            <div className="text-xs font-mono bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 p-4 rounded-xl overflow-auto max-h-56 mb-6 border border-red-200 dark:border-red-900/40">
              <div className="font-bold mb-1">{this.state.error?.toString()}</div>
              <div className="text-[11px] opacity-80 whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="py-3.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all"
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
