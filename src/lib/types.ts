export type PantryStatus = "Full" | "Half" | "Low" | "Out";

export interface PantryStaple {
  id: string;
  name: string;
  status: PantryStatus;
  last_restocked: string | null;
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
}

export interface MealHistory {
  id: string;
  recipe_id: string;
  user_id: string;
  consumed_at: string;
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
    };
  };
}

