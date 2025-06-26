import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: 'admin' | 'user'
    image?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'admin' | 'user'
      image?: string
    }
    provider?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'admin' | 'user'
    provider?: string
  }
} 