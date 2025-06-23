CREATE TYPE "public"."calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_status" AS ENUM('synced', 'pending', 'error');--> statement-breakpoint
CREATE TABLE "calendar_events_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary' NOT NULL,
	"google_event_id" varchar(255) NOT NULL,
	"shoot_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" varchar(255),
	"status" "calendar_event_status" DEFAULT 'confirmed' NOT NULL,
	"attendees" json DEFAULT '[]'::json,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_event_id" varchar(255),
	"etag" varchar(255),
	"last_modified" timestamp NOT NULL,
	"sync_status" "calendar_sync_status" DEFAULT 'synced' NOT NULL,
	"conflict_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary' NOT NULL,
	"sync_token" text NOT NULL,
	"last_sync" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_webhook_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary' NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"resource_uri" varchar(500) NOT NULL,
	"token" varchar(255),
	"expiration" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_webhook_channels_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_sync_status" "calendar_sync_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_last_sync" timestamp;--> statement-breakpoint
ALTER TABLE "shoots" ADD COLUMN "google_calendar_error" text;--> statement-breakpoint
ALTER TABLE "calendar_events_cache" ADD CONSTRAINT "calendar_events_cache_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;