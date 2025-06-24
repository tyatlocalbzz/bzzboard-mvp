-- Cleanup Mock Data Script
-- This script removes all sample/mock data while preserving database structure and user accounts
-- Run this in your database (Supabase SQL editor or direct connection)

-- Remove all sample data in correct order (respecting foreign key constraints)
-- Delete uploaded files first (references post_ideas and shoots)
DELETE FROM "uploaded_files";
-- Delete shoot-post idea relationships
DELETE FROM "shoot_post_ideas";
-- Delete post ideas (references clients)
DELETE FROM "post_ideas"; 
-- Delete shoots (references clients)
DELETE FROM "shoots";
-- Delete client settings (references clients)
DELETE FROM "client_settings";
-- Delete clients (no dependencies)
DELETE FROM "clients";

-- Reset auto-increment sequences to start fresh
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE post_ideas_id_seq RESTART WITH 1;
ALTER SEQUENCE shoots_id_seq RESTART WITH 1;
ALTER SEQUENCE shoot_post_ideas_id_seq RESTART WITH 1;
ALTER SEQUENCE uploaded_files_id_seq RESTART WITH 1;
ALTER SEQUENCE client_settings_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 'clients' as table_name, count(*) as remaining_records FROM clients
UNION ALL
SELECT 'post_ideas', count(*) FROM post_ideas
UNION ALL  
SELECT 'shoots', count(*) FROM shoots
UNION ALL
SELECT 'shoot_post_ideas', count(*) FROM shoot_post_ideas
UNION ALL
SELECT 'uploaded_files', count(*) FROM uploaded_files
UNION ALL
SELECT 'client_settings', count(*) FROM client_settings;

-- Show what's preserved (should show your user accounts and integrations)
SELECT 'users' as table_name, count(*) as preserved_records FROM users
UNION ALL
SELECT 'integrations', count(*) FROM integrations; 