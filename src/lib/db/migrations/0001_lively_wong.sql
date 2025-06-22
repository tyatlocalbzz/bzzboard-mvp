CREATE TYPE "public"."integration_provider" AS ENUM('google-drive', 'google-calendar');--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"connected" boolean DEFAULT false NOT NULL,
	"connected_email" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"error" text,
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
