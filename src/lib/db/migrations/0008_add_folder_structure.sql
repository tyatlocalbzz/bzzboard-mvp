-- Add folder structure fields to client_settings table
-- Supports two-tier folder organization: client root + content subfolder

ALTER TABLE "client_settings" 
ADD COLUMN "client_root_folder_id" varchar(255),
ADD COLUMN "client_root_folder_name" varchar(255), 
ADD COLUMN "client_root_folder_path" text,
ADD COLUMN "content_folder_id" varchar(255),
ADD COLUMN "content_folder_name" varchar(255),
ADD COLUMN "content_folder_path" text; 