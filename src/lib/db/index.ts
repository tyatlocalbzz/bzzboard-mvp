import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prefetch as it causes issues with Vercel Postgres
const connectionString = process.env.POSTGRES_URL!

// Create the connection
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })

// Re-export schema for convenience
export { schema }
export * from './schema' 