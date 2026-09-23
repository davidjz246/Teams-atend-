import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props fields for strict TS environments
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in Attendance Tracker:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The application encountered an unexpected state. You can restore default settings or reload the page.
            </p>
            <div className="bg-slate-950/80 rounded-xl p-3 mb-6 text-left border border-slate-800/80">
              <p className="text-xs font-mono text-rose-400 break-all">
                {this.state.error?.message || 'Unknown runtime error'}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-full text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full text-xs font-mono font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
