export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      cylinders: {
        Row: {
          capacity: string
          created_at: string
          current_location: string
          current_status: string
          id: string
          is_active: boolean
          last_hydrostatic_test: string
          manufacturing_date: string
          next_test_due: string
          observations: string | null
          serial_number: string
          updated_at: string
          valve_type: string
        }
        Insert: {
          capacity: string
          created_at?: string
          current_location?: string
          current_status?: string
          id?: string
          is_active?: boolean
          last_hydrostatic_test: string
          manufacturing_date: string
          next_test_due: string
          observations?: string | null
          serial_number: string
          updated_at?: string
          valve_type: string
        }
        Update: {
          capacity?: string
          created_at?: string
          current_location?: string
          current_status?: string
          id?: string
          is_active?: boolean
          last_hydrostatic_test?: string
          manufacturing_date?: string
          next_test_due?: string
          observations?: string | null
          serial_number?: string
          updated_at?: string
          valve_type?: string
        }
        Relationships: []
      }
      fillings: {
        Row: {
          batch_number: string | null
          created_at: string
          cylinder_id: string
          id: string
          observations: string | null
          operator_name: string
          tank_id: string
          updated_at: string
          weight_filled: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          cylinder_id: string
          id?: string
          observations?: string | null
          operator_name: string
          tank_id: string
          updated_at?: string
          weight_filled: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          cylinder_id?: string
          id?: string
          observations?: string | null
          operator_name?: string
          tank_id?: string
          updated_at?: string
          weight_filled?: number
        }
        Relationships: [
          {
            foreignKeyName: "fillings_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "cylinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fillings_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tanks: {
        Row: {
          capacity_kg: number
          created_at: string
          current_weight_kg: number
          id: string
          is_active: boolean
          last_refill_date: string | null
          tank_number: string
          updated_at: string
        }
        Insert: {
          capacity_kg: number
          created_at?: string
          current_weight_kg?: number
          id?: string
          is_active?: boolean
          last_refill_date?: string | null
          tank_number: string
          updated_at?: string
        }
        Update: {
          capacity_kg?: number
          created_at?: string
          current_weight_kg?: number
          id?: string
          is_active?: boolean
          last_refill_date?: string | null
          tank_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          created_at: string
          cylinder_id: string
          from_location: string
          id: string
          observations: string | null
          operator_name: string
          to_location: string
        }
        Insert: {
          created_at?: string
          cylinder_id: string
          from_location: string
          id?: string
          observations?: string | null
          operator_name: string
          to_location: string
        }
        Update: {
          created_at?: string
          cylinder_id?: string
          from_location?: string
          id?: string
          observations?: string | null
          operator_name?: string
          to_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "cylinders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
