import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-tactical-900 border border-rose-800 text-slate-100 max-w-2xl mx-auto my-8 space-y-4 shadow-2xl">
          <div className="flex items-center space-x-3 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-lg font-bold">
              {this.props.fallbackTitle || 'Component Render Error'}
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            An unexpected error occurred while rendering this module.
          </p>
          {this.state.error && (
            <div className="p-3 bg-tactical-950 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-army-600 hover:bg-army-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Module</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
