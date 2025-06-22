import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { clients, postIdeas, shoots, shootPostIdeas } from './schema'
import { eq, and } from 'drizzle-orm'
import * as schema from './schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Define the database type with the schema
type Database = PostgresJsDatabase<typeof schema>

const seedClients = async (db: Database) => {
  console.log('🌱 Seeding clients...')
  
  const clientsToSeed = [
    {
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+1 (555) 123-4567',
      notes: 'Tech startup focused on productivity tools'
    },
    {
      name: 'TechStart Inc',
      email: 'hello@techstart.com',
      phone: '+1 (555) 234-5678',
      notes: 'B2B software company'
    },
    {
      name: 'StyleCo',
      email: 'info@styleco.com',
      phone: '+1 (555) 345-6789',
      notes: 'Fashion and lifestyle brand'
    },
    {
      name: 'GreenTech Solutions',
      email: 'contact@greentech.com',
      phone: '+1 (555) 456-7890',
      notes: 'Sustainable technology company'
    },
    {
      name: 'Creative Agency',
      email: 'team@creativeagency.com',
      phone: '+1 (555) 567-8901',
      notes: 'Full-service creative and marketing agency'
    }
  ]

  const createdClients = []

  for (const clientData of clientsToSeed) {
    // Check if client already exists
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.name, clientData.name))
      .limit(1)

    if (existingClient.length === 0) {
      const [newClient] = await db.insert(clients).values(clientData).returning()
      createdClients.push(newClient)
      console.log(`✅ Created client: ${clientData.name}`)
    } else {
      createdClients.push(existingClient[0])
      console.log(`⏭️  Client already exists: ${clientData.name}`)
    }
  }
  
  console.log('🎉 Clients seeding completed!')
  return createdClients
}

const seedPostIdeas = async (db: Database, clientsList: Array<typeof clients.$inferSelect>) => {
  console.log('🌱 Seeding post ideas...')
  
  const postIdeasToSeed = [
    // Acme Corporation post ideas
    {
      clientId: clientsList[0].id,
      title: 'Product Launch Announcement',
      platforms: ['Instagram', 'LinkedIn', 'Facebook'],
      contentType: 'photo' as const,
      caption: 'Exciting news! Our latest productivity tool is here to revolutionize your workflow. 🚀 #ProductLaunch #Innovation',
      shotList: ['Hero product shot on white background', 'Product in use at desk setup', 'Team celebration moment', 'Before/after workflow comparison'],
      status: 'planned' as const,
      notes: 'Focus on clean, professional aesthetic. Highlight key features.'
    },
    {
      clientId: clientsList[0].id,
      title: 'Behind the Scenes Development',
      platforms: ['Instagram', 'YouTube'],
      contentType: 'video' as const,
      caption: 'Ever wondered how we build our tools? Take a peek behind the curtain! 👨‍💻 #BehindTheScenes #TechLife',
      shotList: ['Developer coding at workstation', 'Team brainstorming session', 'Testing process', 'Code review meeting'],
      status: 'planned' as const,
      notes: 'Keep it authentic and relatable. Show the human side of tech.'
    },
    
    // TechStart Inc post ideas
    {
      clientId: clientsList[1].id,
      title: 'Client Success Story',
      platforms: ['LinkedIn', 'Facebook'],
      contentType: 'photo' as const,
      caption: 'How TechStart helped increase productivity by 300% 📈 Read the full case study! #ClientSuccess #B2B',
      shotList: ['Client testimonial headshot', 'Before/after dashboard screenshots', 'Handshake moment', 'Results infographic'],
      status: 'planned' as const,
      notes: 'Professional tone, focus on measurable results'
    },
    {
      clientId: clientsList[1].id,
      title: 'Feature Demo Video',
      platforms: ['YouTube', 'LinkedIn'],
      contentType: 'video' as const,
      caption: 'See our new automation feature in action! Save hours every week ⏰ #ProductDemo #Automation',
      shotList: ['Screen recording of feature', 'User interaction close-ups', 'Timer showing time saved', 'Happy user reaction'],
      status: 'shot' as const,
      notes: 'Keep demo concise, under 2 minutes. Focus on value proposition.'
    },
    
    // StyleCo post ideas
    {
      clientId: clientsList[2].id,
      title: 'Spring Collection Reveal',
      platforms: ['Instagram', 'TikTok', 'Facebook'],
      contentType: 'photo' as const,
      caption: 'Spring vibes are here! 🌸 Discover our new collection that celebrates fresh beginnings #SpringFashion #NewCollection',
      shotList: ['Flat lay of key pieces', 'Model wearing signature look', 'Detail shots of textures', 'Lifestyle shot in natural setting'],
      status: 'planned' as const,
      notes: 'Light, airy aesthetic. Natural lighting preferred. Pastel color palette.'
    },
    {
      clientId: clientsList[2].id,
      title: 'Styling Tips Reel',
      platforms: ['Instagram', 'TikTok'],
      contentType: 'reel' as const,
      caption: '3 ways to style our bestseller! Which look is your favorite? 💫 #StylingTips #Fashion',
      shotList: ['Quick outfit changes', 'Mirror shots', 'Accessory close-ups', 'Final reveal poses'],
      status: 'planned' as const,
      notes: 'Fast-paced editing, trending audio, vertical format'
    },
    
    // GreenTech Solutions post ideas
    {
      clientId: clientsList[3].id,
      title: 'Sustainability Impact Report',
      platforms: ['LinkedIn', 'Instagram'],
      contentType: 'photo' as const,
      caption: 'This year we helped save 50,000 tons of CO2! 🌍 See how technology can drive positive change #Sustainability #Impact',
      shotList: ['Infographic of key stats', 'Green technology in action', 'Team with sustainability awards', 'Nature shots showing impact'],
      status: 'planned' as const,
      notes: 'Earth tones, professional but approachable. Data visualization important.'
    },
    
    // Creative Agency post ideas
    {
      clientId: clientsList[4].id,
      title: 'Creative Process Showcase',
      platforms: ['Instagram', 'Behance'],
      contentType: 'photo' as const,
      caption: 'From concept to creation ✨ A glimpse into our design process #CreativeProcess #Design',
      shotList: ['Sketches and wireframes', 'Design tools and workspace', 'Team collaboration', 'Final design reveal'],
      status: 'shot' as const,
      notes: 'Artistic, inspiring. Show the journey from idea to execution.'
    },
    {
      clientId: clientsList[4].id,
      title: 'Team Culture Video',
      platforms: ['Instagram', 'LinkedIn'],
      contentType: 'video' as const,
      caption: 'What makes our creative team special? Passion, collaboration, and endless coffee! ☕ #TeamCulture #CreativeLife',
      shotList: ['Team introductions', 'Workspace tour', 'Brainstorming sessions', 'Fun team moments'],
      status: 'planned' as const,
      notes: 'Upbeat, energetic. Show personality and culture.'
    }
  ]

  const createdPostIdeas = []

  for (const postIdeaData of postIdeasToSeed) {
    // Check if post idea already exists
    const existingPostIdea = await db
      .select()
      .from(postIdeas)
      .where(and(
        eq(postIdeas.title, postIdeaData.title),
        eq(postIdeas.clientId, postIdeaData.clientId)
      ))
      .limit(1)

    if (existingPostIdea.length === 0) {
      const [newPostIdea] = await db.insert(postIdeas).values(postIdeaData).returning()
      createdPostIdeas.push(newPostIdea)
      console.log(`✅ Created post idea: ${postIdeaData.title}`)
    } else {
      createdPostIdeas.push(existingPostIdea[0])
      console.log(`⏭️  Post idea already exists: ${postIdeaData.title}`)
    }
  }
  
  console.log('🎉 Post ideas seeding completed!')
  return createdPostIdeas
}

