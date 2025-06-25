ALTER TABLE "shoots" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "shoots" ALTER COLUMN "status" SET DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "shoots" ALTER COLUMN "google_calendar_sync_status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "shoots" ALTER COLUMN "google_calendar_sync_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calendar_events_cache" ADD COLUMN "conflict_details" json;--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "client_root_folder_id" varchar(255);--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "client_root_folder_name" varchar(255);--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "client_root_folder_path" text;--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "content_folder_id" varchar(255);--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "content_folder_name" varchar(255);--> statement-breakpoint
ALTER TABLE "client_settings" ADD COLUMN "content_folder_path" text;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_html_link" varchar(500);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_etag" varchar(255);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_updated" timestamp;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_sequence" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_ical_uid" varchar(255);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_time_zone" varchar(50);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_status" varchar(20) DEFAULT 'confirmed';--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_transparency" varchar(20) DEFAULT 'opaque';--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_visibility" varchar(20) DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_attendees" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_organizer" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_creator" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_recurrence" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_recurring_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_original_start_time" timestamp;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_conference_data" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_reminders" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_hangout_link" varchar(500);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_guests_can_modify" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_guests_can_invite_others" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_guests_can_see_other_guests" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_color_id" varchar(10);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_location_enhanced" json;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "deleted_by" integer;--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_post_ideas" ADD CONSTRAINT "shoot_post_ideas_shoot_id_post_idea_id_unique" UNIQUE("shoot_id","post_idea_id");