-- Shopping list table for tracking items to buy
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  qty TEXT,
  checked BOOLEAN NOT NULL DEFAULT false,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_checked ON shopping_list_items(checked);
CREATE INDEX IF NOT EXISTS idx_shopping_list_added ON shopping_list_items(added_at DESC);

COMMENT ON TABLE shopping_list_items IS 'Shopping list items; can be manually added or added from recipe ingredients';
