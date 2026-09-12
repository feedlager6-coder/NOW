DO $$ BEGIN
  CREATE TYPE "public"."age_band" AS ENUM ('18-21', '22-25', '26-30', '31+');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "profiles" 
  ADD COLUMN IF NOT EXISTS "city" text DEFAULT 'DEMO CITY' NOT NULL,
  ADD COLUMN IF NOT EXISTS "show_age_band_and_interests" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" 
  ALTER COLUMN "age_band" TYPE "public"."age_band" USING "age_band"::"public"."age_band";
--> statement-breakpoint
ALTER TABLE "interests" 
  ADD COLUMN IF NOT EXISTS "label_ru" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "icon" text NOT NULL DEFAULT '📌',
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "interests" ALTER COLUMN "name" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "interests" ALTER COLUMN "category" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_interests" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "interest_id" text NOT NULL REFERENCES "interests"("id") ON DELETE CASCADE,
  CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id", "interest_id")
);
--> statement-breakpoint
INSERT INTO "interests" ("id", "label_ru", "icon", "is_active", "sort_order")
VALUES 
  ('walk', 'Прогулка', '🚶', true, 1),
  ('coffee', 'Кофе', '☕', true, 2),
  ('football', 'Футбол', '⚽', true, 3),
  ('board_games', 'Настольные игры', '🎲', true, 4),
  ('workout', 'Воркаут', '⚡', true, 5),
  ('study', 'Учёба', '📚', true, 6),
  ('sports_viewing', 'Спорт / UFC', '📺', true, 7)
ON CONFLICT ("id") DO UPDATE SET
  "label_ru" = EXCLUDED."label_ru",
  "icon" = EXCLUDED."icon",
  "is_active" = EXCLUDED."is_active",
  "sort_order" = EXCLUDED."sort_order";
