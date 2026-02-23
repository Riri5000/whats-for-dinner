export type PantryStatus = "Full" | "Half" | "Low" | "Out";

export type MealTag = "Quick" | "Comfort" | "Healthy";

export interface PantryStaple {
  id: string;
  name: string;
  status: PantryStatus;
  last_restocked: string | null;
  frequency_rank?: number;
  marked_stocked_at?: string | null;
}

export interface RecipeIngredient {
  name: string;
  qty: number | null;
  unit: string | null;
  is_essential: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  source_url: string | null;
  edit_count?: number;
}

export interface MealHistory {
  id: string;
  recipe_id: string;
  user_id: string;
  consumed_at: string;
  note?: string | null;
  tags?: MealTag[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  qty: string | null;
  checked: boolean;
  recipe_id: string | null;
  added_at: string;
}

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, "id"> & { id?: string };
        Update: Partial<Recipe>;
      };
      meal_history: {
        Row: MealHistory;
        Insert: Omit<MealHistory, "id"> & { id?: string };
        Update: Partial<MealHistory>;
      };
      pantry_staples: {
        Row: PantryStaple;
        Insert: Omit<PantryStaple, "id"> & { id?: string };
        Update: Partial<PantryStaple>;
      };
      shopping_list_items: {
        Row: ShoppingListItem;
        Insert: Omit<ShoppingListItem, "id" | "added_at"> & { id?: string; added_at?: string };
        Update: Partial<ShoppingListItem>;
      };
    };
  };
}

