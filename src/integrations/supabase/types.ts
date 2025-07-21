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
    PostgrestVersion: "12.2.3 (519615d)"
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
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_level?: number
          id?: string
          last_updated?: string
          minimum_threshold?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          current_level?: number
          id?: string
          last_updated?: string
          minimum_threshold?: number
        }
        Relationships: []
      }
      cylinder_fillings: {
        Row: {
          batch_number: string | null
          created_at: string
          cylinder_id: string
          id: string
          is_approved: boolean
          observations: string | null
          operator_name: string
          tank_id: string
          weight_filled: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          cylinder_id: string
          id?: string
          is_approved?: boolean
          observations?: string | null
          operator_name: string
          tank_id: string
          weight_filled: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          cylinder_id?: string
          id?: string
          is_approved?: boolean
          observations?: string | null
          operator_name?: string
          tank_id?: string
          weight_filled?: number
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_fillings_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "cylinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_fillings_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "co2_tank"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_transfers: {
        Row: {
          created_at: string
          customer_name: string | null
          cylinder_id: string
          cylinder_quantity: number | null
          delivery_note_number: string | null
          driver_name: string | null
          from_location: Database["public"]["Enums"]["cylinder_location"]
          id: string
          observations: string | null
          operator_name: string
          to_location: Database["public"]["Enums"]["cylinder_location"]
          transfer_date: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          cylinder_id: string
          cylinder_quantity?: number | null
          delivery_note_number?: string | null
          driver_name?: string | null
          from_location: Database["public"]["Enums"]["cylinder_location"]
          id?: string
          observations?: string | null
          operator_name: string
          to_location: Database["public"]["Enums"]["cylinder_location"]
          transfer_date?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          cylinder_id?: string
          cylinder_quantity?: number | null
          delivery_note_number?: string | null
          driver_name?: string | null
          from_location?: Database["public"]["Enums"]["cylinder_location"]
          id?: string
          observations?: string | null
          operator_name?: string
          to_location?: Database["public"]["Enums"]["cylinder_location"]
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_transfers_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "cylinders"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinders: {
        Row: {
          capacity: Database["public"]["Enums"]["cylinder_capacity"]
          created_at: string
          current_location: Database["public"]["Enums"]["cylinder_location"]
          current_status: Database["public"]["Enums"]["cylinder_status"]
          current_weight: number | null
          id: string
          is_active: boolean
          last_hydrostatic_test: string
          manufacturing_date: string
          next_test_due: string | null
          observations: string | null
          serial_number: string
          updated_at: string
          valve_type: Database["public"]["Enums"]["valve_type"]
        }
        Insert: {
          capacity: Database["public"]["Enums"]["cylinder_capacity"]
          created_at?: string
          current_location?: Database["public"]["Enums"]["cylinder_location"]
          current_status?: Database["public"]["Enums"]["cylinder_status"]
          current_weight?: number | null
          id?: string
          is_active?: boolean
          last_hydrostatic_test: string
          manufacturing_date: string
          next_test_due?: string | null
          observations?: string | null
          serial_number: string
          updated_at?: string
          valve_type?: Database["public"]["Enums"]["valve_type"]
        }
        Update: {
          capacity?: Database["public"]["Enums"]["cylinder_capacity"]
          created_at?: string
          current_location?: Database["public"]["Enums"]["cylinder_location"]
          current_status?: Database["public"]["Enums"]["cylinder_status"]
          current_weight?: number | null
          id?: string
          is_active?: boolean
          last_hydrostatic_test?: string
          manufacturing_date?: string
          next_test_due?: string | null
          observations?: string | null
          serial_number?: string
          updated_at?: string
          valve_type?: Database["public"]["Enums"]["valve_type"]
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
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          title?: string
        }
        Relationships: []
      }
      tank_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          observations: string | null
          operator_name: string
          quantity: number
          reference_number: string | null
          supplier: string | null
          tank_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          observations?: string | null
          operator_name: string
          quantity: number
          reference_number?: string | null
          supplier?: string | null
          tank_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          observations?: string | null
          operator_name?: string
          quantity?: number
          reference_number?: string | null
          supplier?: string | null
          tank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tank_movements_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "co2_tank"
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
      cylinder_capacity: "9kg" | "22kg" | "25kg"
      cylinder_location:
        | "despacho"
        | "estacion_llenado"
        | "en_mantenimiento"
        | "fuera_de_servicio"
        | "asignaciones"
        | "devoluciones"
      cylinder_status:
        | "vacio"
        | "lleno"
        | "en_llenado"
        | "en_mantenimiento"
        | "fuera_de_servicio"
      movement_type: "entrada" | "salida" | "llenado" | "traslado"
      valve_type: "standard" | "special" | "industrial"
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
      cylinder_capacity: ["9kg", "22kg", "25kg"],
      cylinder_location: [
        "despacho",
        "estacion_llenado",
        "en_mantenimiento",
        "fuera_de_servicio",
        "asignaciones",
        "devoluciones",
      ],
      cylinder_status: [
        "vacio",
        "lleno",
        "en_llenado",
        "en_mantenimiento",
        "fuera_de_servicio",
      ],
      movement_type: ["entrada", "salida", "llenado", "traslado"],
      valve_type: ["standard", "special", "industrial"],
    },
  },
} as const
