import { useState, useCallback } from 'react'

export interface AsyncState<T> {
  loading: boolean
  error: string | null
  data: T | null
}

export const useAsync = <T, Args extends unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>
) => {
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: null
  })

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      try {
        const result = await asyncFunction(...args)
        setState({ loading: false, error: null, data: result })
        return result
      } catch (err) {
        const error = err instanceof Error ? err.message : 'An error occurred'
        setState({ loading: false, error, data: null })
        return null
      }
    },
    [asyncFunction]
  )

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

// Custom hook for hydration-safe date operations
export const useHydrationSafeDate = () => {
  const [isHydrated, setIsHydrated] = useState(false)
  
  useState(() => {
    // This will only run on client-side
    if (typeof window !== 'undefined') {
      setIsHydrated(true)
    }
  })

  const getTodayString = useCallback(() => {
    if (!isHydrated) {
      // Return a fallback date during SSR
      return '2024-01-15'
    }
    return new Date().toISOString().split('T')[0]
  }, [isHydrated])

  const getCurrentTimestamp = useCallback(() => {
    if (!isHydrated) {
      // Return a fallback timestamp during SSR
      return 1705329600000 // 2024-01-15 10:00:00 UTC
    }
    return Date.now()
  }, [isHydrated])

  return {
    isHydrated,
    getTodayString,
    getCurrentTimestamp
  }
} 