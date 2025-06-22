CREATE TABLE "client_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"storage_provider" varchar(50) DEFAULT 'google-drive',
	"storage_folder_id" varchar(255),
	"storage_folder_name" varchar(255),
	"storage_folder_path" varchar(500),
	"custom_naming" boolean DEFAULT false,
	"naming_template" varchar(255),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploaded_files" ALTER COLUMN "post_idea_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_settings" ADD CONSTRAINT "client_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;