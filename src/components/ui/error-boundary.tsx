'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { EmptyState } from './empty-state'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4">
          <EmptyState
            icon={AlertTriangle}
            title="Something went wrong"
            description="We encountered an unexpected error. Please try again."
            action={{
              label: "Try Again",
              children: (
                <div className="space-y-4">
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="text-left text-xs text-gray-500 p-2 bg-gray-50 rounded">
                      <summary className="cursor-pointer">Error details</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
                    </details>
                  )}
                  <Button onClick={this.handleReset} className="tap-target">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )
            }}
          />
        </div>
      )
    }

    return this.props.children
  }
} 