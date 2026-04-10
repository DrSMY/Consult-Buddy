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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clinical_documents: {
        Row: {
          content: string
          created_at: string
          document_type: string
          id: string
          metadata: Json | null
          peptide_name: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          document_type: string
          id?: string
          metadata?: Json | null
          peptide_name?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          document_type?: string
          id?: string
          metadata?: Json | null
          peptide_name?: string | null
          title?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          ai_recommendations: Json | null
          created_at: string
          doctor_notes: string | null
          id: string
          intake_answers: Json
          next_steps: string | null
          patient_guidelines: string | null
          patient_name: string
          program: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          created_at?: string
          doctor_notes?: string | null
          id?: string
          intake_answers?: Json
          next_steps?: string | null
          patient_guidelines?: string | null
          patient_name?: string
          program?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          created_at?: string
          doctor_notes?: string | null
          id?: string
          intake_answers?: Json
          next_steps?: string | null
          patient_guidelines?: string | null
          patient_name?: string
          program?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_guides: {
        Row: {
          consultation_id: string | null
          created_at: string
          expires_at: string
          guide_data: Json
          id: string
          patient_name: string
          program: string
          user_id: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          expires_at?: string
          guide_data: Json
          id?: string
          patient_name: string
          program?: string
          user_id: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          expires_at?: string
          guide_data?: Json
          id?: string
          patient_name?: string
          program?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_guides_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      peptide_program_matrix: {
        Row: {
          health_goal: string
          id: string
          peptide_protocol_id: string
          priority: string
        }
        Insert: {
          health_goal: string
          id?: string
          peptide_protocol_id: string
          priority: string
        }
        Update: {
          health_goal?: string
          id?: string
          peptide_protocol_id?: string
          priority?: string
        }
        Relationships: [
          {
            foreignKeyName: "peptide_program_matrix_peptide_protocol_id_fkey"
            columns: ["peptide_protocol_id"]
            isOneToOne: false
            referencedRelation: "peptide_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      peptide_protocols: {
        Row: {
          administration_route: string | null
          best_use_for: string | null
          categories: string[] | null
          common_side_effects: string | null
          contraindications: string | null
          created_at: string
          dosage_instructions: string | null
          how_it_works: string | null
          id: string
          key_blood_tests: string | null
          name: string
          possible_combinations: string | null
          prescription_details: string | null
          recommended_supplements: string | null
          strength_volume: string | null
          target_benefits: string | null
          treatment_duration: string | null
        }
        Insert: {
          administration_route?: string | null
          best_use_for?: string | null
          categories?: string[] | null
          common_side_effects?: string | null
          contraindications?: string | null
          created_at?: string
          dosage_instructions?: string | null
          how_it_works?: string | null
          id?: string
          key_blood_tests?: string | null
          name: string
          possible_combinations?: string | null
          prescription_details?: string | null
          recommended_supplements?: string | null
          strength_volume?: string | null
          target_benefits?: string | null
          treatment_duration?: string | null
        }
        Update: {
          administration_route?: string | null
          best_use_for?: string | null
          categories?: string[] | null
          common_side_effects?: string | null
          contraindications?: string | null
          created_at?: string
          dosage_instructions?: string | null
          how_it_works?: string | null
          id?: string
          key_blood_tests?: string | null
          name?: string
          possible_combinations?: string | null
          prescription_details?: string | null
          recommended_supplements?: string | null
          strength_volume?: string | null
          target_benefits?: string | null
          treatment_duration?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
          rejected: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          rejected?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          rejected?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "doctor" | "nurse" | "admin"
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
      app_role: ["doctor", "nurse", "admin"],
    },
  },
} as const
