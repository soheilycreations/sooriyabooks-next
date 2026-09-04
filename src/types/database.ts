export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city_id: string
          created_at: string
          customer_id: string | null
          id: string
          is_default: boolean
          label: string | null
          line1: string
          line2: string | null
          phone: string
          postal_code: string | null
          recipient_name: string
        }
        Insert: {
          city_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          line1: string
          line2?: string | null
          phone: string
          postal_code?: string | null
          recipient_name: string
        }
        Update: {
          city_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          line1?: string
          line2?: string | null
          phone?: string
          postal_code?: string | null
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "shipping_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_featured: boolean
          name: string
          photo_url: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          name: string
          photo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          name?: string
          photo_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_staff_id: string | null
          body: string
          cover_media_id: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_staff_id?: string | null
          body: string
          cover_media_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_staff_id?: string | null
          body?: string
          cover_media_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_staff_id_fkey"
            columns: ["author_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      book_categories: {
        Row: {
          book_id: string
          category_id: string
        }
        Insert: {
          book_id: string
          category_id: string
        }
        Update: {
          book_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_categories_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      book_images: {
        Row: {
          book_id: string
          id: string
          is_primary: boolean
          media_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          id?: string
          is_primary?: boolean
          media_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          id?: string
          is_primary?: boolean
          media_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_images_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_images_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author_id: string | null
          created_at: string
          description: string | null
          discount_price: number | null
          edition: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_new_arrival: boolean
          isbn: string | null
          language: string
          og_image_url: string | null
          page_count: number | null
          publisher_id: string | null
          selling_price: number
          seo_canonical_url: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
          weight_grams: number
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          edition?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          isbn?: string | null
          language?: string
          og_image_url?: string | null
          page_count?: number | null
          publisher_id?: string | null
          selling_price: number
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku: string
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
          weight_grams: number
        }
        Update: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          edition?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          isbn?: string | null
          language?: string
          og_image_url?: string | null
          page_count?: number | null
          publisher_id?: string | null
          selling_price?: number
          seo_canonical_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
      coupon_books: {
        Row: {
          book_id: string
          coupon_id: string
        }
        Insert: {
          book_id: string
          coupon_id: string
        }
        Update: {
          book_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_books_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_categories: {
        Row: {
          category_id: string
          coupon_id: string
        }
        Insert: {
          category_id: string
          coupon_id: string
        }
        Update: {
          category_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_categories_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          customer_id: string | null
          id: string
          order_id: string | null
          redeemed_at: string
        }
        Insert: {
          coupon_id: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          redeemed_at?: string
        }
        Update: {
          coupon_id?: string
          customer_id?: string | null
          id?: string
          order_id?: string | null
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          minimum_order_amount: number | null
          per_customer_limit: number | null
          scope: Database["public"]["Enums"]["coupon_scope"]
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          minimum_order_amount?: number | null
          per_customer_limit?: number | null
          scope?: Database["public"]["Enums"]["coupon_scope"]
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          usage_count?: number
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          minimum_order_amount?: number | null
          per_customer_limit?: number | null
          scope?: Database["public"]["Enums"]["coupon_scope"]
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      homepage_section_items: {
        Row: {
          author_id: string | null
          book_id: string | null
          button_text: string | null
          ends_at: string | null
          heading: string | null
          id: string
          image_media_id: string | null
          is_visible: boolean
          link_url: string | null
          publisher_id: string | null
          section_id: string
          sort_order: number
          starts_at: string | null
          subheading: string | null
        }
        Insert: {
          author_id?: string | null
          book_id?: string | null
          button_text?: string | null
          ends_at?: string | null
          heading?: string | null
          id?: string
          image_media_id?: string | null
          is_visible?: boolean
          link_url?: string | null
          publisher_id?: string | null
          section_id: string
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
        }
        Update: {
          author_id?: string | null
          book_id?: string | null
          button_text?: string | null
          ends_at?: string | null
          heading?: string | null
          id?: string
          image_media_id?: string | null
          is_visible?: boolean
          link_url?: string | null
          publisher_id?: string | null
          section_id?: string
          sort_order?: number
          starts_at?: string | null
          subheading?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          title: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string | null
          type: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string | null
          type?: Database["public"]["Enums"]["homepage_section_type"]
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          book_id: string
          low_stock_threshold: number
          quantity_on_hand: number
          quantity_reserved: number
          stock_tracking_enabled: boolean
          untracked_available: boolean
          updated_at: string
        }
        Insert: {
          book_id: string
          low_stock_threshold?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          stock_tracking_enabled?: boolean
          untracked_available?: boolean
          updated_at?: string
        }
        Update: {
          book_id?: string
          low_stock_threshold?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          stock_tracking_enabled?: boolean
          untracked_available?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          book_id: string | null
          id: string
          line_total: number
          order_id: string
          quantity: number
          sku_snapshot: string
          title_snapshot: string
          unit_price: number
        }
        Insert: {
          book_id?: string | null
          id?: string
          line_total: number
          order_id: string
          quantity: number
          sku_snapshot: string
          title_snapshot: string
          unit_price: number
        }
        Update: {
          book_id?: string | null
          id?: string
          line_total?: number
          order_id?: string
          quantity?: number
          sku_snapshot?: string
          title_snapshot?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          billing_address_id: string | null
          contact_email: string | null
          coupon_id: string | null
          customer_id: string | null
          customer_note: string | null
          discount_total: number
          grand_total: number
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          shipping_address_id: string | null
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          total_weight_g: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          billing_address_id?: string | null
          contact_email?: string | null
          coupon_id?: string | null
          customer_id?: string | null
          customer_note?: string | null
          discount_total?: number
          grand_total: number
          id?: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          shipping_address_id?: string | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total?: number
          total_weight_g: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          billing_address_id?: string | null
          contact_email?: string | null
          coupon_id?: string | null
          customer_id?: string | null
          customer_note?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          shipping_address_id?: string | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total_weight_g?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          config: Json
          display_name: string
          id: string
          is_enabled: boolean
          sort_order: number
        }
        Insert: {
          config?: Json
          display_name: string
          id: string
          is_enabled?: boolean
          sort_order?: number
        }
        Update: {
          config?: Json
          display_name?: string
          id?: string
          is_enabled?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          provider_id: string
          provider_reference: string | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          provider_id: string
          provider_reference?: string | null
          raw_response?: Json | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          provider_id?: string
          provider_reference?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_reason: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked_reason?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          logo_url: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          book_id: string
          created_at: string
          customer_id: string
          id: string
          order_item_id: string | null
          rating: number
          staff_replied_at: string | null
          staff_replied_by: string | null
          staff_reply: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
        }
        Insert: {
          body?: string | null
          book_id: string
          created_at?: string
          customer_id: string
          id?: string
          order_item_id?: string | null
          rating: number
          staff_replied_at?: string | null
          staff_replied_by?: string | null
          staff_reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Update: {
          body?: string | null
          book_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          order_item_id?: string | null
          rating?: number
          staff_replied_at?: string | null
          staff_replied_by?: string | null
          staff_reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_replied_by_fkey"
            columns: ["staff_replied_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_cities: {
        Row: {
          district_id: string
          id: string
          name: string
          postal_code: string | null
          sort_order: number
        }
        Insert: {
          district_id: string
          id?: string
          name: string
          postal_code?: string | null
          sort_order?: number
        }
        Update: {
          district_id?: string
          id?: string
          name?: string
          postal_code?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipping_cities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "shipping_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_districts: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          city_id: string
          id: string
          price: number
          updated_at: string
          weight_band_id: string
        }
        Insert: {
          city_id: string
          id?: string
          price: number
          updated_at?: string
          weight_band_id: string
        }
        Update: {
          city_id?: string
          id?: string
          price?: number
          updated_at?: string
          weight_band_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "shipping_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_weight_band_id_fkey"
            columns: ["weight_band_id"]
            isOneToOne: false
            referencedRelation: "shipping_weight_bands"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_weight_bands: {
        Row: {
          id: string
          label: string | null
          max_weight_g: number
          min_weight_g: number
        }
        Insert: {
          id?: string
          label?: string | null
          max_weight_g: number
          min_weight_g: number
        }
        Update: {
          id?: string
          label?: string | null
          max_weight_g?: number
          min_weight_g?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          facebook_url: string | null
          id: string
          instagram_url: string | null
          telegram_url: string | null
          twitter_url: string | null
          updated_at: string
          whatsapp_url: string | null
          youtube_url: string | null
        }
        Insert: {
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          telegram_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      static_pages: {
        Row: {
          body: string
          id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          book_id: string
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note: string | null
          performed_by: string | null
          quantity_delta: number
          reference_order_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          performed_by?: string | null
          quantity_delta: number
          reference_order_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          performed_by?: string | null
          quantity_delta?: number
          reference_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_fk"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level: string
          message: string
          source: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      url_redirects: {
        Row: {
          created_at: string
          id: string
          new_path: string
          old_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_path: string
          old_path: string
        }
        Update: {
          created_at?: string
          id?: string
          new_path?: string
          old_path?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          book_id: string
          customer_id: string
        }
        Insert: {
          added_at?: string
          book_id: string
          customer_id: string
        }
        Update: {
          added_at?: string
          book_id?: string
          customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_order_coupon_discount: {
        Args: { p_discount: number; p_order_id: string }
        Returns: undefined
      }
      calculate_shipping_cost: {
        Args: { p_city_id: string; p_total_weight_g: number }
        Returns: {
          rate: number
          weight_band_id: string
        }[]
      }
      commit_reserved_stock: {
        Args: { p_book_id: string; p_order_id: string; p_quantity: number }
        Returns: undefined
      }
      confirm_cod_order: { Args: { p_order_id: string }; Returns: undefined }
      current_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      get_guest_order_for_payment: {
        Args: { p_order_id: string }
        Returns: {
          grand_total: number
          order_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
        }[]
      }
      is_staff: { Args: never; Returns: boolean }
      mark_order_failed: {
        Args: { p_note?: string; p_order_id: string }
        Returns: undefined
      }
      next_order_number: { Args: never; Returns: string }
      place_guest_order: {
        Args: {
          p_city_id: string
          p_contact_email?: string
          p_coupon_code?: string
          p_customer_note?: string
          p_items: Json
          p_line1: string
          p_line2: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_phone: string
          p_postal_code: string
          p_recipient_name: string
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      record_guest_payment_transaction: {
        Args: {
          p_amount: number
          p_order_id: string
          p_provider_reference: string
        }
        Returns: undefined
      }
      release_reserved_stock: {
        Args: { p_book_id: string; p_order_id: string; p_quantity: number }
        Returns: undefined
      }
      reserve_stock: {
        Args: { p_book_id: string; p_order_id: string; p_quantity: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_guest_order: {
        Args: { p_order_number: string; p_phone: string }
        Returns: {
          city_name: string
          discount_total: number
          district_name: string
          grand_total: number
          items: Json
          line1: string
          line2: string
          order_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          placed_at: string
          postal_code: string
          recipient_name: string
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
        }[]
      }
      validate_and_redeem_coupon: {
        Args: {
          p_code: string
          p_customer_id: string
          p_order_id: string
          p_order_subtotal: number
        }
        Returns: number
      }
    }
    Enums: {
      coupon_scope: "all" | "book" | "category"
      coupon_type: "percentage" | "fixed"
      homepage_section_type:
        | "hero_slider"
        | "promo_banner"
        | "featured_books"
        | "new_arrivals"
        | "best_sellers"
        | "featured_authors"
        | "featured_publishers"
        | "offer_section"
        | "popup_banner"
      media_kind: "image" | "document"
      order_status:
        | "pending_payment"
        | "processing"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "failed"
      payment_method: "cod" | "bank_ipg" | "bank_transfer"
      payment_status:
        | "pending"
        | "authorized"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      review_status: "pending" | "approved" | "rejected"
      staff_role: "admin" | "manager" | "editor"
      stock_movement_type:
        | "restock"
        | "sale"
        | "return"
        | "manual_adjustment"
        | "reservation"
        | "release_reservation"
        | "damaged"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      coupon_scope: ["all", "book", "category"],
      coupon_type: ["percentage", "fixed"],
      homepage_section_type: [
        "hero_slider",
        "promo_banner",
        "featured_books",
        "new_arrivals",
        "best_sellers",
        "featured_authors",
        "featured_publishers",
        "offer_section",
        "popup_banner",
      ],
      media_kind: ["image", "document"],
      order_status: [
        "pending_payment",
        "processing",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "failed",
      ],
      payment_method: ["cod", "bank_ipg", "bank_transfer"],
      payment_status: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      review_status: ["pending", "approved", "rejected"],
      staff_role: ["admin", "manager", "editor"],
      stock_movement_type: [
        "restock",
        "sale",
        "return",
        "manual_adjustment",
        "reservation",
        "release_reservation",
        "damaged",
      ],
    },
  },
} as const
