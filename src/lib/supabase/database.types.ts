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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_models: {
        Row: {
          confidence_interval: number | null
          model_id: string
          version: string
        }
        Insert: {
          confidence_interval?: number | null
          model_id?: string
          version: string
        }
        Update: {
          confidence_interval?: number | null
          model_id?: string
          version?: string
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          image_id: string
          mite_estimate: number | null
          model_id: string
          operation_date: string
          result_id: string
        }
        Insert: {
          image_id: string
          mite_estimate?: number | null
          model_id: string
          operation_date?: string
          result_id?: string
        }
        Update: {
          image_id?: string
          mite_estimate?: number | null
          model_id?: string
          operation_date?: string
          result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["image_id"]
          },
          {
            foreignKeyName: "analysis_results_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["model_id"]
          },
        ]
      }
      app_versions: {
        Row: {
          app_id: string
          description: string | null
          version: string
        }
        Insert: {
          app_id?: string
          description?: string | null
          version: string
        }
        Update: {
          app_id?: string
          description?: string | null
          version?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          image_id: string
          image_path: string
          image_status: Database["public"]["Enums"]["image_status"]
          meta_data: Json | null
          mite_count: number | null
          notes: string | null
          quality: Database["public"]["Enums"]["image_quality"]
          submission_id: string
        }
        Insert: {
          created_at?: string
          image_id?: string
          image_path: string
          image_status?: Database["public"]["Enums"]["image_status"]
          meta_data?: Json | null
          mite_count?: number | null
          notes?: string | null
          quality?: Database["public"]["Enums"]["image_quality"]
          submission_id: string
        }
        Update: {
          created_at?: string
          image_id?: string
          image_path?: string
          image_status?: Database["public"]["Enums"]["image_status"]
          meta_data?: Json | null
          mite_count?: number | null
          notes?: string | null
          quality?: Database["public"]["Enums"]["image_quality"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_history: {
        Row: {
          action: string | null
          changed_at: string
          changed_by: string | null
          comment: string | null
          from_status: Database["public"]["Enums"]["submission_status"] | null
          id: string
          payload: Json | null
          submission_id: string
          to_status: Database["public"]["Enums"]["submission_status"]
        }
        Insert: {
          action?: string | null
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          from_status?: Database["public"]["Enums"]["submission_status"] | null
          id?: string
          payload?: Json | null
          submission_id: string
          to_status: Database["public"]["Enums"]["submission_status"]
        }
        Update: {
          action?: string | null
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          from_status?: Database["public"]["Enums"]["submission_status"] | null
          id?: string
          payload?: Json | null
          submission_id?: string
          to_status?: Database["public"]["Enums"]["submission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "submission_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          app_version: string | null
          assigned_to: string | null
          comment: string | null
          device_info: Json
          id: string
          processed_by: string | null
          source: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submission_date: string
          training_ready: boolean
          type: Database["public"]["Enums"]["submission_type"]
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          assigned_to?: string | null
          comment?: string | null
          device_info: Json
          id?: string
          processed_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_date?: string
          training_ready?: boolean
          type?: Database["public"]["Enums"]["submission_type"]
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          assigned_to?: string | null
          comment?: string | null
          device_info?: Json
          id?: string
          processed_by?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_date?: string
          training_ready?: boolean
          type?: Database["public"]["Enums"]["submission_type"]
          updated_at?: string
        }
        Relationships: []
      }
      varroa_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      varroa_submission_review_images: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          created_by: string
          id: string
          image_index: number
          image_quality: string | null
          mite_count: number | null
          review_id: string
          submission_id: string
          training_ready: boolean
          updated_at: string
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_index: number
          image_quality?: string | null
          mite_count?: number | null
          review_id: string
          submission_id: string
          training_ready?: boolean
          updated_at?: string
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_index?: number
          image_quality?: string | null
          mite_count?: number | null
          review_id?: string
          submission_id?: string
          training_ready?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "varroa_submission_review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "varroa_submission_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "varroa_submission_review_images_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      varroa_submission_reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          created_by: string
          current_image_index: number
          id: string
          image_notes: Json | null
          image_quality: string | null
          mite_count: number | null
          submission_id: string
          training_ready: boolean
          updated_at: string
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by: string
          current_image_index?: number
          id?: string
          image_notes?: Json | null
          image_quality?: string | null
          mite_count?: number | null
          submission_id: string
          training_ready?: boolean
          updated_at?: string
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          created_by?: string
          current_image_index?: number
          id?: string
          image_notes?: Json | null
          image_quality?: string | null
          mite_count?: number | null
          submission_id?: string
          training_ready?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "varroa_submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      varroa_user_roles: {
        Row: {
          banned_at: string | null
          created_at: string
          expires_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          created_at?: string
          expires_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          created_at?: string
          expires_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_varroa_manager: { Args: { check_user_id: string }; Returns: boolean }
      is_varroa_member: { Args: { check_user_id: string }; Returns: boolean }
      varroa_available_new_count: { Args: never; Returns: number }
      varroa_claim_next_submission: { Args: never; Returns: string }
      varroa_delete_submission_as_admin: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      varroa_list_users: {
        Args: never
        Returns: {
          banned_at: string
          created_at: string
          email: string
          expires_at: string
          last_sign_in_at: string
          role: string
          role_created_at: string
          user_id: string
        }[]
      }
      varroa_upsert_user_role: {
        Args: {
          p_new_expires_at: string
          p_new_role: string
          p_set_banned: boolean
          p_target_user_id: string
          p_unused_dummy?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      image_quality: "Høy" | "Middels" | "Lav" | "ikke_vurdert"
      image_status: "pending" | "analyzed" | "failed"
      submission_status:
        | "NY"
        | "UNDER_ARBEID"
        | "ARKIVERT"
        | "KLAR_FOR_KONTROLL"
        | "GODKJENT"
        | "KLAR_FOR_TRENING"
      submission_type: "BUNNBRETT_FOTO" | "KONTROLLFOTO"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      image_quality: ["Høy", "Middels", "Lav", "ikke_vurdert"],
      image_status: ["pending", "analyzed", "failed"],
      submission_status: [
        "NY",
        "UNDER_ARBEID",
        "ARKIVERT",
        "KLAR_FOR_KONTROLL",
        "GODKJENT",
        "KLAR_FOR_TRENING",
      ],
      submission_type: ["BUNNBRETT_FOTO", "KONTROLLFOTO"],
    },
  },
} as const
