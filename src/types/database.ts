/**
 * Placeholder Supabase database types.
 *
 * Once the Supabase project exists and migrations in supabase/migrations
 * have been applied, regenerate this file for real with:
 *
 *   pnpm db:types
 *
 * (wraps: supabase gen types typescript --project-id <id> --schema public)
 *
 * Until then, this hand-written stub keeps the rest of the codebase type-
 * checking against the schema defined in supabase/migrations/0001_init_schema.sql.
 * It intentionally covers only the fields actively used by Phase 0/1 code;
 * expand it (or regenerate) as more modules come online.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          slug: string;
          isbn: string | null;
          sku: string;
          author_id: string | null;
          publisher_id: string | null;
          language: string;
          edition: string | null;
          page_count: number | null;
          weight_grams: number;
          description: string | null;
          short_description: string | null;
          selling_price: number;
          discount_price: number | null;
          is_featured: boolean;
          is_new_arrival: boolean;
          is_best_seller: boolean;
          is_active: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["books"]["Row"]> & {
          title: string;
          slug: string;
          sku: string;
          weight_grams: number;
          selling_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["books"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      homepage_sections: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          is_visible: boolean;
          sort_order: number;
          config: Json;
        };
        Insert: Partial<Database["public"]["Tables"]["homepage_sections"]["Row"]> & {
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["homepage_sections"]["Row"]>;
      };
    };
    Functions: {
      calculate_shipping_cost: {
        Args: { p_city_id: string; p_total_weight_g: number };
        Returns: { rate: number; weight_band_id: string }[];
      };
    };
  };
}
