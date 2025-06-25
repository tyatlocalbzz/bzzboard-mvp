import { db } from './index'
import { users, userActivities } from './schema'
import { eq, desc } from 'drizzle-orm'
import type { User, NewUser, UserActivity } from './schema'

// Types for enhanced user operations
export interface UpdateUserData {
  name?: string
  email?: string
}

export interface UserActivityData {
  userId: number
  action: 'created' | 'updated' | 'role_changed' | 'status_changed' | 'deleted' | 'invited' | 'resent_invite'
  details: Record<string, unknown>
  performedBy: number
}

export interface UserWithActivity extends User {
  lastActivity?: Date
  activityCount?: number
}

// Activity logging function
export const logUserActivity = async (activityData: UserActivityData): Promise<void> => {
  try {
    await db.insert(userActivities).values({
      userId: activityData.userId,
      action: activityData.action,
      details: activityData.details,
      performedBy: activityData.performedBy
    })
    
    console.log(`📝 [UserActivity] Logged activity: ${activityData.action} for user ${activityData.userId} by ${activityData.performedBy}`)
  } catch (error) {
    console.error('❌ [UserActivity] Failed to log activity:', error)
    // Don't throw - activity logging shouldn't break the main operation
  }
}

// Get all users with enhanced data
export const getAllUsersEnhanced = async (): Promise<User[]> => {
  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
    
    console.log(`📊 [UsersEnhanced] Retrieved ${allUsers.length} users`)
    return allUsers
  } catch (error) {
    console.error('❌ [UsersEnhanced] Error fetching users:', error)
    throw error
  }
}

