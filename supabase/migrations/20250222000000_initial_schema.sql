-- Pantry status enum
CREATE TYPE pantry_status AS ENUM ('Full', 'Half', 'Low', 'Out');

-- Recipes: ingredients stored as JSONB array of { name, qty, unit, is_essential }
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meal history: one row per consumed meal
CREATE TABLE meal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_history_recipe_id ON meal_history(recipe_id);
CREATE INDEX idx_meal_history_user_id ON meal_history(user_id);
CREATE INDEX idx_meal_history_consumed_at ON meal_history(consumed_at);

-- Pantry staples: one row per staple; status driven by depletion engine
CREATE TABLE pantry_staples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status pantry_status NOT NULL DEFAULT 'Full',
  last_restocked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pantry_staples_status ON pantry_staples(status);
CREATE INDEX idx_pantry_staples_name_lower ON pantry_staples(LOWER(name));

-- Optional: RLS (enable and add policies when you add auth)
-- ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pantry_staples ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE recipes IS 'Recipes with ingredients as JSONB: [{ name, qty, unit, is_essential }]';
COMMENT ON TABLE meal_history IS 'Log of meals consumed; drives depletion engine';
COMMENT ON TABLE pantry_staples IS 'Staple inventory; status updated by depletion logic (3 meals → Half, 5 → Low)';
