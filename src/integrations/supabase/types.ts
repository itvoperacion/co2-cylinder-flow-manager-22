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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      co2_tank: {
        Row: {
          capacity: number
          created_at: string
          current_level: number
          id: string
          last_updated: string
          minimum_threshold: number
          tank_name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_level?: number
          id?: string
          last_updated?: string
          minimum_threshold?: number
          tank_name?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_level?: number
          id?: string
          last_updated?: string
          minimum_threshold?: number
          tank_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cylinders: {
        Row: {
          capacity: string
          created_at: string
          current_location: string
          current_status: string
          customer_info: string | null
          customer_owned: boolean
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
          customer_info?: string | null
          customer_owned?: boolean
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
          customer_info?: string | null
          customer_owned?: boolean
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
          approved_by: string | null
          batch_number: string | null
          created_at: string
          cylinder_id: string
          filling_datetime: string | null
          id: string
          is_approved: boolean | null
          is_reversed: boolean | null
          observations: string | null
          operator_name: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          shrinkage_amount: number | null
          shrinkage_percentage: number | null
          tank_id: string
          updated_at: string
          weight_filled: number
        }
        Insert: {
          approved_by?: string | null
          batch_number?: string | null
          created_at?: string
          cylinder_id: string
          filling_datetime?: string | null
          id?: string
          is_approved?: boolean | null
          is_reversed?: boolean | null
          observations?: string | null
          operator_name: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          shrinkage_amount?: number | null
          shrinkage_percentage?: number | null
          tank_id: string
          updated_at?: string
          weight_filled: number
        }
        Update: {
          approved_by?: string | null
          batch_number?: string | null
          created_at?: string
          cylinder_id?: string
          filling_datetime?: string | null
          id?: string
          is_approved?: boolean | null
          is_reversed?: boolean | null
          observations?: string | null
          operator_name?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          shrinkage_amount?: number | null
          shrinkage_percentage?: number | null
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
            referencedRelation: "co2_tank"
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
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tank_movements: {
        Row: {
          created_at: string
          id: string
          is_reversed: boolean | null
          movement_type: string
          observations: string | null
          operator_name: string
          quantity: number
          reference_filling_id: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          shrinkage_amount: number | null
          shrinkage_percentage: number | null
          supplier: string | null
          tank_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_reversed?: boolean | null
          movement_type: string
          observations?: string | null
          operator_name: string
          quantity: number
          reference_filling_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          shrinkage_amount?: number | null
          shrinkage_percentage?: number | null
          supplier?: string | null
          tank_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_reversed?: boolean | null
          movement_type?: string
          observations?: string | null
          operator_name?: string
          quantity?: number
          reference_filling_id?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          shrinkage_amount?: number | null
          shrinkage_percentage?: number | null
          supplier?: string | null
          tank_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tank_movements_reference_filling_id_fkey"
            columns: ["reference_filling_id"]
            isOneToOne: false
            referencedRelation: "fillings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tank_movements_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "co2_tank"
            referencedColumns: ["id"]
          },
        ]
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
          is_reversed: boolean | null
          observations: string | null
          operator_name: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          to_location: string
          transfer_number: string | null
          trip_closure: boolean | null
        }
        Insert: {
          created_at?: string
          cylinder_id: string
          from_location: string
          id?: string
          is_reversed?: boolean | null
          observations?: string | null
          operator_name: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          to_location: string
          transfer_number?: string | null
          trip_closure?: boolean | null
        }
        Update: {
          created_at?: string
          cylinder_id?: string
          from_location?: string
          id?: string
          is_reversed?: boolean | null
          observations?: string | null
          operator_name?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          to_location?: string
          transfer_number?: string | null
          trip_closure?: boolean | null
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
      reverse_filling: {
        Args: {
          filling_id: string
          reversal_reason?: string
          reversed_by: string
        }
        Returns: undefined
      }
      reverse_tank_movement: {
        Args: {
          movement_id: string
          reversal_reason?: string
          reversed_by: string
        }
        Returns: undefined
      }
      reverse_transfer: {
        Args: {
          reversal_reason?: string
          reversed_by: string
          transfer_id: string
        }
        Returns: undefined
      }
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
