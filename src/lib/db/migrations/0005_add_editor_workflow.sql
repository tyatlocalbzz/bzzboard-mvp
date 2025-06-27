-- Add 'sent-to-editor' status to shoot_status enum
ALTER TYPE shoot_status ADD VALUE 'sent-to-editor';

-- Update uploaded_files table with drive integration fields
ALTER TABLE uploaded_files 
ADD COLUMN drive_folder_id VARCHAR(255),
ADD COLUMN drive_file_web_view_link VARCHAR(500),
ADD COLUMN drive_file_download_link VARCHAR(500);

-- Create editor_communications table
CREATE TABLE editor_communications (
  id SERIAL PRIMARY KEY,
  shoot_id INTEGER REFERENCES shoots(id) ON DELETE CASCADE,
  editor_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  drive_folder_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_message_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_editor_communications_shoot_id ON editor_communications(shoot_id);
CREATE INDEX idx_editor_communications_editor_email ON editor_communications(editor_email);
CREATE INDEX idx_editor_communications_status ON editor_communications(status);
CREATE INDEX idx_uploaded_files_drive_folder_id ON uploaded_files(drive_folder_id);

-- Add comments for documentation
COMMENT ON TABLE editor_communications IS 'Tracks communications sent to editors with drive links';
COMMENT ON COLUMN editor_communications.drive_folder_links IS 'JSON array of drive folder links organized by post idea';
COMMENT ON COLUMN uploaded_files.drive_folder_id IS 'Google Drive folder ID where the file is stored';
COMMENT ON COLUMN uploaded_files.drive_file_web_view_link IS 'Direct Google Drive web view link for the file';
COMMENT ON COLUMN uploaded_files.drive_file_download_link IS 'Direct Google Drive download link for the file'; 