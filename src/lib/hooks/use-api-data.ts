import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface ApiDataOptions<T> {
  endpoint: string
  dependencies?: unknown[]
  autoFetch?: boolean
  transform?: (data: unknown) => T
  onError?: (error: string) => void
  onSuccess?: (data: T) => void
}

interface ApiDataReturn<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateData: (updates: Partial<T> | ((prev: T | null) => T | null)) => void
}

/**
 * Generic API data fetching hook with standardized patterns
 * Eliminates duplication across all data hooks following DRY principles
 */
export const useApiData = <T>({
  endpoint,
  dependencies = [],
  autoFetch = true,
  transform,
  onError,
  onSuccess
}: ApiDataOptions<T>): ApiDataReturn<T> => {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  // Memoize callbacks to prevent infinite loops when passed as inline functions
  const memoizedOnError = useCallback((error: string) => {
    onError?.(error)
  }, [onError])

  const memoizedOnSuccess = useCallback((data: T) => {
    onSuccess?.(data)
  }, [onSuccess])

  const fetchData = useCallback(async (forceRefresh = false): Promise<T> => {
    // Add cache-busting parameter for force refresh
    const url = forceRefresh ? `${endpoint}?_t=${Date.now()}` : endpoint
    console.log('🌐 [useApiData] Fetching from:', url)
    
    const response = await fetch(url)
    console.log('🌐 [useApiData] Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('🌐 [useApiData] Raw API response:', result)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data')
    }
    
    console.log('🌐 [useApiData] API data before transform:', result.data)
    
    // Apply transformation if provided
    const transformedData = transform ? transform(result) : result.data
    console.log('🌐 [useApiData] Final transformed data:', transformedData)
    
    return transformedData
  }, [endpoint, transform])

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await fetchData(forceRefresh)
      
      setData(result)
      memoizedOnSuccess(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
      memoizedOnError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, memoizedOnError, memoizedOnSuccess])

  const refresh = useCallback(async () => {
    await loadData(true) // Force refresh to bypass cache
  }, [loadData])

  const updateData = useCallback((updates: Partial<T> | ((prev: T | null) => T | null)) => {
    setData(prev => {
      if (typeof updates === 'function') {
        return updates(prev)
      }
      return prev ? { ...prev, ...updates } : null
    })
  }, [])

  useEffect(() => {
    if (autoFetch) {
      loadData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, loadData, ...dependencies])

  return {
    data,
    isLoading,
    error,
    refresh,
    updateData
  }
}

/**
 * Specialized hook for array-based data with item updates
 */
export const useApiListData = <T extends { id: number | string }>({
  endpoint,
  dependencies = [],
  autoFetch = true,
  transform,
  onError,
  onSuccess
}: ApiDataOptions<T[]>): ApiDataReturn<T[]> & {
  updateItem: (id: number | string, updates: Partial<T>) => void
  addItem: (item: T) => void
  removeItem: (id: number | string) => void
} => {
  const { data, isLoading, error, refresh, updateData } = useApiData<T[]>({
    endpoint,
    dependencies,
    autoFetch,
    transform,
    onError,
    onSuccess
  })

  const updateItem = useCallback((id: number | string, updates: Partial<T>) => {
    updateData(prev => 
      prev?.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ) || null
    )
  }, [updateData])

  const addItem = useCallback((item: T) => {
    updateData(prev => prev ? [item, ...prev] : [item])
  }, [updateData])

  const removeItem = useCallback((id: number | string) => {
    updateData(prev => prev?.filter(item => item.id !== id) || null)
  }, [updateData])

  return {
    data,
    isLoading,
    error,
    refresh,
    updateData,
    updateItem,
    addItem,
    removeItem
  }
}

/**
 * Hook for API mutations (POST, PUT, PATCH, DELETE)
 */
export const useApiMutation = <TData = unknown, TVariables = unknown>(
  endpoint: string | ((variables: TVariables) => string),
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      setIsLoading(true)
      setError(null)

      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `${method} request failed`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || `${method} request failed`)
      }

      return result.data || result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `${method} request failed`
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, method])

  return {
    mutate,
    isLoading,
    error
  }
} 