const seedShoots = async (db: Database, clientsList: Array<typeof clients.$inferSelect>) => {
  console.log('🌱 Seeding shoots...')
  
  const shootsToSeed = [
    // Acme Corporation shoots
    {
      clientId: clientsList[0].id,
      title: 'Q1 Product Launch Content',
      scheduledAt: new Date('2024-02-15T10:00:00Z'),
      duration: 240, // 4 hours
      location: 'Acme HQ - Conference Room A',
      notes: 'Bring professional lighting setup. Focus on product shots and team interviews.',
      status: 'scheduled' as const
    },
    {
      clientId: clientsList[0].id,
      title: 'Behind the Scenes Office Tour',
      scheduledAt: new Date('2024-02-20T14:00:00Z'),
      duration: 180, // 3 hours
      location: 'Acme HQ - Full Office',
      notes: 'Casual, documentary style. Capture authentic work moments.',
      status: 'scheduled' as const
    },
    
    // TechStart Inc shoots
    {
      clientId: clientsList[1].id,
      title: 'Client Success Stories',
      scheduledAt: new Date('2024-02-18T09:00:00Z'),
      duration: 300, // 5 hours
      location: 'TechStart Office + Client Site',
      notes: 'Two-location shoot. Morning at TechStart, afternoon at client location.',
      status: 'scheduled' as const
    },
    
    // StyleCo shoots
    {
      clientId: clientsList[2].id,
      title: 'Spring Collection Lookbook',
      scheduledAt: new Date('2024-03-01T08:00:00Z'),
      duration: 480, // 8 hours
      location: 'Outdoor Location - Central Park',
      notes: 'Golden hour shots. Bring reflectors and backup indoor location.',
      status: 'scheduled' as const
    },
    {
      clientId: clientsList[2].id,
      title: 'Social Media Content Day',
      scheduledAt: new Date('2024-01-25T11:00:00Z'),
      duration: 360, // 6 hours
      location: 'StyleCo Studio',
      notes: 'Multiple outfit changes. Focus on Instagram Reels and TikTok content.',
      status: 'completed' as const
    },
    
    // GreenTech Solutions shoots
    {
      clientId: clientsList[3].id,
      title: 'Sustainability Report Video',
      scheduledAt: new Date('2024-02-22T13:00:00Z'),
      duration: 240, // 4 hours
      location: 'GreenTech Facility + Solar Farm',
      notes: 'Drone shots approved for solar farm. Bring drone equipment.',
      status: 'scheduled' as const
    },
    
    // Creative Agency shoots
    {
      clientId: clientsList[4].id,
      title: 'Agency Culture & Process',
      scheduledAt: new Date('2024-01-30T10:00:00Z'),
      duration: 300, // 5 hours
      location: 'Creative Agency Office',
      notes: 'Capture design process, team collaboration, and creative spaces.',
      status: 'completed' as const
    }
  ]

  const createdShoots = []

  for (const shootData of shootsToSeed) {
    // Check if shoot already exists
    const existingShoot = await db
      .select()
      .from(shoots)
      .where(and(
        eq(shoots.title, shootData.title),
        eq(shoots.clientId, shootData.clientId)
      ))
      .limit(1)

    if (existingShoot.length === 0) {
      const [newShoot] = await db.insert(shoots).values(shootData).returning()
      createdShoots.push(newShoot)
      console.log(`✅ Created shoot: ${shootData.title}`)
    } else {
      createdShoots.push(existingShoot[0])
      console.log(`⏭️  Shoot already exists: ${shootData.title}`)
    }
  }
  
  console.log('🎉 Shoots seeding completed!')
  return createdShoots
}

