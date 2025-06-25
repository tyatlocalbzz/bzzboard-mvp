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

// Create a new user
export const createUser = async (userData: CreateUserInput) => {
  const hashedPassword = await bcrypt.hash(userData.password, 12)
  
  const newUser = await db.insert(users).values({
    email: userData.email,
    passwordHash: hashedPassword,
    name: userData.name,
    role: userData.role || 'user',
    status: 'active',
    isFirstLogin: true,
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

// Update user information
export const updateUser = async (email: string, updates: UpdateUserInput) => {
  await db.update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.email, email))
}

// Update user password (for actual login/password changes)
export const updateUserPassword = async (email: string, newPassword: string) => {
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
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  await db.update(users)
    .set({ 
      passwordHash: hashedPassword,
      updatedAt: new Date()
      // Keep isFirstLogin: true and don't set lastLoginAt
    })
    .where(eq(users.email, email))
}

// Verify user password
export const verifyUserPassword = async (email: string, password: string) => {
  const user = await getUserByEmail(email)
  if (!user) return false

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