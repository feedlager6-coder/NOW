-- Rollback Migration for 0000_wet_wallow.sql
DROP TABLE IF EXISTS "verifications" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "trusted_contacts" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "service_zones" CASCADE;
DROP TABLE IF EXISTS "safety_events" CASCADE;
DROP TABLE IF EXISTS "reviews" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "performer_applications" CASCADE;
DROP TABLE IF EXISTS "payouts" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "consents" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "booking_events" CASCADE;
DROP TABLE IF EXISTS "blocks" CASCADE;
DROP TABLE IF EXISTS "availability" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;

DROP TYPE IF EXISTS "public"."user_status";
DROP TYPE IF EXISTS "public"."user_role";
DROP TYPE IF EXISTS "public"."report_priority";
DROP TYPE IF EXISTS "public"."report_category";
DROP TYPE IF EXISTS "public"."payment_status";
DROP TYPE IF EXISTS "public"."moderation_status";
DROP TYPE IF EXISTS "public"."booking_status";
