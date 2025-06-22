'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ActiveShoot {
  id: number
  title: string
  client: string
  startedAt: string
}

interface ActiveShootContextType {
  activeShoot: ActiveShoot | null
  elapsedTime: string
  startShoot: (shoot: ActiveShoot) => void
  endShoot: () => void
  isShootActive: boolean
  isHydrated: boolean
}

const ActiveShootContext = createContext<ActiveShootContextType | undefined>(undefined)

export const useActiveShoot = () => {
  const context = useContext(ActiveShootContext)
  if (context === undefined) {
    throw new Error('useActiveShoot must be used within an ActiveShootProvider')
  }
  return context
}

interface ActiveShootProviderProps {
  children: ReactNode
}

export const ActiveShootProvider = ({ children }: ActiveShootProviderProps) => {
  const [activeShoot, setActiveShoot] = useState<ActiveShoot | null>(null)
  const [elapsedTime, setElapsedTime] = useState('0:00:00')
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydration effect - restore from localStorage immediately on client
  useEffect(() => {
    const restoreActiveShoot = () => {
      try {
        const stored = localStorage.getItem('activeShoot')
        if (stored) {
          const parsedShoot = JSON.parse(stored)
          // Validate the stored data has required fields
          if (parsedShoot && parsedShoot.id && parsedShoot.startedAt) {
            setActiveShoot(parsedShoot)
          } else {
            localStorage.removeItem('activeShoot')
          }
        }
      } catch (error) {
        console.error('Failed to restore active shoot:', error)
        localStorage.removeItem('activeShoot')
      } finally {
        setIsHydrated(true)
      }
    }

    restoreActiveShoot()

    // Listen for visibility changes to re-sync if needed
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Re-check localStorage when tab becomes visible
        const stored = localStorage.getItem('activeShoot')
        if (stored) {
          try {
            const parsedShoot = JSON.parse(stored)
            if (parsedShoot && parsedShoot.id && parsedShoot.startedAt) {
              // Only set if we don't currently have an active shoot
              setActiveShoot(prev => prev ? prev : parsedShoot)
            }
          } catch (error) {
            console.error('Failed to re-sync active shoot:', error)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Empty dependency array is correct - we want this to run once on mount

  // Timer effect
  useEffect(() => {
    if (!activeShoot) {
      setElapsedTime('0:00:00')
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const startTime = new Date(activeShoot.startedAt)
      const elapsed = now.getTime() - startTime.getTime()
      
      // Prevent negative elapsed time
      if (elapsed < 0) {
        setElapsedTime('0:00:00')
        return
      }
      
      const hours = Math.floor(elapsed / (1000 * 60 * 60))
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
      
      setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeShoot])

  // Persist active shoot to localStorage (only after hydration)
  useEffect(() => {
    if (!isHydrated) return
    
    if (activeShoot) {
      localStorage.setItem('activeShoot', JSON.stringify(activeShoot))
    } else {
      localStorage.removeItem('activeShoot')
    }
  }, [activeShoot, isHydrated])

  const startShoot = (shoot: ActiveShoot) => {
    setActiveShoot(shoot)
    // Immediately persist to localStorage
    localStorage.setItem('activeShoot', JSON.stringify(shoot))
  }

  const endShoot = () => {
    setActiveShoot(null)
    // Immediately remove from localStorage
    localStorage.removeItem('activeShoot')
  }

  const isShootActive = activeShoot !== null

  return (
    <ActiveShootContext.Provider
      value={{
        activeShoot,
        elapsedTime,
        startShoot,
        endShoot,
        isShootActive,
        isHydrated
      }}
    >
      {children}
    </ActiveShootContext.Provider>
  )
} 