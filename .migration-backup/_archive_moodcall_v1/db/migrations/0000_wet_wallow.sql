CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending_payment', 'paid_pending_acceptance', 'accepted', 'declined', 'expired', 'cancelled_by_client', 'cancelled_by_performer', 'en_route', 'arrived', 'in_progress', 'completed', 'review_pending', 'refunded_partial', 'safety_review', 'disputed', 'resolved_refund', 'resolved_no_refund', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'succeeded', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('sexual_harassment', 'private_place_solicitation', 'extortion_or_threats', 'drugs_or_weapons', 'no_show', 'inappropriate_behavior', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_priority" AS ENUM('p0_emergency', 'p1_high', 'p2_medium', 'p3_low');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'performer', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"correlation_id" text,
	"redacted_diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	CONSTRAINT "availability_duration_valid" CHECK (ends_at > starts_at)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"redacted_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"zone_id" text NOT NULL,
	"approximate_lat" numeric(10, 6),
	"approximate_lng" numeric(10, 6),
	"public_place_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"purpose" text NOT NULL,
	"price" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"performer_amount" integer NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_duration_valid" CHECK (ends_at > starts_at),
	CONSTRAINT "bookings_amounts_non_negative" CHECK (price >= 0 AND platform_fee >= 0 AND performer_amount >= 0)
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
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" text DEFAULT 'mock_payment' NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_amount" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "payments_provider_payment_id_unique" UNIQUE("provider_payment_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"tax_status" text DEFAULT 'demo_unregistered' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_reference" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performer_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"moderator_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"age_band" text NOT NULL,
	"avatar_ref" text,
	"styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '["ru"]'::jsonb NOT NULL,
	"hourly_rate" integer DEFAULT 150000 NOT NULL,
	"min_duration" integer DEFAULT 60 NOT NULL,
	"city" text DEFAULT 'Махачкала' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "profiles_hourly_rate_positive" CHECK (hourly_rate > 0),
	CONSTRAINT "profiles_min_duration_positive" CHECK (min_duration >= 30)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"reporter_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"category" "report_category" NOT NULL,
	"description" text NOT NULL,
	"priority" "report_priority" DEFAULT 'p2_medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"text" text,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK (rating >= 1 AND rating <= 5),
	CONSTRAINT "reviews_prevent_self_review" CHECK (author_id <> target_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "safety_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"event_type" text DEFAULT 'sos' NOT NULL,
	"approximate_location" jsonb NOT NULL,
	"status" text DEFAULT 'triggered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"approximate_lat" numeric(10, 6) NOT NULL,
	"approximate_lng" numeric(10, 6) NOT NULL,
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
CREATE TABLE IF NOT EXISTS "trusted_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contact_label" text NOT NULL,
	"contact_value_encrypted" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"verified_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_lookup_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"age_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_phone_lookup_hash_unique" UNIQUE("phone_lookup_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'mock_safe_kyc' NOT NULL,
	"status" text NOT NULL,
	"provider_reference" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_version" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "availability" ADD CONSTRAINT "availability_performer_id_users_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_performer_id_users_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_zone_id_service_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."service_zones"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_performer_id_users_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performer_applications" ADD CONSTRAINT "performer_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performer_applications" ADD CONSTRAINT "performer_applications_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "reports" ADD CONSTRAINT "reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_slot_idx" ON "availability" USING btree ("performer_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blocks_pair_idx" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_events_actor_idx" ON "booking_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_client_idx" ON "bookings" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_performer_active_idx" ON "bookings" USING btree ("performer_id","status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consents_user_type_idx" ON "consents" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_booking_created_idx" ON "messages" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_idx" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_performer_idx" ON "payouts" USING btree ("performer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_user_idx" ON "performer_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "performer_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_city_idx" ON "profiles" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_moderation_status_idx" ON "profiles" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_is_demo_idx" ON "profiles" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_status_priority_idx" ON "reports" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_target_idx" ON "reports" USING btree ("target_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_author_idx" ON "reviews" USING btree ("booking_id","author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_target_idx" ON "reviews" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "safety_events_booking_idx" ON "safety_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_zones_city_idx" ON "service_zones" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_zones_whitelist_idx" ON "service_zones" USING btree ("is_whitelisted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trusted_contacts_user_idx" ON "trusted_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_lookup_hash_idx" ON "users" USING btree ("phone_lookup_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verifications_user_idx" ON "verifications" USING btree ("user_id");