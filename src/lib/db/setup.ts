import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from './schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

// Load environment variables
dotenv.config({ path: '.env.local' })

export const setupDatabase = async () => {
  try {
    // Use the non-pooling connection for setup
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
    
    if (!connectionString) {
      throw new Error('No database connection string found in environment variables')
    }
    
    // Create a direct connection for setup
    const client = postgres(connectionString, { prepare: false })
    const db = drizzle(client, { schema: { users } })
    
    // Create admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'ty@localbzz.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const adminName = process.env.ADMIN_NAME || 'Ty Walls'

    // Check if admin user already exists with new or old email
    const existingUsers = await db.select().from(users).where(
      eq(users.email, adminEmail)
    )
    
    const oldAdminUsers = await db.select().from(users).where(
      eq(users.email, 'admin@buzzboard.com')
    )
    
    if (existingUsers.length === 0) {
      if (oldAdminUsers.length > 0) {
        // Update existing admin user with new email
        const hashedPassword = await bcrypt.hash(adminPassword, 12)
        
        await db.update(users)
          .set({
            email: adminEmail,
            name: adminName,
            passwordHash: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(users.email, 'admin@buzzboard.com'))
        
        console.log(`✅ Admin user updated: ${adminEmail}`)
      } else {
        // Create new admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 12)
        
        await db.insert(users).values({
          email: adminEmail,
          passwordHash: hashedPassword,
          name: adminName,
        })
        
        console.log(`✅ Admin user created: ${adminEmail}`)
      }
      
      console.log(`🔑 Default password: ${adminPassword}`)
      console.log('⚠️  Please change the password after first login!')
    } else {
      console.log(`✅ Admin user already exists: ${adminEmail}`)
    }
    
    console.log('✅ Database setup complete!')
    
    // Close the connection
    await client.end()
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    throw error
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
} 