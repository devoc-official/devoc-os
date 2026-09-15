import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Frontend ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center rounded-md border border-devoc-status-error-border bg-devoc-status-error-bg/20 p-8 text-center my-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-devoc-status-error-bg text-devoc-status-error-text border border-devoc-status-error-border">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-devoc-text-primary">
            Application View Error
          </h3>
          <p className="mt-1 max-w-md text-xs text-devoc-text-secondary leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred in this section.'}
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={this.handleReset}
            >
              Retry Section
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
