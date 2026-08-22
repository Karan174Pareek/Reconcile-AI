import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary Caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative min-h-screen bg-navy-950 flex items-center justify-center p-6 text-text-primary font-sans">
          <div className="ambient-glow-teal" />
          <div className="ambient-glow-amber" />

          <div className="relative z-10 glass-panel border border-white/15 rounded-3xl p-8 max-w-lg w-full shadow-glass space-y-6 text-center animate-fadeIn">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-coral-950/60 border border-coral-500/30 flex items-center justify-center text-coral-400 shadow-glow-amber">
              <AlertOctagon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Something went wrong</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                An unexpected interface or network stream error occurred. Your reconciliation data is securely persisted in the database.
              </p>
            </div>

            {this.state.error && (
              <div className="glass-panel-subtle border border-white/5 rounded-xl p-3 text-left font-mono text-[11px] text-coral-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold shadow-glow-teal transition-all active:scale-98"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
