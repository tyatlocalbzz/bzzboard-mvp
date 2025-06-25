-- Add conflict details field to calendar_events_cache table
ALTER TABLE calendar_events_cache 
ADD COLUMN conflict_details JSONB DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN calendar_events_cache.conflict_details IS 'JSON array of conflicting events with their titles, start/end times, and event IDs'; 