// Update user details with activity logging
export const updateUserDetails = async (
  id: number, 
  updates: UpdateUserData, 
  performedBy: number
): Promise<User> => {
  try {
    console.log(`🔄 [UsersEnhanced] Updating user ${id} with:`, updates)
    
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    if (!updatedUser) {
      throw new Error('User not found')
    }

    // Log the activity
    await logUserActivity({
      userId: id,
      action: 'updated',
      details: {
        changes: updates,
        updatedFields: Object.keys(updates)
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] User ${id} updated successfully`)
    return updatedUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error updating user ${id}:`, error)
    throw error
  }
}

// Change user status with activity logging
export const changeUserStatus = async (
  id: number, 
  status: 'active' | 'inactive', 
  performedBy: number
): Promise<User> => {
  try {
    console.log(`🔄 [UsersEnhanced] Changing user ${id} status to: ${status}`)
    
    // Get current user to check existing status
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (currentUser.length === 0) {
      throw new Error('User not found')
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log the activity
    await logUserActivity({
      userId: id,
      action: 'status_changed',
      details: {
        previousStatus: currentUser[0].status,
        newStatus: status
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] User ${id} status changed to ${status}`)
    return updatedUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error changing user ${id} status:`, error)
    throw error
  }
}

// Change user role with activity logging
export const changeUserRole = async (
  id: number, 
  role: 'admin' | 'user', 
  performedBy: number
): Promise<User> => {
  try {
    console.log(`🔄 [UsersEnhanced] Changing user ${id} role to: ${role}`)
    
    // Get current user to check existing role
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (currentUser.length === 0) {
      throw new Error('User not found')
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log the activity
    await logUserActivity({
      userId: id,
      action: 'role_changed',
      details: {
        previousRole: currentUser[0].role,
        newRole: role
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] User ${id} role changed to ${role}`)
    return updatedUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error changing user ${id} role:`, error)
    throw error
  }
}

// Soft delete user with activity logging (deactivate)
export const deactivateUser = async (id: number, performedBy: number): Promise<User> => {
  try {
    console.log(`🔄 [UsersEnhanced] Deactivating user ${id}`)
    
    // Get user details before deactivation for logging
    const userToDeactivate = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (userToDeactivate.length === 0) {
      throw new Error('User not found')
    }

    // Change status to inactive
    const [updatedUser] = await db
      .update(users)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log the activity
    await logUserActivity({
      userId: id,
      action: 'status_changed',
      details: {
        previousStatus: userToDeactivate[0].status,
        newStatus: 'inactive',
        action: 'deactivated'
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] User ${id} deactivated (set to inactive)`)
    return updatedUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error deactivating user ${id}:`, error)
    throw error
  }
}

// Hard delete user with activity logging (permanent removal)
export const hardDeleteUser = async (id: number, performedBy: number): Promise<void> => {
  try {
    console.log(`🗑️ [UsersEnhanced] Hard deleting user ${id}`)
    
    // Get user details before deletion for logging
    const userToDelete = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (userToDelete.length === 0) {
      throw new Error('User not found')
    }

    // Log the activity BEFORE deletion (since user will be gone)
    await logUserActivity({
      userId: id,
      action: 'deleted',
      details: {
        userEmail: userToDelete[0].email,
        userName: userToDelete[0].name,
        deletionType: 'hard',
        deletedAt: new Date().toISOString()
      },
      performedBy
    })

    // Hard delete the user (this will cascade to related records if FK constraints are set)
    await db
      .delete(users)
      .where(eq(users.id, id))

    console.log(`✅ [UsersEnhanced] User ${id} hard deleted (permanently removed)`)
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error hard deleting user ${id}:`, error)
    throw error
  }
}

// Legacy function for backward compatibility
export const softDeleteUser = async (id: number, performedBy: number): Promise<void> => {
  await deactivateUser(id, performedBy)
}

// Get user activities
export const getUserActivities = async (userId: number): Promise<UserActivity[]> => {
  try {
    const activities = await db
      .select({
        id: userActivities.id,
        userId: userActivities.userId,
        action: userActivities.action,
        details: userActivities.details,
        performedBy: userActivities.performedBy,
        createdAt: userActivities.createdAt,
        // Include performer details
        performerName: users.name,
        performerEmail: users.email
      })
      .from(userActivities)
      .leftJoin(users, eq(userActivities.performedBy, users.id))
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(50) // Limit to last 50 activities

    console.log(`📊 [UsersEnhanced] Retrieved ${activities.length} activities for user ${userId}`)
    
    // Transform to match UserActivity type
    return activities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      details: activity.details as Record<string, unknown>,
      performedBy: activity.performedBy,
      createdAt: activity.createdAt,
      // Add performer info to details
      performerName: activity.performerName,
      performerEmail: activity.performerEmail
    }))
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error fetching activities for user ${userId}:`, error)
    throw error
  }
}

// Enhanced user creation with activity logging (for invitations)
export const createUserWithActivity = async (
  userData: NewUser, 
  performedBy: number
): Promise<User> => {
  try {
    console.log(`🔄 [UsersEnhanced] Creating user with email: ${userData.email}`)
    
    // Ensure isFirstLogin is true for invited users
    const userDataWithDefaults = {
      ...userData,
      isFirstLogin: true,
      status: userData.status || 'active'
    }
    
    const [newUser] = await db
      .insert(users)
      .values(userDataWithDefaults)
      .returning()

    // Log the activity
    await logUserActivity({
      userId: newUser.id,
      action: 'invited',
      details: {
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user'
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] User created successfully: ${newUser.email}`)
    return newUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error creating user:`, error)
    throw error
  }
}

// Resend invitation (mainly for logging purposes)
export const resendUserInvite = async (userId: number, performedBy: number): Promise<void> => {
  try {
    console.log(`📧 [UsersEnhanced] Resending invite for user ${userId}`)
    
    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user.length === 0) {
      throw new Error('User not found')
    }

    // Log the activity
    await logUserActivity({
      userId,
      action: 'resent_invite',
      details: {
        email: user[0].email,
        name: user[0].name
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] Invite resent for user ${userId}`)
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error resending invite for user ${userId}:`, error)
    throw error
  }
}

// Get user by ID (enhanced)
export const getUserByIdEnhanced = async (id: number): Promise<User | null> => {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user[0] || null
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error fetching user ${id}:`, error)
    throw error
  }
}

// Fix isFirstLogin flag for users who haven't actually logged in
export const fixUserFirstLoginFlag = async (id: number, performedBy: number): Promise<User> => {
  try {
    console.log(`🔧 [UsersEnhanced] Fixing isFirstLogin flag for user ${id}`)
    
    const [updatedUser] = await db
      .update(users)
      .set({
        isFirstLogin: true,
        lastLoginAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    if (!updatedUser) {
      throw new Error('User not found')
    }

    // Log the activity
    await logUserActivity({
      userId: id,
      action: 'updated',
      details: {
        action: 'fix_first_login_flag',
        resetIsFirstLogin: true,
        clearedLastLoginAt: true
      },
      performedBy
    })

    console.log(`✅ [UsersEnhanced] Fixed isFirstLogin flag for user ${id}`)
    return updatedUser
  } catch (error) {
    console.error(`❌ [UsersEnhanced] Error fixing isFirstLogin flag for user ${id}:`, error)
    throw error
  }
} 