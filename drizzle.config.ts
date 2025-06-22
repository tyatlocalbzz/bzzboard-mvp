import type { Config } from 'drizzle-kit'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config 