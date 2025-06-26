import { db } from './index'
import { users } from './schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { CreateUserInput, UpdateUserInput } from '@/lib/auth/types'
import crypto from 'crypto'

// Get user by email
export const getUserByEmail = async (email: string) => {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user[0] || null
}

// Get user by ID
export const getUserById = async (id: number) => {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user[0] || null
}

// Create a new user (enhanced to support OAuth users)
export const createUser = async (userData: CreateUserInput & { provider?: string }) => {
  // For OAuth users, use a placeholder password that won't be used
  const password = userData.provider === 'google' ? 'oauth-placeholder' : userData.password
  const hashedPassword = await bcrypt.hash(password, 12)
  
  const newUser = await db.insert(users).values({
    email: userData.email,
    passwordHash: hashedPassword,
    name: userData.name,
    role: userData.role || 'user',
    status: 'active',
    // OAuth users don't need first login flow
    isFirstLogin: userData.provider === 'google' ? false : true,
  }).returning()
  
  return newUser[0]
}

// Create user with temporary password (for invitations)
export const createInvitedUser = async (email: string, name: string) => {
  // Generate a secure temporary password
  const tempPassword = crypto.randomBytes(16).toString('hex')
  
  return await createUser({
    email,
    name,
    password: tempPassword,
    role: 'user'
  })
}

// Create OAuth user (for Google sign-in)
export const createOAuthUser = async (
  email: string, 
  name: string, 
  provider: string = 'google'
) => {
  return await createUser({
    email,
    name,
    password: 'oauth-placeholder', // Won't be used
    role: 'user',
    provider
  })
}

// Check if user is OAuth user (has placeholder password)
export const isOAuthUser = async (email: string): Promise<boolean> => {
  const user = await getUserByEmail(email)
  if (!user) return false
  
  // Check if password is the OAuth placeholder
  return await bcrypt.compare('oauth-placeholder', user.passwordHash) ||
         await bcrypt.compare('google-oauth-user', user.passwordHash)
}

// Update user information
export const updateUser = async (email: string, updates: UpdateUserInput) => {
  await db.update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.email, email))
}

// Update user information from OAuth profile
export const updateUserFromOAuth = async (
  email: string, 
  name: string
) => {
  await db.update(users)
    .set({ 
      name,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.email, email))
}

// Update user password (for actual login/password changes)
export const updateUserPassword = async (email: string, newPassword: string) => {
  // Check if user is OAuth user - they shouldn't be able to set passwords
  if (await isOAuthUser(email)) {
    throw new Error('OAuth users cannot set passwords')
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  await db.update(users)
    .set({ 
      passwordHash: hashedPassword,
      isFirstLogin: false,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.email, email))
}

// Update user password for invitation resends (keeps isFirstLogin: true)
export const updateUserTempPassword = async (email: string, newPassword: string) => {
  // Check if user is OAuth user
  if (await isOAuthUser(email)) {
    throw new Error('OAuth users cannot have temporary passwords')
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  await db.update(users)
    .set({ 
      passwordHash: hashedPassword,
      updatedAt: new Date()
      // Keep isFirstLogin: true and don't set lastLoginAt
    })
    .where(eq(users.email, email))
}

// Verify user password (enhanced for OAuth users)
export const verifyUserPassword = async (email: string, password: string) => {
  const user = await getUserByEmail(email)
  if (!user) return false

  // OAuth users can't authenticate with password
  if (await isOAuthUser(email)) {
    return false
  }

  return await bcrypt.compare(password, user.passwordHash)
}

// Update last login timestamp
export const updateUserLastLogin = async (email: string) => {
  await db.update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.email, email))
}

// Get all users (for admin)
export const getAllUsers = async () => {
  return await db.select().from(users).orderBy(users.createdAt)
}

// Check if user exists
export const userExists = async (email: string) => {
  const user = await getUserByEmail(email)
  return !!user
}

// Delete user (soft delete by setting status to inactive)
export const deactivateUser = async (email: string) => {
  await db.update(users)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(eq(users.email, email))
}

// Hard delete user (use with caution)
export const deleteUser = async (id: number) => {
  await db.delete(users).where(eq(users.id, id))
}

// Get user authentication method
export const getUserAuthMethod = async (email: string): Promise<'credentials' | 'oauth' | null> => {
  const user = await getUserByEmail(email)
  if (!user) return null
  
  if (await isOAuthUser(email)) {
    return 'oauth'
  }
  
  return 'credentials'
} 