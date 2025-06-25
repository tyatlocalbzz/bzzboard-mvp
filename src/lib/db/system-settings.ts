import { db } from './index'
import { 
  systemPlatforms, 
  systemContentTypes, 
  systemSettings,
  type SystemPlatform,
  type SystemContentType,
  type SystemSetting
} from './schema'
import { eq } from 'drizzle-orm'

// ==================== PLATFORMS ====================

/**
 * Get all system platforms (enabled and disabled)
 * DRY: Centralized platform retrieval
 */
export const getAllSystemPlatforms = async (): Promise<SystemPlatform[]> => {
  try {
    const result = await db
      .select()
      .from(systemPlatforms)
      .orderBy(systemPlatforms.name)

    return result
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting platforms:', error)
    throw new Error('Failed to fetch system platforms')
  }
}

/**
 * Get only enabled system platforms
 * DRY: Filtered platform retrieval
 */
export const getEnabledSystemPlatforms = async (): Promise<SystemPlatform[]> => {
  try {
    const result = await db
      .select()
      .from(systemPlatforms)
      .where(eq(systemPlatforms.enabled, true))
      .orderBy(systemPlatforms.name)

    return result
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting enabled platforms:', error)
    throw new Error('Failed to fetch enabled platforms')
  }
}

/**
 * Create a new system platform
 * DRY: Centralized platform creation
 */
export const createSystemPlatform = async (name: string): Promise<SystemPlatform> => {
  try {
    const [platform] = await db
      .insert(systemPlatforms)
      .values({
        name: name.trim(),
        enabled: true,
        isDefault: false
      })
      .returning()

    return platform
  } catch (error) {
    console.error('❌ [SystemSettings] Error creating platform:', error)
    throw new Error('Failed to create platform')
  }
}

/**
 * Update system platform enabled status
 * DRY: Centralized platform status update
 */
export const updateSystemPlatformStatus = async (id: number, enabled: boolean): Promise<SystemPlatform> => {
  try {
    const [platform] = await db
      .update(systemPlatforms)
      .set({ 
        enabled,
        updatedAt: new Date()
      })
      .where(eq(systemPlatforms.id, id))
      .returning()

    if (!platform) {
      throw new Error('Platform not found')
    }

    return platform
  } catch (error) {
    console.error('❌ [SystemSettings] Error updating platform status:', error)
    throw new Error('Failed to update platform status')
  }
}

/**
 * Delete a custom system platform (only non-default platforms can be deleted)
 * DRY: Centralized platform deletion with safety checks
 */
export const deleteSystemPlatform = async (id: number): Promise<boolean> => {
  try {
    // Check if it's a default platform
    const platform = await db
      .select()
      .from(systemPlatforms)
      .where(eq(systemPlatforms.id, id))
      .limit(1)

    if (!platform[0]) {
      throw new Error('Platform not found')
    }

    if (platform[0].isDefault) {
      throw new Error('Cannot delete default platform')
    }

    await db
      .delete(systemPlatforms)
      .where(eq(systemPlatforms.id, id))

    return true
  } catch (error) {
    console.error('❌ [SystemSettings] Error deleting platform:', error)
    throw new Error('Failed to delete platform')
  }
}

// ==================== CONTENT TYPES ====================

/**
 * Get all system content types (enabled and disabled)
 * DRY: Centralized content type retrieval
 */
export const getAllSystemContentTypes = async (): Promise<SystemContentType[]> => {
  try {
    const result = await db
      .select()
      .from(systemContentTypes)
      .orderBy(systemContentTypes.name)

    return result
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting content types:', error)
    throw new Error('Failed to fetch system content types')
  }
}

/**
 * Get only enabled system content types
 * DRY: Filtered content type retrieval
 */
export const getEnabledSystemContentTypes = async (): Promise<SystemContentType[]> => {
  try {
    const result = await db
      .select()
      .from(systemContentTypes)
      .where(eq(systemContentTypes.enabled, true))
      .orderBy(systemContentTypes.name)

    return result
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting enabled content types:', error)
    throw new Error('Failed to fetch enabled content types')
  }
}

/**
 * Create a new system content type
 * DRY: Centralized content type creation
 */
export const createSystemContentType = async (name: string, value: string): Promise<SystemContentType> => {
  try {
    const [contentType] = await db
      .insert(systemContentTypes)
      .values({
        name: name.trim(),
        value: value.trim().toLowerCase(),
        enabled: true,
        isDefault: false
      })
      .returning()

    return contentType
  } catch (error) {
    console.error('❌ [SystemSettings] Error creating content type:', error)
    throw new Error('Failed to create content type')
  }
}

