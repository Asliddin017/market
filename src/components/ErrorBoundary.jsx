import { Component } from 'react'

// ---------------------------------------------------------------------------
// Catches any runtime error in the React tree and shows a readable fallback
// instead of an all-white blank screen (the default behaviour of a production
// React build when a render throws). Also logs the error to the console so the
// real cause is visible during debugging.
// ---------------------------------------------------------------------------
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Sahifani chizishda xatolik:', error, info)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-strong w-full max-w-lg rounded-3xl p-8 text-center">
            <span className="text-5xl">⚠️</span>
            <h1 className="mt-4 font-display text-2xl font-extrabold">Nimadir xato ketdi</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sahifani chizishda kutilmagan xatolik yuz berdi.
            </p>
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-ink-950/60 p-3 text-left text-xs text-rose-300">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
            <button onClick={this.handleReload} className="btn-primary mt-5">
              🔄 Qayta yuklash
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
