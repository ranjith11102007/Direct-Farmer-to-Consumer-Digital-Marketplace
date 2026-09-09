'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Vaikkal error boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50/50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-charcoal-800">
              Something went wrong
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-charcoal-600">
              {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <Button variant="outline" onClick={this.handleRetry}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}