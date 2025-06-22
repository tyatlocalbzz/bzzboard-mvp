import { User as DbUser } from '@/lib/db/schema'

// Extended user type that includes database fields with string ID for NextAuth compatibility
export interface AuthUser extends Omit<DbUser, 'id'> {
  id: string // NextAuth expects string ID, but DB uses number
  dbId: number // Keep reference to actual DB ID
}

// Session user type (minimal data from JWT)
export interface SessionUser {
  id: string
  email: string
  name: string
}

// User creation/update types
export interface CreateUserInput {
  email: string
  password: string
  name: string
  role?: 'admin' | 'user'
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: 'admin' | 'user'
  status?: 'active' | 'inactive' | 'pending'
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
} 