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
      job_queue: {
        Row: {
          chyba: string | null
          created_at: string
          id: string
          locked_at: string | null
          max_pokusu: number
          payload: Json
          pokusy: number
          run_after: string
          stav: Database["public"]["Enums"]["job_status"]
          typ: string
        }
        Insert: {
          chyba?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          max_pokusu?: number
          payload?: Json
          pokusy?: number
          run_after?: string
          stav?: Database["public"]["Enums"]["job_status"]
          typ: string
        }
        Update: {
          chyba?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          max_pokusu?: number
          payload?: Json
          pokusy?: number
          run_after?: string
          stav?: Database["public"]["Enums"]["job_status"]
          typ?: string
        }
        Relationships: []
      }
      master_prompts: {
        Row: {
          aktivni: boolean
          created_by_profile_id: string | null
          id: string
          obsah: string
          platny_od: string
          typ: Database["public"]["Enums"]["prompt_type"]
          verze: number
        }
        Insert: {
          aktivni?: boolean
          created_by_profile_id?: string | null
          id?: string
          obsah: string
          platny_od?: string
          typ: Database["public"]["Enums"]["prompt_type"]
          verze: number
        }
        Update: {
          aktivni?: boolean
          created_by_profile_id?: string | null
          id?: string
          obsah?: string
          platny_od?: string
          typ?: Database["public"]["Enums"]["prompt_type"]
          verze?: number
        }
        Relationships: [
          {
            foreignKeyName: "master_prompts_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          dokonceno_odeslano_at: string | null
          id: string
          mentor_id: string
          recording_id: string
          stav: Database["public"]["Enums"]["meeting_status"]
          termin: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dokonceno_odeslano_at?: string | null
          id?: string
          mentor_id: string
          recording_id: string
          stav?: Database["public"]["Enums"]["meeting_status"]
          termin?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dokonceno_odeslano_at?: string | null
          id?: string
          mentor_id?: string
          recording_id?: string
          stav?: Database["public"]["Enums"]["meeting_status"]
          termin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          aktivni: boolean
          calendly_embed: string | null
          calendly_url: string | null
          created_at: string
          id: string
          mcs_stav: Database["public"]["Enums"]["mcs_status"]
          profile_id: string
          updated_at: string
        }
        Insert: {
          aktivni?: boolean
          calendly_embed?: string | null
          calendly_url?: string | null
          created_at?: string
          id?: string
          mcs_stav?: Database["public"]["Enums"]["mcs_status"]
          profile_id: string
          updated_at?: string
        }
        Update: {
          aktivni?: boolean
          calendly_embed?: string | null
          calendly_url?: string | null
          created_at?: string
          id?: string
          mcs_stav?: Database["public"]["Enums"]["mcs_status"]
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          chyba: string | null
          created_at: string
          doruceno: boolean | null
          id: string
          odeslano_at: string | null
          plan_item_id: string | null
          predmet: string
          prijemce_email: string
          prijemce_profile_id: string | null
          recording_id: string | null
          typ: string
        }
        Insert: {
          chyba?: string | null
          created_at?: string
          doruceno?: boolean | null
          id?: string
          odeslano_at?: string | null
          plan_item_id?: string | null
          predmet: string
          prijemce_email: string
          prijemce_profile_id?: string | null
          recording_id?: string | null
          typ: string
        }
        Update: {
          chyba?: string | null
          created_at?: string
          doruceno?: boolean | null
          id?: string
          odeslano_at?: string | null
          plan_item_id?: string | null
          predmet?: string
          prijemce_email?: string
          prijemce_profile_id?: string | null
          recording_id?: string | null
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_prijemce_profile_id_fkey"
            columns: ["prijemce_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          castka_kc: number
          created_at: string
          id: string
          plan_item_id: string | null
          recording_id: string | null
          stav: Database["public"]["Enums"]["payment_status"]
          stripe_link_odeslan_at: string | null
          student_id: string
          typ: Database["public"]["Enums"]["payment_type"]
          uhrazeno_at: string | null
          uhrazeno_oznacil_profile_id: string | null
        }
        Insert: {
          castka_kc: number
          created_at?: string
          id?: string
          plan_item_id?: string | null
          recording_id?: string | null
          stav?: Database["public"]["Enums"]["payment_status"]
          stripe_link_odeslan_at?: string | null
          student_id: string
          typ: Database["public"]["Enums"]["payment_type"]
          uhrazeno_at?: string | null
          uhrazeno_oznacil_profile_id?: string | null
        }
        Update: {
          castka_kc?: number
          created_at?: string
          id?: string
          plan_item_id?: string | null
          recording_id?: string | null
          stav?: Database["public"]["Enums"]["payment_status"]
          stripe_link_odeslan_at?: string | null
          student_id?: string
          typ?: Database["public"]["Enums"]["payment_type"]
          uhrazeno_at?: string | null
          uhrazeno_oznacil_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_uhrazeno_oznacil_profile_id_fkey"
            columns: ["uhrazeno_oznacil_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          faze: Database["public"]["Enums"]["phase_type"] | null
          id: string
          poradi: number
          puvodni_termin: string | null
          splneno_at: string | null
          stav: Database["public"]["Enums"]["plan_item_status"]
          student_id: string
          template_item_id: string | null
          termin: string
          typ: Database["public"]["Enums"]["plan_item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          faze?: Database["public"]["Enums"]["phase_type"] | null
          id?: string
          poradi: number
          puvodni_termin?: string | null
          splneno_at?: string | null
          stav?: Database["public"]["Enums"]["plan_item_status"]
          student_id: string
          template_item_id?: string | null
          termin: string
          typ: Database["public"]["Enums"]["plan_item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          faze?: Database["public"]["Enums"]["phase_type"] | null
          id?: string
          poradi?: number
          puvodni_termin?: string | null
          splneno_at?: string | null
          stav?: Database["public"]["Enums"]["plan_item_status"]
          student_id?: string
          template_item_id?: string | null
          termin?: string
          typ?: Database["public"]["Enums"]["plan_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          jmeno: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          jmeno: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          jmeno?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      program_templates: {
        Row: {
          aktivni: boolean
          base_mesicu: number
          created_at: string
          id: string
          program: Database["public"]["Enums"]["program_type"]
          verze: number
          vychozi_delka_mesicu: number
        }
        Insert: {
          aktivni?: boolean
          base_mesicu: number
          created_at?: string
          id?: string
          program: Database["public"]["Enums"]["program_type"]
          verze: number
          vychozi_delka_mesicu: number
        }
        Update: {
          aktivni?: boolean
          base_mesicu?: number
          created_at?: string
          id?: string
          program?: Database["public"]["Enums"]["program_type"]
          verze?: number
          vychozi_delka_mesicu?: number
        }
        Relationships: []
      }
      recording_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          detail: Json | null
          id: string
          recording_id: string
          typ: string
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          recording_id: string
          typ: string
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
          recording_id?: string
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recording_events_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          created_at: string
          delka_sekund: number | null
          id: string
          mp3_path: string | null
          nahrano_at: string
          plan_item_id: string
          pokus: number
          puvodni_nazev: string | null
          puvodni_soubor_path: string | null
          souhlas_klienta: boolean
          stav: Database["public"]["Enums"]["recording_status"]
          student_id: string
          updated_at: string
          vraceno_duvod: string | null
        }
        Insert: {
          created_at?: string
          delka_sekund?: number | null
          id?: string
          mp3_path?: string | null
          nahrano_at?: string
          plan_item_id: string
          pokus?: number
          puvodni_nazev?: string | null
          puvodni_soubor_path?: string | null
          souhlas_klienta?: boolean
          stav?: Database["public"]["Enums"]["recording_status"]
          student_id: string
          updated_at?: string
          vraceno_duvod?: string | null
        }
        Update: {
          created_at?: string
          delka_sekund?: number | null
          id?: string
          mp3_path?: string | null
          nahrano_at?: string
          plan_item_id?: string
          pokus?: number
          puvodni_nazev?: string | null
          puvodni_soubor_path?: string | null
          souhlas_klienta?: boolean
          stav?: Database["public"]["Enums"]["recording_status"]
          student_id?: string
          updated_at?: string
          vraceno_duvod?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          obsah: string
          obsah_ai: string
          odemceno_at: string | null
          odeslano_at: string | null
          prompt_typ: Database["public"]["Enums"]["prompt_type"]
          prompt_verze: number
          recording_id: string
          schvaleno_at: string | null
          schvalil_profile_id: string | null
          stav: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          obsah: string
          obsah_ai: string
          odemceno_at?: string | null
          odeslano_at?: string | null
          prompt_typ: Database["public"]["Enums"]["prompt_type"]
          prompt_verze: number
          recording_id: string
          schvaleno_at?: string | null
          schvalil_profile_id?: string | null
          stav?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          obsah?: string
          obsah_ai?: string
          odemceno_at?: string | null
          odeslano_at?: string | null
          prompt_typ?: Database["public"]["Enums"]["prompt_type"]
          prompt_verze?: number
          recording_id?: string
          schvaleno_at?: string | null
          schvalil_profile_id?: string | null
          stav?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_schvalil_profile_id_fkey"
            columns: ["schvalil_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by_profile_id: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by_profile_id?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by_profile_id?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standards: {
        Row: {
          aktivni: boolean
          id: string
          nazev: string
          obsah: string
          poradi: number
          updated_at: string
        }
        Insert: {
          aktivni?: boolean
          id?: string
          nazev: string
          obsah: string
          poradi?: number
          updated_at?: string
        }
        Update: {
          aktivni?: boolean
          id?: string
          nazev?: string
          obsah?: string
          poradi?: number
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          cilove_datum_certifikace: string | null
          created_at: string
          datum_startu: string
          id: string
          poznamky: string | null
          profile_id: string
          program: Database["public"]["Enums"]["program_type"]
          skupina: string | null
          stav: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          cilove_datum_certifikace?: string | null
          created_at?: string
          datum_startu: string
          id?: string
          poznamky?: string | null
          profile_id: string
          program: Database["public"]["Enums"]["program_type"]
          skupina?: string | null
          stav?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          cilove_datum_certifikace?: string | null
          created_at?: string
          datum_startu?: string
          id?: string
          poznamky?: string | null
          profile_id?: string
          program?: Database["public"]["Enums"]["program_type"]
          skupina?: string | null
          stav?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          faze: Database["public"]["Enums"]["phase_type"]
          id: string
          mesic: number
          poradi: number
          template_id: string
          typ: Database["public"]["Enums"]["plan_item_type"]
        }
        Insert: {
          faze: Database["public"]["Enums"]["phase_type"]
          id?: string
          mesic: number
          poradi: number
          template_id: string
          typ: Database["public"]["Enums"]["plan_item_type"]
        }
        Update: {
          faze?: Database["public"]["Enums"]["phase_type"]
          id?: string
          mesic?: number
          poradi?: number
          template_id?: string
          typ?: Database["public"]["Enums"]["plan_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          created_at: string
          id: string
          recording_id: string
          segmenty: Json | null
          sluzba: string | null
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          recording_id: string
          segmenty?: Json | null
          sluzba?: string | null
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          recording_id?: string
          segmenty?: Json | null
          sluzba?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: true
            referencedRelation: "recordings"
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
      job_status: "ceka" | "bezi" | "hotovo" | "chyba"
      mcs_status: "nema" | "v_priprave" | "ziskano"
      meeting_status: "bez_terminu" | "naplanovana" | "dokoncena" | "zrusena"
      payment_status: "ceka" | "uhrazeno"
      payment_type: "dodatecny_termin_500" | "opravna_1000"
      phase_type: "acc" | "pcc"
      plan_item_status:
        | "naplanovano"
        | "po_terminu"
        | "ceka_na_poplatek"
        | "nahrano"
        | "splneno"
        | "splneno_historicky"
        | "zruseno"
      plan_item_type: "dlouha" | "kratka_s_reportem" | "kratka_bez_vyhodnoceni"
      program_type: "acc" | "upgrade_pcc" | "komplet"
      prompt_type: "dlouha" | "kratka"
      recording_status:
        | "nahrano"
        | "zpracovava_se"
        | "vraceno"
        | "ceka_na_schvaleni"
        | "ceka_na_mentora"
        | "schuzka_planovana"
        | "dokonceno"
        | "report_odeslan"
        | "zapocteno"
      report_status: "koncept" | "schvalen" | "odeslan" | "odemcen"
      student_status: "aktivni" | "pozastaven" | "certifikovan" | "ukoncen"
      user_role: "student" | "mentor" | "verca" | "meira" | "admin"
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
      job_status: ["ceka", "bezi", "hotovo", "chyba"],
      mcs_status: ["nema", "v_priprave", "ziskano"],
      meeting_status: ["bez_terminu", "naplanovana", "dokoncena", "zrusena"],
      payment_status: ["ceka", "uhrazeno"],
      payment_type: ["dodatecny_termin_500", "opravna_1000"],
      phase_type: ["acc", "pcc"],
      plan_item_status: [
        "naplanovano",
        "po_terminu",
        "ceka_na_poplatek",
        "nahrano",
        "splneno",
        "splneno_historicky",
        "zruseno",
      ],
      plan_item_type: ["dlouha", "kratka_s_reportem", "kratka_bez_vyhodnoceni"],
      program_type: ["acc", "upgrade_pcc", "komplet"],
      prompt_type: ["dlouha", "kratka"],
      recording_status: [
        "nahrano",
        "zpracovava_se",
        "vraceno",
        "ceka_na_schvaleni",
        "ceka_na_mentora",
        "schuzka_planovana",
        "dokonceno",
        "report_odeslan",
        "zapocteno",
      ],
      report_status: ["koncept", "schvalen", "odeslan", "odemcen"],
      student_status: ["aktivni", "pozastaven", "certifikovan", "ukoncen"],
      user_role: ["student", "mentor", "verca", "meira", "admin"],
    },
  },
} as const
