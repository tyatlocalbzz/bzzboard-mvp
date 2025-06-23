import { pgTable, serial, varchar, text, timestamp, integer, json, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums for better type safety
export const postStatusEnum = pgEnum('post_status', ['planned', 'shot', 'uploaded'])
export const contentTypeEnum = pgEnum('content_type', ['photo', 'video', 'reel', 'story'])
export const shootStatusEnum = pgEnum('shoot_status', ['scheduled', 'active', 'completed', 'cancelled'])
export const userRoleEnum = pgEnum('user_role', ['admin', 'user'])
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending'])
export const integrationProviderEnum = pgEnum('integration_provider', ['google-drive', 'google-calendar'])
export const calendarEventStatusEnum = pgEnum('calendar_event_status', ['confirmed', 'tentative', 'cancelled'])
export const calendarSyncStatusEnum = pgEnum('calendar_sync_status', ['synced', 'pending', 'error'])

// Users table (for simple authentication)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  isFirstLogin: boolean('is_first_login').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Clients table
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  primaryContactName: varchar('primary_contact_name', { length: 255 }),
  primaryContactEmail: varchar('primary_contact_email', { length: 255 }),
  primaryContactPhone: varchar('primary_contact_phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  socialMedia: json('social_media').$type<{
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }>().default({}),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Post Ideas table
export const postIdeas = pgTable('post_ideas', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  platforms: json('platforms').$type<string[]>().notNull(), // ['Instagram', 'Facebook', 'LinkedIn']
  contentType: contentTypeEnum('content_type').notNull(),
  caption: text('caption'),
  shotList: json('shot_list').$type<string[]>().default([]), // Array of shot descriptions
  status: postStatusEnum('status').default('planned').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Shoots table
export const shoots = pgTable('shoots', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(), // Duration in minutes
  location: varchar('location', { length: 255 }),
  notes: text('notes'),
  status: shootStatusEnum('status').default('scheduled').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  // Google Calendar integration fields
  googleCalendarEventId: varchar('google_calendar_event_id', { length: 255 }),
  googleCalendarSyncStatus: calendarSyncStatusEnum('google_calendar_sync_status').default('pending'),
  googleCalendarLastSync: timestamp('google_calendar_last_sync'),
  googleCalendarError: text('google_calendar_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Junction table for shoots and post ideas (many-to-many)
export const shootPostIdeas = pgTable('shoot_post_ideas', {
  id: serial('id').primaryKey(),
  shootId: integer('shoot_id').references(() => shoots.id).notNull(),
  postIdeaId: integer('post_idea_id').references(() => postIdeas.id).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
})

// Uploaded files table
export const uploadedFiles = pgTable('uploaded_files', {
  id: serial('id').primaryKey(),
  postIdeaId: integer('post_idea_id').references(() => postIdeas.id),
  shootId: integer('shoot_id').references(() => shoots.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(), // Path in Google Drive
  fileSize: integer('file_size'), // Size in bytes
  mimeType: varchar('mime_type', { length: 100 }),
  googleDriveId: varchar('google_drive_id', { length: 255 }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

// Integrations table
export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  provider: integrationProviderEnum('provider').notNull(),
  connected: boolean('connected').default(false).notNull(),
  connectedEmail: varchar('connected_email', { length: 255 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  metadata: json('metadata'), // For storing settings and other metadata
  error: text('error'),
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Client Settings table - for per-client configuration
export const clientSettings = pgTable('client_settings', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  storageProvider: varchar('storage_provider', { length: 50 }).default('google-drive'),
  storageFolderId: varchar('storage_folder_id', { length: 255 }),
  storageFolderName: varchar('storage_folder_name', { length: 255 }),
  storageFolderPath: varchar('storage_folder_path', { length: 500 }),
  customNaming: boolean('custom_naming').default(false),
  namingTemplate: varchar('naming_template', { length: 255 }),
  metadata: json('metadata'), // For additional settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Calendar sync tokens table - for efficient incremental sync
export const calendarSyncTokens = pgTable('calendar_sync_tokens', {
  id: serial('id').primaryKey(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull().default('primary'),
  syncToken: text('sync_token').notNull(),
  lastSync: timestamp('last_sync').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Calendar webhook channels table - for push notifications
export const calendarWebhookChannels = pgTable('calendar_webhook_channels', {
  id: serial('id').primaryKey(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull().default('primary'),
  channelId: varchar('channel_id', { length: 255 }).notNull().unique(),
  resourceId: varchar('resource_id', { length: 255 }).notNull(),
  resourceUri: varchar('resource_uri', { length: 500 }).notNull(),
  token: varchar('token', { length: 255 }),
  expiration: timestamp('expiration'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Calendar events cache table - for local optimization and conflict detection
export const calendarEventsCache = pgTable('calendar_events_cache', {
  id: serial('id').primaryKey(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  calendarId: varchar('calendar_id', { length: 255 }).notNull().default('primary'),
  googleEventId: varchar('google_event_id', { length: 255 }).notNull(),
  shootId: integer('shoot_id').references(() => shoots.id), // Link to our shoots if applicable
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: varchar('location', { length: 255 }),
  status: calendarEventStatusEnum('status').default('confirmed').notNull(),
  attendees: json('attendees').$type<Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>>().default([]),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurringEventId: varchar('recurring_event_id', { length: 255 }),
  etag: varchar('etag', { length: 255 }), // For optimistic concurrency control
  lastModified: timestamp('last_modified').notNull(),
  syncStatus: calendarSyncStatusEnum('sync_status').default('synced').notNull(),
  conflictDetected: boolean('conflict_detected').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Define relationships
export const clientsRelations = relations(clients, ({ many }) => ({
  postIdeas: many(postIdeas),
  shoots: many(shoots),
}))

export const postIdeasRelations = relations(postIdeas, ({ one, many }) => ({
  client: one(clients, {
    fields: [postIdeas.clientId],
    references: [clients.id],
  }),
  shootPostIdeas: many(shootPostIdeas),
  uploadedFiles: many(uploadedFiles),
}))

export const shootsRelations = relations(shoots, ({ one, many }) => ({
  client: one(clients, {
    fields: [shoots.clientId],
    references: [clients.id],
  }),
  shootPostIdeas: many(shootPostIdeas),
  uploadedFiles: many(uploadedFiles),
}))

export const shootPostIdeasRelations = relations(shootPostIdeas, ({ one }) => ({
  shoot: one(shoots, {
    fields: [shootPostIdeas.shootId],
    references: [shoots.id],
  }),
  postIdea: one(postIdeas, {
    fields: [shootPostIdeas.postIdeaId],
    references: [postIdeas.id],
  }),
}))

export const uploadedFilesRelations = relations(uploadedFiles, ({ one }) => ({
  postIdea: one(postIdeas, {
    fields: [uploadedFiles.postIdeaId],
    references: [postIdeas.id],
  }),
  shoot: one(shoots, {
    fields: [uploadedFiles.shootId],
    references: [shoots.id],
  }),
}))

export const clientSettingsRelations = relations(clientSettings, ({ one }) => ({
  client: one(clients, {
    fields: [clientSettings.clientId],
    references: [clients.id],
  }),
}))

export const calendarEventsCacheRelations = relations(calendarEventsCache, ({ one }) => ({
  shoot: one(shoots, {
    fields: [calendarEventsCache.shootId],
    references: [shoots.id],
  }),
}))

// Export types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
export type ClientSettings = typeof clientSettings.$inferSelect
export type NewClientSettings = typeof clientSettings.$inferInsert
export type PostIdea = typeof postIdeas.$inferSelect
export type NewPostIdea = typeof postIdeas.$inferInsert
export type Shoot = typeof shoots.$inferSelect
export type NewShoot = typeof shoots.$inferInsert
export type ShootPostIdea = typeof shootPostIdeas.$inferSelect
export type NewShootPostIdea = typeof shootPostIdeas.$inferInsert
export type UploadedFile = typeof uploadedFiles.$inferSelect
export type NewUploadedFile = typeof uploadedFiles.$inferInsert
export type Integration = typeof integrations.$inferSelect
export type NewIntegration = typeof integrations.$inferInsert
export type CalendarSyncToken = typeof calendarSyncTokens.$inferSelect
export type NewCalendarSyncToken = typeof calendarSyncTokens.$inferInsert
export type CalendarWebhookChannel = typeof calendarWebhookChannels.$inferSelect
export type NewCalendarWebhookChannel = typeof calendarWebhookChannels.$inferInsert
export type CalendarEventCache = typeof calendarEventsCache.$inferSelect
export type NewCalendarEventCache = typeof calendarEventsCache.$inferInsert 