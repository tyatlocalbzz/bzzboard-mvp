import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { updateUserLastLogin } from '@/lib/db/users'

export const authConfig = {
  pages: {
    signIn: '/auth/signin',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await db.select().from(users).where(
            eq(users.email, credentials.email as string)
          ).limit(1)

          if (!user.length) {
            return null
          }

          const dbUser = user[0]

          // Check if user is active
          if (dbUser.status !== 'active') {
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            dbUser.passwordHash
          )

          if (!isValid) {
            return null
          }

          // Update last login timestamp
          await updateUserLastLogin(dbUser.email)

          return {
            id: dbUser.id.toString(),
            email: dbUser.email,
            name: dbUser.name,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig 