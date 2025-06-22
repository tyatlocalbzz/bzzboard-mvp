CREATE TYPE "public"."content_type" AS ENUM('photo', 'video', 'reel', 'story');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('planned', 'shot', 'uploaded');--> statement-breakpoint
CREATE TYPE "public"."shoot_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"platforms" json NOT NULL,
	"content_type" "content_type" NOT NULL,
	"caption" text,
	"shot_list" json DEFAULT '[]'::json,
	"status" "post_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoot_post_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"shoot_id" integer NOT NULL,
	"post_idea_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shoots" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"location" varchar(255),
	"notes" text,
	"status" "shoot_status" DEFAULT 'scheduled' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_idea_id" integer NOT NULL,
	"shoot_id" integer,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"google_drive_id" varchar(255),
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"is_first_login" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "post_ideas" ADD CONSTRAINT "post_ideas_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_post_ideas" ADD CONSTRAINT "shoot_post_ideas_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_post_ideas" ADD CONSTRAINT "shoot_post_ideas_post_idea_id_post_ideas_id_fk" FOREIGN KEY ("post_idea_id") REFERENCES "public"."post_ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_post_idea_id_post_ideas_id_fk" FOREIGN KEY ("post_idea_id") REFERENCES "public"."post_ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE no action ON UPDATE no action;