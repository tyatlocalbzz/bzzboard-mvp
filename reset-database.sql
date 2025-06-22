-- Complete database reset script
-- Run this in your Supabase SQL editor

-- Drop all tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS "uploaded_files" CASCADE;
DROP TABLE IF EXISTS "shoot_post_ideas" CASCADE;
DROP TABLE IF EXISTS "post_ideas" CASCADE;
DROP TABLE IF EXISTS "shoots" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS "user_status" CASCADE;
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "shoot_status" CASCADE;
DROP TYPE IF EXISTS "post_status" CASCADE;
DROP TYPE IF EXISTS "content_type" CASCADE;

-- Now run the migration
-- Copy and paste the contents of src/lib/db/migrations/0000_handy_chamber.sql here 