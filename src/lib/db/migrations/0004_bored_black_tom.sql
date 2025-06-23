ALTER TABLE "clients" RENAME COLUMN "email" TO "primary_contact_email";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "phone" TO "primary_contact_phone";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "primary_contact_name" varchar(255);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "website" varchar(255);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "social_media" json DEFAULT '{}'::json;