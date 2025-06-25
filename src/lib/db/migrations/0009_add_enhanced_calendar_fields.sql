-- Add enhanced Google Calendar fields to shoots table for robust 2-way sync
-- Following Google Calendar API best practices

-- Add essential sync fields
ALTER TABLE shoots ADD COLUMN google_calendar_html_link VARCHAR(500);
ALTER TABLE shoots ADD COLUMN google_calendar_etag VARCHAR(255);
ALTER TABLE shoots ADD COLUMN google_calendar_updated TIMESTAMP;
ALTER TABLE shoots ADD COLUMN google_calendar_sequence INTEGER DEFAULT 0;
ALTER TABLE shoots ADD COLUMN google_calendar_ical_uid VARCHAR(255);

-- Add timezone and status fields
ALTER TABLE shoots ADD COLUMN google_calendar_time_zone VARCHAR(50);
ALTER TABLE shoots ADD COLUMN google_calendar_status VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE shoots ADD COLUMN google_calendar_transparency VARCHAR(20) DEFAULT 'opaque';
ALTER TABLE shoots ADD COLUMN google_calendar_visibility VARCHAR(20) DEFAULT 'default';

-- Add attendee and collaboration fields
ALTER TABLE shoots ADD COLUMN google_calendar_attendees JSON;
ALTER TABLE shoots ADD COLUMN google_calendar_organizer JSON;
ALTER TABLE shoots ADD COLUMN google_calendar_creator JSON;

-- Add recurrence fields
ALTER TABLE shoots ADD COLUMN google_calendar_recurrence JSON;
ALTER TABLE shoots ADD COLUMN google_calendar_recurring_event_id VARCHAR(255);
ALTER TABLE shoots ADD COLUMN google_calendar_original_start_time TIMESTAMP;

-- Add conference and reminder fields
ALTER TABLE shoots ADD COLUMN google_calendar_conference_data JSON;
ALTER TABLE shoots ADD COLUMN google_calendar_reminders JSON;
ALTER TABLE shoots ADD COLUMN google_calendar_hangout_link VARCHAR(500);

-- Add permission fields
ALTER TABLE shoots ADD COLUMN google_calendar_guests_can_modify BOOLEAN DEFAULT false;
ALTER TABLE shoots ADD COLUMN google_calendar_guests_can_invite_others BOOLEAN DEFAULT false;
ALTER TABLE shoots ADD COLUMN google_calendar_guests_can_see_other_guests BOOLEAN DEFAULT true;

-- Add color and location fields
ALTER TABLE shoots ADD COLUMN google_calendar_color_id VARCHAR(10);
ALTER TABLE shoots ADD COLUMN google_calendar_location_enhanced JSON;

-- Add indexes for performance
CREATE INDEX idx_shoots_google_calendar_etag ON shoots(google_calendar_etag);
CREATE INDEX idx_shoots_google_calendar_updated ON shoots(google_calendar_updated);
CREATE INDEX idx_shoots_google_calendar_ical_uid ON shoots(google_calendar_ical_uid);
CREATE INDEX idx_shoots_google_calendar_recurring_event_id ON shoots(google_calendar_recurring_event_id); 