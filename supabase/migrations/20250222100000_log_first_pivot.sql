-- Add frequency_rank for usage-based shopping list ranking
ALTER TABLE pantry_staples
ADD COLUMN IF NOT EXISTS frequency_rank double precision NOT NULL DEFAULT 0;

-- Optional note for free-form meal logs (e.g. "Leftover pizza")
ALTER TABLE meal_history
ADD COLUMN IF NOT EXISTS note TEXT;

-- Tags per meal: Quick, Comfort, Healthy
ALTER TABLE meal_history
ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Track recipe edits for "House version" badge (edit_count > 1)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;

-- "On my next run" / stocked feedback for shopping list deprioritization
ALTER TABLE pantry_staples
ADD COLUMN IF NOT EXISTS marked_stocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pantry_staples_frequency ON pantry_staples(frequency_rank DESC);
