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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      allowed_phones: {
        Row: {
          approved: boolean
          created_at: string
          full_name: string
          is_admin: boolean
          phone: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          full_name?: string
          is_admin?: boolean
          phone: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          full_name?: string
          is_admin?: boolean
          phone?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          deleted: boolean
          id: string
          media_kind: Database["public"]["Enums"]["media_type"] | null
          media_url: string | null
          pinned: boolean
          trip_id: string | null
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted?: boolean
          id?: string
          media_kind?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          pinned?: boolean
          trip_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted?: boolean
          id?: string
          media_kind?: Database["public"]["Enums"]["media_type"] | null
          media_url?: string | null
          pinned?: boolean
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          day_date: string | null
          day_no: number
          description: string
          id: string
          maps_url: string | null
          title: string
          trip_id: string
        }
        Insert: {
          day_date?: string | null
          day_no?: number
          description?: string
          id?: string
          maps_url?: string | null
          title?: string
          trip_id: string
        }
        Update: {
          day_date?: string | null
          day_no?: number
          description?: string
          id?: string
          maps_url?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          display_name?: string
          id?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_locations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          lat: number
          lng: number
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          lat: number
          lng: number
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          lat?: number
          lng?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_locations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          ended_at: string | null
          host_id: string
          host_name: string
          id: string
          is_active: boolean
          public_access: boolean
          started_at: string
          stream_url: string | null
          title: string
          trip_id: string | null
        }
        Insert: {
          ended_at?: string | null
          host_id: string
          host_name?: string
          id?: string
          is_active?: boolean
          public_access?: boolean
          started_at?: string
          stream_url?: string | null
          title?: string
          trip_id?: string | null
        }
        Update: {
          ended_at?: string | null
          host_id?: string
          host_name?: string
          id?: string
          is_active?: boolean
          public_access?: boolean
          started_at?: string
          stream_url?: string | null
          title?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          caption: string
          created_at: string
          hidden: boolean
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          storage_path: string
          thumbnail_path: string | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          hidden?: boolean
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          storage_path: string
          thumbnail_path?: string | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          hidden?: boolean
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          storage_path?: string
          thumbnail_path?: string | null
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string
          user_id: string
          utr: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id: string
          user_id: string
          utr?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string
          user_id?: string
          utr?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          last_seen: string
          phone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          last_seen?: string
          phone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_seen?: string
          phone?: string
        }
        Relationships: []
      }
      thirukkural: {
        Row: {
          active: boolean
          created_at: string
          explanation: string
          id: string
          kural: string
          number: number | null
          scheduled_date: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          explanation?: string
          id?: string
          kural: string
          number?: number | null
          scheduled_date?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          explanation?: string
          id?: string
          kural?: string
          number?: number | null
          scheduled_date?: string | null
        }
        Relationships: []
      }
      trip_images: {
        Row: {
          id: string
          sort_order: number
          trip_id: string
          url: string
        }
        Insert: {
          id?: string
          sort_order?: number
          trip_id: string
          url: string
        }
        Update: {
          id?: string
          sort_order?: number
          trip_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_images_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_participation: {
        Row: {
          id: string
          status: Database["public"]["Enums"]["participation_status"]
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          status?: Database["public"]["Enums"]["participation_status"]
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          status?: Database["public"]["Enums"]["participation_status"]
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_participation_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_per_person: number
          cover_image: string | null
          created_at: string
          destination: string
          details: string
          end_date: string | null
          id: string
          maps_url: string | null
          name: string
          start_date: string | null
          start_location: string
          status: Database["public"]["Enums"]["trip_status"]
        }
        Insert: {
          budget_per_person?: number
          cover_image?: string | null
          created_at?: string
          destination?: string
          details?: string
          end_date?: string | null
          id?: string
          maps_url?: string | null
          name: string
          start_date?: string | null
          start_location?: string
          status?: Database["public"]["Enums"]["trip_status"]
        }
        Update: {
          budget_per_person?: number
          cover_image?: string | null
          created_at?: string
          destination?: string
          details?: string
          end_date?: string | null
          id?: string
          maps_url?: string | null
          name?: string
          start_date?: string | null
          start_location?: string
          status?: Database["public"]["Enums"]["trip_status"]
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
      wallet_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          trip_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          trip_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          trip_id?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_me: { Args: { _full_name: string }; Returns: string }
      current_email: { Args: never; Returns: string }
      current_phone: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      media_type: "photo" | "video"
      participation_status: "pending" | "confirmed" | "not_interested"
      payment_status: "pending" | "verified" | "rejected"
      trip_status: "upcoming" | "live" | "completed" | "coming_soon"
      txn_type: "income" | "expense"
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
      app_role: ["admin", "member"],
      media_type: ["photo", "video"],
      participation_status: ["pending", "confirmed", "not_interested"],
      payment_status: ["pending", "verified", "rejected"],
      trip_status: ["upcoming", "live", "completed", "coming_soon"],
      txn_type: ["income", "expense"],
    },
  },
} as const
