-- Migration to add missing columns to existing users table
-- This should be run manually in your database console

-- First, create the enums if they don't exist
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');

-- Add the missing columns to the existing users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'user' NOT NULL,
ADD COLUMN IF NOT EXISTS "status" "user_status" DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS "is_first_login" boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS "last_login_at" timestamp,
ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Update existing users to have admin role for the main admin user
UPDATE "users" SET "role" = 'admin' WHERE "email" = 'ty@localbzz.com';

-- Set created_at for existing users to current time if it's not set
UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE "users" SET "updated_at" = now() WHERE "updated_at" IS NULL; 