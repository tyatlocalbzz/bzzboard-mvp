-- Add system-wide settings tables

-- System platforms table (only for custom platforms)
CREATE TABLE "system_platforms" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "enabled" BOOLEAN DEFAULT true NOT NULL,
  "is_default" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- System content types table (only for custom content types)
CREATE TABLE "system_content_types" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "value" VARCHAR(50) NOT NULL UNIQUE,
  "enabled" BOOLEAN DEFAULT true NOT NULL,
  "is_default" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- System settings table for global configuration
CREATE TABLE "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "type" VARCHAR(20) DEFAULT 'string' NOT NULL, -- string, number, boolean, json
  "description" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Seed only essential system settings (no platforms or content types)
INSERT INTO "system_settings" ("key", "value", "type", "description") VALUES
('default_timezone', 'America/New_York', 'string', 'Default timezone for the application'),
('app_name', 'BzzBoard', 'string', 'Application name'),
('max_file_size_mb', '100', 'number', 'Maximum file upload size in MB'); 