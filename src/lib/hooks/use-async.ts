import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseAsyncReturn<T, TArgs extends unknown[]> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: TArgs) => Promise<T | null>
  reset: () => void
}

export const useAsync = <T = unknown, TArgs extends unknown[] = []>(
  asyncFunction: (...args: TArgs) => Promise<T>
): UseAsyncReturn<T, TArgs> => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: TArgs): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        const result = await asyncFunction(...args)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred'
        setState({ data: null, loading: false, error: errorMessage })
        return null
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  }
} 