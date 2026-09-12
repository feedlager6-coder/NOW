DROP TABLE IF EXISTS "user_interests";
--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "show_age_band_and_interests";
--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "city";
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "age_band" TYPE text;
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."age_band";
