CREATE TYPE "public"."meetup_status" AS ENUM('draft', 'scheduled', 'gathering', 'active', 'completed', 'cancelled_by_creator', 'cancelled_by_system', 'safety_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('creator', 'participant');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('invited', 'joined', 'checked_in', 'left', 'removed', 'reported');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('sexual_solicitation', 'private_place_solicitation', 'aggression_or_threats', 'drugs_or_weapons', 'no_show_spam', 'inappropriate_behavior', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_priority" AS ENUM('p0_emergency', 'p1_high', 'p2_medium', 'p3_low');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_types" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"icon" text NOT NULL,
	"default_duration_minutes" integer DEFAULT 60 NOT NULL,
	"default_capacity" integer DEFAULT 4 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"correlation_id" text,
	"redacted_diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_prevent_self" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"document_version" text NOT NULL,
	"text_hash" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"rules" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interests" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetup_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"redacted_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetup_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL,
	"retention_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetup_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "participant_role" DEFAULT 'participant' NOT NULL,
	"status" "participant_status" DEFAULT 'joined' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_at" timestamp with time zone,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"activity_type_id" text NOT NULL,
	"zone_id" text NOT NULL,
	"approximate_lat" numeric(10, 6),
	"approximate_lng" numeric(10, 6),
	"public_place_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" "meetup_status" DEFAULT 'gathering' NOT NULL,
	"safe_description" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meetups_capacity_range" CHECK ("meetups"."capacity" >= 2 AND "meetups"."capacity" <= 12),
	CONSTRAINT "meetups_duration_valid" CHECK ("meetups"."duration_minutes" >= 15 AND "meetups"."duration_minutes" <= 240)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"age_band" text,
	"avatar_ref" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"show_reliability_badge" boolean DEFAULT true NOT NULL,
	"reliability_score" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"showed_up" boolean DEFAULT true NOT NULL,
	"on_time" boolean DEFAULT true NOT NULL,
	"respectful" boolean DEFAULT true NOT NULL,
	"would_join_again" boolean DEFAULT true NOT NULL,
	"status" "moderation_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_prevent_self" CHECK ("ratings"."author_id" <> "ratings"."target_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid,
	"reporter_id" uuid NOT NULL,
	"target_id" uuid,
	"category" "report_category" NOT NULL,
	"description" text NOT NULL,
	"priority" "report_priority" DEFAULT 'p2_medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "safety_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid,
	"reporter_id" uuid NOT NULL,
	"event_type" text DEFAULT 'safety_help' NOT NULL,
	"approximate_location" jsonb,
	"status" text DEFAULT 'triggered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"approximate_lat" numeric(10, 6),
	"approximate_lng" numeric(10, 6),
	"public_place_required" boolean DEFAULT true NOT NULL,
	"is_whitelisted" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "share_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"card_data" jsonb NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_lookup_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"age_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_phone_lookup_hash_unique" UNIQUE("phone_lookup_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_events" ADD CONSTRAINT "meetup_events_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_events" ADD CONSTRAINT "meetup_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_messages" ADD CONSTRAINT "meetup_messages_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_messages" ADD CONSTRAINT "meetup_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_participants" ADD CONSTRAINT "meetup_participants_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetup_participants" ADD CONSTRAINT "meetup_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetups" ADD CONSTRAINT "meetups_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetups" ADD CONSTRAINT "meetups_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetups" ADD CONSTRAINT "meetups_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ratings" ADD CONSTRAINT "ratings_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "share_cards" ADD CONSTRAINT "share_cards_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blocks_pair_idx" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetup_messages_retention_idx" ON "meetup_messages" USING btree ("meetup_id","retention_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "meetup_participants_unique_idx" ON "meetup_participants" USING btree ("meetup_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetups_status_zone_idx" ON "meetups" USING btree ("status","zone_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_unique_idx" ON "ratings" USING btree ("meetup_id","author_id","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_priority_status_idx" ON "reports" USING btree ("status","priority");