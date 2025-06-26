import { useState, useEffect, useCallback, useRef } from 'react'
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

  // Use refs to store current callback values to prevent infinite loops
  const onErrorRef = useRef(onError)
  const onSuccessRef = useRef(onSuccess)
  
  // Update refs when callbacks change
  onErrorRef.current = onError
  onSuccessRef.current = onSuccess

  // Stable callback references that use current ref values
  const callOnError = useCallback((error: string) => {
    onErrorRef.current?.(error)
  }, [])
  
  const callOnSuccess = useCallback((data: T) => {
    onSuccessRef.current?.(data)
  }, [])

  const fetchData = useCallback(async (forceRefresh = false): Promise<T> => {
    // Add cache-busting parameter for force refresh
    const url = forceRefresh ? `${endpoint}?_t=${Date.now()}` : endpoint
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data')
    }
    
    // Apply transformation if provided
    const transformedData = transform ? transform(result) : result.data
    
    return transformedData
  }, [endpoint, transform])

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await fetchData(forceRefresh)
      
      setData(result)
      callOnSuccess(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      console.error('❌ [useApiData] Error in loadData:', errorMessage)
      setError(errorMessage)
      callOnError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, callOnError, callOnSuccess])
  // Note: isLoading intentionally omitted to prevent stale closure issues

  const refresh = useCallback(async () => {
    await loadData(true) // Force refresh to bypass cache
  }, [loadData, endpoint])

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
      // Inline the fetch logic to avoid dependency cycles with fetchData
      const executeLoad = async () => {
        try {
          setIsLoading(true)
          setError(null)
          
          // Inline fetch logic to avoid fetchData dependency
          const response = await fetch(endpoint)
          
          if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`)
          }
          
          const apiResult = await response.json()
          
          if (!apiResult.success) {
            throw new Error(apiResult.error || 'Failed to fetch data')
          }
          
          // Apply transformation if provided
          const result = transform ? transform(apiResult) : apiResult.data
          
          setData(result)
          callOnSuccess(result)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
          console.error('❌ [useApiData] Error in executeLoad:', errorMessage)
          setError(errorMessage)
          callOnError(errorMessage)
          toast.error(errorMessage)
        } finally {
          setIsLoading(false)
        }
      }
      
      executeLoad()
    }
  }, [endpoint, autoFetch, transform, callOnError, callOnSuccess, ...dependencies])

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