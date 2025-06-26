import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { updateUserLastLogin, createUser, getUserByEmail } from '@/lib/db/users'

export const authConfig = {
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile'
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: 'user', // Default role for OAuth users
        }
      }
    }),
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
            role: dbUser.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in
      if (account?.provider === 'google') {
        try {
          // Check if user exists in database
          const existingUser = await getUserByEmail(user.email!)
          
          if (existingUser) {
            // User exists - update last login and continue
            await updateUserLastLogin(user.email!)
            
            // Update user info from Google profile if needed
            if (existingUser.name !== user.name) {
              await db.update(users)
                .set({ 
                  name: user.name!,
                  updatedAt: new Date()
                })
                .where(eq(users.email, user.email!))
            }
            
            return true
          } else {
            // New user - create account from Google profile
            await createUser({
              email: user.email!,
              name: user.name!,
              password: 'google-oauth-user', // Placeholder - won't be used for Google users
              role: 'user'
            })
            
            // Mark as not first login since they're coming from Google
            await db.update(users)
              .set({ 
                isFirstLogin: false,
                lastLoginAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(users.email, user.email!))
            
            return true
          }
        } catch (error) {
          console.error('Google sign-in error:', error)
          return false
        }
      }
      
      // For credentials provider, the authorize function already handles validation
      return true
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.provider = account?.provider || 'credentials'
      }
      
      // For Google OAuth users, ensure we have the latest user data
      if (account?.provider === 'google' && user.email) {
        const dbUser = await getUserByEmail(user.email)
        if (dbUser) {
          token.id = dbUser.id.toString()
          token.role = dbUser.role
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'admin' | 'user'
        
        // Add provider info to session for debugging/features
        if (token.provider) {
          session.provider = token.provider as string
        }
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
  events: {
    async signIn({ user, account, isNewUser }) {
      if (account?.provider === 'google') {
        console.log(`✅ Google sign-in: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`)
      }
    },
    async signOut() {
      console.log('👋 User signed out')
    }
  }
} satisfies NextAuthConfig 