const seedShootPostIdeas = async (db: Database, createdShoots: Array<typeof shoots.$inferSelect>, createdPostIdeas: Array<typeof postIdeas.$inferSelect>) => {
  console.log('🌱 Seeding shoot-post idea relationships...')
  
  const relationships = [
    // Acme Corporation - Q1 Product Launch Content shoot
    { shootId: createdShoots[0].id, postIdeaId: createdPostIdeas[0].id }, // Product Launch Announcement
    { shootId: createdShoots[0].id, postIdeaId: createdPostIdeas[1].id }, // Behind the Scenes Development
    
    // TechStart Inc - Client Success Stories shoot
    { shootId: createdShoots[2].id, postIdeaId: createdPostIdeas[2].id }, // Client Success Story
    { shootId: createdShoots[2].id, postIdeaId: createdPostIdeas[3].id }, // Feature Demo Video
    
    // StyleCo - Spring Collection Lookbook shoot
    { shootId: createdShoots[3].id, postIdeaId: createdPostIdeas[4].id }, // Spring Collection Reveal
    
    // StyleCo - Social Media Content Day shoot
    { shootId: createdShoots[4].id, postIdeaId: createdPostIdeas[5].id }, // Styling Tips Reel
    
    // GreenTech Solutions - Sustainability Report Video shoot
    { shootId: createdShoots[5].id, postIdeaId: createdPostIdeas[6].id }, // Sustainability Impact Report
    
    // Creative Agency - Agency Culture & Process shoot
    { shootId: createdShoots[6].id, postIdeaId: createdPostIdeas[7].id }, // Creative Process Showcase
    { shootId: createdShoots[6].id, postIdeaId: createdPostIdeas[8].id }, // Team Culture Video
  ]

  for (const relationship of relationships) {
    // Check if relationship already exists
    const existingRelationship = await db
      .select()
      .from(shootPostIdeas)
      .where(and(
        eq(shootPostIdeas.shootId, relationship.shootId),
        eq(shootPostIdeas.postIdeaId, relationship.postIdeaId)
      ))
      .limit(1)

    if (existingRelationship.length === 0) {
      await db.insert(shootPostIdeas).values(relationship)
      console.log(`✅ Created shoot-post idea relationship: ${relationship.shootId} -> ${relationship.postIdeaId}`)
    } else {
      console.log(`⏭️  Relationship already exists: ${relationship.shootId} -> ${relationship.postIdeaId}`)
    }
  }
  
  console.log('🎉 Shoot-post idea relationships seeding completed!')
}

const seed = async () => {
  console.log('🌱 Starting database seeding...')
  
  // Database connection
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required')
  }

  const client = postgres(connectionString, { prepare: false })
  const db = drizzle(client, { schema })

  try {
    // Seed in order due to foreign key dependencies
    console.log('📊 Seeding database tables...')
    
    const createdClients = await seedClients(db)
    const createdPostIdeas = await seedPostIdeas(db, createdClients)
    const createdShoots = await seedShoots(db, createdClients)
    await seedShootPostIdeas(db, createdShoots, createdPostIdeas)
    
    console.log('🎉 Database seeding completed successfully!')
    console.log('📊 Summary:')
    console.log(`   - Clients: ${createdClients.length}`)
    console.log(`   - Post Ideas: ${createdPostIdeas.length}`)
    console.log(`   - Shoots: ${createdShoots.length}`)
    console.log('   - Shoot-Post Idea relationships: Created')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed().catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
}

export { seed } 