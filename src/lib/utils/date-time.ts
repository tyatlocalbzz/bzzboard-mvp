/**
 * Centralized date/time utilities for the BzzBoard application
 * Eliminates duplication of formatting functions across components
 */

export interface DateFormatOptions {
  /** Show relative dates like "Today", "Tomorrow", "Yesterday" */
  relative?: boolean
  /** Include weekday in the format */
  weekday?: boolean
  /** Include year in the format */
  year?: boolean
}

export interface TimeFormatOptions {
  /** Use 12-hour format (default: true) */
  hour12?: boolean
  /** Show seconds (default: false) */
  includeSeconds?: boolean
}

export interface DurationFormatOptions {
  /** Format style: 'short' (1h 30m) or 'long' (1 hour 30 minutes) */
  style?: 'short' | 'long'
  /** Show zero values (default: false) */
  showZero?: boolean
}

/**
 * Centralized date/time formatting utilities
 * Used across shoots, calendar, and other time-sensitive features
 */
export const dateTimeUtils = {
  /**
   * Format a date string with optional relative display
   * @param dateString - ISO date string or date-like string
   * @param options - Formatting options
   * @returns Formatted date string
   * 
   * @example
   * formatDate('2024-01-15T10:00:00Z') // "Mon, Jan 15"
   * formatDate('2024-01-15T10:00:00Z', { relative: true }) // "Today" or "Tomorrow"
   */
  formatDate: (dateString: string, options: DateFormatOptions = {}): string => {
    const date = new Date(dateString)
    const now = new Date()
    
    // Handle relative dates
    if (options.relative !== false) { // Default to true for relative
      const diffTime = date.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Tomorrow'
      if (diffDays === -1) return 'Yesterday'
    }
    
    // Build format options
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric'
    }
    
    if (options.weekday) {
      formatOptions.weekday = 'short'
    }
    
    if (options.year || date.getFullYear() !== now.getFullYear()) {
      formatOptions.year = 'numeric'
    }
    
    return date.toLocaleDateString('en-US', formatOptions)
  },

  /**
   * Format a time string for display
   * @param dateString - ISO date string or date-like string
   * @param options - Time formatting options
   * @returns Formatted time string
   * 
   * @example
   * formatTime('2024-01-15T14:30:00Z') // "2:30 PM"
   * formatTime('2024-01-15T14:30:45Z', { includeSeconds: true }) // "2:30:45 PM"
   */
  formatTime: (dateString: string, options: TimeFormatOptions = {}): string => {
    const { hour12 = true, includeSeconds = false } = options
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12
    }
    
    if (includeSeconds) {
      formatOptions.second = '2-digit'
    }
    
    return new Date(dateString).toLocaleTimeString('en-US', formatOptions)
  },

  /**
   * Format duration in minutes to human-readable format
   * @param minutes - Duration in minutes
   * @param options - Duration formatting options
   * @returns Formatted duration string
   * 
   * @example
   * formatDuration(90) // "1h 30m"
   * formatDuration(90, { style: 'long' }) // "1 hour 30 minutes"
   * formatDuration(45) // "45m"
   */
  formatDuration: (minutes: number, options: DurationFormatOptions = {}): string => {
    const { style = 'short', showZero = false } = options
    
    if (minutes < 60) {
      if (style === 'long') {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`
      }
      return `${minutes}m`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0 && !showZero) {
      if (style === 'long') {
        return `${hours} hour${hours !== 1 ? 's' : ''}`
      }
      return `${hours}h`
    }
    
    if (style === 'long') {
      const hourText = `${hours} hour${hours !== 1 ? 's' : ''}`
      const minuteText = remainingMinutes > 0 || showZero 
        ? `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}` 
        : ''
      return [hourText, minuteText].filter(Boolean).join(' ')
    }
    
    return remainingMinutes > 0 || showZero 
      ? `${hours}h ${remainingMinutes}m` 
      : `${hours}h`
  },

  /**
   * Format a date range for display
   * @param startDate - Start date string
   * @param endDate - End date string
   * @param options - Formatting options
   * @returns Formatted date range string
   * 
   * @example
   * formatDateRange('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z') // "Jan 15, 10:00 AM - 12:00 PM"
   * formatDateRange('2024-01-15T10:00:00Z', '2024-01-16T10:00:00Z') // "Jan 15 - Jan 16"
   */
  formatDateRange: (startDate: string, endDate: string, options: DateFormatOptions = {}): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Same day - show date with time range
    if (start.toDateString() === end.toDateString()) {
      const dateStr = dateTimeUtils.formatDate(startDate, options)
      const startTime = dateTimeUtils.formatTime(startDate)
      const endTime = dateTimeUtils.formatTime(endDate)
      return `${dateStr}, ${startTime} - ${endTime}`
    }
    
    // Different days - show date range
    const startStr = dateTimeUtils.formatDate(startDate, options)
    const endStr = dateTimeUtils.formatDate(endDate, options)
    return `${startStr} - ${endStr}`
  },

  /**
   * Format elapsed time for active shoot timer
   * @param startTime - Start time string
   * @param currentTime - Current time (optional, defaults to now)
   * @returns Formatted elapsed time string (H:MM:SS)
   * 
   * @example
   * formatElapsedTime('2024-01-15T10:00:00Z') // "1:23:45"
   */
  formatElapsedTime: (startTime: string, currentTime?: Date): string => {
    const start = new Date(startTime)
    const now = currentTime || new Date()
    const elapsed = now.getTime() - start.getTime()
    
    // Prevent negative elapsed time
    if (elapsed < 0) {
      return '0:00:00'
    }
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60))
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  },

  /**
   * Get a user-friendly relative date description
   * @param dateString - Date string to describe
   * @returns Relative description
   * 
   * @example
   * getRelativeDescription('2024-01-15T10:00:00Z') // "in 2 days" or "2 days ago"
   */
  getRelativeDescription: (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays === -1) return 'yesterday'
    if (diffDays > 1) return `in ${diffDays} days`
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
    
    return dateTimeUtils.formatDate(dateString)
  },

  /**
   * Check if a date is today
   * @param dateString - Date string to check
   * @returns True if the date is today
   */
  isToday: (dateString: string): boolean => {
    const date = new Date(dateString)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  },

  /**
   * Check if a date is in the past
   * @param dateString - Date string to check
   * @returns True if the date is in the past
   */
  isPast: (dateString: string): boolean => {
    const date = new Date(dateString)
    const now = new Date()
    return date.getTime() < now.getTime()
  },

  /**
   * Get the current date in YYYY-MM-DD format for input fields
   * @returns Today's date in YYYY-MM-DD format
   */
  getTodayInputFormat: (): string => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  },

  /**
   * Parse and validate a date string
   * @param dateString - Date string to parse
   * @returns Parsed Date object or null if invalid
   */
  parseDate: (dateString: string): Date | null => {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  }
}

// Export individual functions for convenience
export const {
  formatDate,
  formatTime,
  formatDuration,
  formatDateRange,
  formatElapsedTime,
  getRelativeDescription,
  isToday,
  isPast,
  getTodayInputFormat,
  parseDate
} = dateTimeUtils 