/**
 * Update system content type enabled status
 * DRY: Centralized content type status update
 */
export const updateSystemContentTypeStatus = async (id: number, enabled: boolean): Promise<SystemContentType> => {
  try {
    const [contentType] = await db
      .update(systemContentTypes)
      .set({ 
        enabled,
        updatedAt: new Date()
      })
      .where(eq(systemContentTypes.id, id))
      .returning()

    if (!contentType) {
      throw new Error('Content type not found')
    }

    return contentType
  } catch (error) {
    console.error('❌ [SystemSettings] Error updating content type status:', error)
    throw new Error('Failed to update content type status')
  }
}

/**
 * Delete a custom system content type (only non-default content types can be deleted)
 * DRY: Centralized content type deletion with safety checks
 */
export const deleteSystemContentType = async (id: number): Promise<boolean> => {
  try {
    // Check if it's a default content type
    const contentType = await db
      .select()
      .from(systemContentTypes)
      .where(eq(systemContentTypes.id, id))
      .limit(1)

    if (!contentType[0]) {
      throw new Error('Content type not found')
    }

    if (contentType[0].isDefault) {
      throw new Error('Cannot delete default content type')
    }

    await db
      .delete(systemContentTypes)
      .where(eq(systemContentTypes.id, id))

    return true
  } catch (error) {
    console.error('❌ [SystemSettings] Error deleting content type:', error)
    throw new Error('Failed to delete content type')
  }
}

// ==================== SYSTEM SETTINGS ====================

/**
 * Get a system setting by key
 * DRY: Centralized setting retrieval
 */
export const getSystemSetting = async (key: string): Promise<SystemSetting | null> => {
  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting setting:', error)
    return null
  }
}

/**
 * Get all system settings
 * DRY: Centralized settings retrieval
 */
export const getAllSystemSettings = async (): Promise<SystemSetting[]> => {
  try {
    const result = await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.key)

    return result
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting all settings:', error)
    throw new Error('Failed to fetch system settings')
  }
}

/**
 * Upsert a system setting
 * DRY: Centralized setting management
 */
export const upsertSystemSetting = async (
  key: string, 
  value: string, 
  type: string = 'string',
  description?: string
): Promise<SystemSetting> => {
  try {
    // Try to update existing setting first
    const existing = await getSystemSetting(key)
    
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({
          value,
          type,
          description,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.key, key))
        .returning()
      
      return updated
    } else {
      // Create new setting
      const [created] = await db
        .insert(systemSettings)
        .values({
          key,
          value,
          type,
          description
        })
        .returning()
      
      return created
    }
  } catch (error) {
    console.error('❌ [SystemSettings] Error upserting setting:', error)
    throw new Error('Failed to update system setting')
  }
}

/**
 * Get system setting value with type conversion
 * DRY: Centralized typed setting retrieval
 */
export const getSystemSettingValue = async <T = string>(
  key: string, 
  defaultValue?: T
): Promise<T> => {
  try {
    const setting = await getSystemSetting(key)
    
    if (!setting) {
      return defaultValue as T
    }

    // Convert based on type
    switch (setting.type) {
      case 'boolean':
        return (setting.value === 'true') as T
      case 'number':
        return Number(setting.value) as T
      case 'json':
        return JSON.parse(setting.value) as T
      default:
        return setting.value as T
    }
  } catch (error) {
    console.error('❌ [SystemSettings] Error getting setting value:', error)
    return defaultValue as T
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get default timezone
 * DRY: Commonly used setting with fallback
 */
export const getDefaultTimezone = async (): Promise<string> => {
  return await getSystemSettingValue('default_timezone', 'America/New_York')
}

/**
 * Update default timezone
 * DRY: Commonly used setting update
 */
export const updateDefaultTimezone = async (timezone: string): Promise<SystemSetting> => {
  return await upsertSystemSetting(
    'default_timezone', 
    timezone, 
    'string', 
    'Default timezone for the application'
  )
}

/**
 * Ensure default system settings exist
 * Creates default settings if they don't exist
 */
export const ensureDefaultSettings = async (): Promise<void> => {
  try {
    // Check if default_timezone exists, if not create it
    const existingTimezone = await getSystemSetting('default_timezone')
    if (!existingTimezone) {
      console.log('🔧 [SystemSettings] Creating default timezone setting')
      await upsertSystemSetting(
        'default_timezone',
        'America/New_York',
        'string',
        'Default timezone for the application'
      )
    }
    
    // Add other default settings here as needed
    console.log('🔧 [SystemSettings] Default settings ensured')
  } catch (error) {
    console.error('❌ [SystemSettings] Error ensuring default settings:', error)
  }
} 