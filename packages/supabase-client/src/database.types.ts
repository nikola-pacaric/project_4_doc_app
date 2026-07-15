export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      audit_events: {
        Row: {
          actor_id: string | null;
          actor_role: Database['public']['Enums']['user_role'] | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          patient_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          actor_role?: Database['public']['Enums']['user_role'] | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          patient_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          actor_role?: Database['public']['Enums']['user_role'] | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          patient_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_events_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_form_details: {
        Row: {
          appetite: string | null;
          completed_at: string | null;
          created_at: string;
          day_description: string | null;
          energy_level: number | null;
          entry_id: string;
          had_menstruation: boolean | null;
          had_naps: boolean | null;
          had_physical_activity: boolean | null;
          medication_outside_chronic_therapy: string | null;
          menstruation_notes: string | null;
          naps: string | null;
          sleep_notes: string | null;
          stress_level: number | null;
          took_chronic_therapy: boolean | null;
          took_medication_outside_chronic_therapy: boolean | null;
          updated_at: string;
          wake_time: string | null;
        };
        Insert: {
          appetite?: string | null;
          completed_at?: string | null;
          created_at?: string;
          day_description?: string | null;
          energy_level?: number | null;
          entry_id: string;
          had_menstruation?: boolean | null;
          had_naps?: boolean | null;
          had_physical_activity?: boolean | null;
          medication_outside_chronic_therapy?: string | null;
          menstruation_notes?: string | null;
          naps?: string | null;
          sleep_notes?: string | null;
          stress_level?: number | null;
          took_chronic_therapy?: boolean | null;
          took_medication_outside_chronic_therapy?: boolean | null;
          updated_at?: string;
          wake_time?: string | null;
        };
        Update: {
          appetite?: string | null;
          completed_at?: string | null;
          created_at?: string;
          day_description?: string | null;
          energy_level?: number | null;
          entry_id?: string;
          had_menstruation?: boolean | null;
          had_naps?: boolean | null;
          had_physical_activity?: boolean | null;
          medication_outside_chronic_therapy?: string | null;
          menstruation_notes?: string | null;
          naps?: string | null;
          sleep_notes?: string | null;
          stress_level?: number | null;
          took_chronic_therapy?: boolean | null;
          took_medication_outside_chronic_therapy?: boolean | null;
          updated_at?: string;
          wake_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_form_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      doctor_invite_codes: {
        Row: {
          code: string;
          created_at: string;
          doctor_id: string;
          expires_at: string;
          id: string;
          redeemed_at: string | null;
          redeemed_by_patient_id: string | null;
          revoked_at: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          doctor_id: string;
          expires_at?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_by_patient_id?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          doctor_id?: string;
          expires_at?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_by_patient_id?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'doctor_invite_codes_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'doctor_invite_codes_redeemed_by_patient_id_fkey';
            columns: ['redeemed_by_patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      doctor_patient_access: {
        Row: {
          active: boolean;
          created_at: string;
          doctor_id: string;
          id: string;
          invite_code_id: string | null;
          patient_id: string;
          revoked_at: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          doctor_id: string;
          id?: string;
          invite_code_id?: string | null;
          patient_id: string;
          revoked_at?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          doctor_id?: string;
          id?: string;
          invite_code_id?: string | null;
          patient_id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'doctor_patient_access_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'doctor_patient_access_invite_code_id_fkey';
            columns: ['invite_code_id'];
            isOneToOne: false;
            referencedRelation: 'doctor_invite_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'doctor_patient_access_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      entry_photos: {
        Row: {
          context_label: string | null;
          context_type: string;
          created_at: string;
          entry_id: string;
          height_px: number | null;
          id: string;
          mime_type: string;
          original_filename: string | null;
          patient_id: string;
          photo_path: string;
          size_bytes: number | null;
          thumbnail_path: string;
          thumbnail_size_bytes: number | null;
          width_px: number | null;
        };
        Insert: {
          context_label?: string | null;
          context_type: string;
          created_at?: string;
          entry_id: string;
          height_px?: number | null;
          id?: string;
          mime_type?: string;
          original_filename?: string | null;
          patient_id: string;
          photo_path: string;
          size_bytes?: number | null;
          thumbnail_path: string;
          thumbnail_size_bytes?: number | null;
          width_px?: number | null;
        };
        Update: {
          context_label?: string | null;
          context_type?: string;
          created_at?: string;
          entry_id?: string;
          height_px?: number | null;
          id?: string;
          mime_type?: string;
          original_filename?: string | null;
          patient_id?: string;
          photo_path?: string;
          size_bytes?: number | null;
          thumbnail_path?: string;
          thumbnail_size_bytes?: number | null;
          width_px?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'entry_photos_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entry_photos_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_details: {
        Row: {
          activity: string;
          created_at: string;
          duration_minutes: number;
          entry_id: string;
          intensity: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          activity: string;
          created_at?: string;
          duration_minutes: number;
          entry_id: string;
          intensity: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          activity?: string;
          created_at?: string;
          duration_minutes?: number;
          entry_id?: string;
          intensity?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      export_requests: {
        Row: {
          completed_at: string | null;
          created_at: string;
          doctor_id: string;
          id: string;
          mode: Database['public']['Enums']['export_mode'];
          patient_id: string;
          range_type: Database['public']['Enums']['export_range_type'];
          result: Json | null;
          selected_date: string | null;
          selected_month: string | null;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          doctor_id: string;
          id?: string;
          mode: Database['public']['Enums']['export_mode'];
          patient_id: string;
          range_type: Database['public']['Enums']['export_range_type'];
          result?: Json | null;
          selected_date?: string | null;
          selected_month?: string | null;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          doctor_id?: string;
          id?: string;
          mode?: Database['public']['Enums']['export_mode'];
          patient_id?: string;
          range_type?: Database['public']['Enums']['export_range_type'];
          result?: Json | null;
          selected_date?: string | null;
          selected_month?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'export_requests_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'export_requests_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      food_form_details: {
        Row: {
          created_at: string;
          entry_id: string;
          has_other_fluids: boolean | null;
          other_fluids: string | null;
          updated_at: string;
          water_liters: number | null;
        };
        Insert: {
          created_at?: string;
          entry_id: string;
          has_other_fluids?: boolean | null;
          other_fluids?: string | null;
          updated_at?: string;
          water_liters?: number | null;
        };
        Update: {
          created_at?: string;
          entry_id?: string;
          has_other_fluids?: boolean | null;
          other_fluids?: string | null;
          updated_at?: string;
          water_liters?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'food_form_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      meal_details: {
        Row: {
          created_at: string;
          description: string | null;
          entry_id: string;
          meal_type: string | null;
          name: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          entry_id: string;
          meal_type?: string | null;
          name?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          entry_id?: string;
          meal_type?: string | null;
          name?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meal_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      medication_details: {
        Row: {
          created_at: string;
          dose: string | null;
          entry_id: string;
          is_chronic_therapy: boolean | null;
          name: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dose?: string | null;
          entry_id: string;
          is_chronic_therapy?: boolean | null;
          name?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dose?: string | null;
          entry_id?: string;
          is_chronic_therapy?: boolean | null;
          name?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'medication_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      menstruation_events: {
        Row: {
          created_at: string;
          entry_id: string;
          flow: string;
          notes: string | null;
          pain_level: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          entry_id: string;
          flow: string;
          notes?: string | null;
          pain_level: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          entry_id?: string;
          flow?: string;
          notes?: string | null;
          pain_level?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menstruation_events_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      other_fluid_details: {
        Row: {
          created_at: string;
          daily_entry_id: string;
          entry_id: string | null;
          id: string;
          name: string | null;
          occurred_at: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          daily_entry_id: string;
          entry_id?: string | null;
          id?: string;
          name?: string | null;
          occurred_at: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          daily_entry_id?: string;
          entry_id?: string | null;
          id?: string;
          name?: string | null;
          occurred_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'other_fluid_details_daily_entry_id_fkey';
            columns: ['daily_entry_id'];
            isOneToOne: false;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'other_fluid_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_baseline_profiles: {
        Row: {
          birth_year: number | null;
          chronic_diseases: string | null;
          chronic_therapy: string | null;
          created_at: string;
          height_cm: number | null;
          menstrual_history: string | null;
          occupation: string | null;
          patient_id: string;
          recent_major_weight_change: string | null;
          sex: string | null;
          updated_at: string;
          weight_kg: number | null;
          weight_reminder_due_at: string | null;
        };
        Insert: {
          birth_year?: number | null;
          chronic_diseases?: string | null;
          chronic_therapy?: string | null;
          created_at?: string;
          height_cm?: number | null;
          menstrual_history?: string | null;
          occupation?: string | null;
          patient_id: string;
          recent_major_weight_change?: string | null;
          sex?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
          weight_reminder_due_at?: string | null;
        };
        Update: {
          birth_year?: number | null;
          chronic_diseases?: string | null;
          chronic_therapy?: string | null;
          created_at?: string;
          height_cm?: number | null;
          menstrual_history?: string | null;
          occupation?: string | null;
          patient_id?: string;
          recent_major_weight_change?: string | null;
          sex?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
          weight_reminder_due_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_baseline_profiles_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: true;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_entries: {
        Row: {
          client_entry_id: string | null;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['entry_kind'];
          occurred_at: string;
          patient_id: string;
          text: string | null;
          updated_at: string;
        };
        Insert: {
          client_entry_id?: string | null;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['entry_kind'];
          occurred_at: string;
          patient_id: string;
          text?: string | null;
          updated_at?: string;
        };
        Update: {
          client_entry_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['entry_kind'];
          occurred_at?: string;
          patient_id?: string;
          text?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_entries_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stool_details: {
        Row: {
          black_stool: boolean;
          blood: boolean;
          bristol_type: number;
          created_at: string;
          entry_id: string;
          fatty_stool: boolean;
          mucus: boolean;
          notes: string | null;
          pain: boolean;
          updated_at: string;
          urgency: boolean;
          urgency_level: string;
        };
        Insert: {
          black_stool: boolean;
          blood: boolean;
          bristol_type: number;
          created_at?: string;
          entry_id: string;
          fatty_stool: boolean;
          mucus: boolean;
          notes?: string | null;
          pain: boolean;
          updated_at?: string;
          urgency: boolean;
          urgency_level: string;
        };
        Update: {
          black_stool?: boolean;
          blood?: boolean;
          bristol_type?: number;
          created_at?: string;
          entry_id?: string;
          fatty_stool?: boolean;
          mucus?: boolean;
          notes?: string | null;
          pain?: boolean;
          updated_at?: string;
          urgency?: boolean;
          urgency_level?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stool_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      symptom_details: {
        Row: {
          created_at: string;
          custom_description: string | null;
          custom_type: string | null;
          ended_at: string | null;
          entry_id: string;
          intake_list: string | null;
          intensity: number;
          modifying_factors: string | null;
          pain_description: string | null;
          pain_description_custom: string | null;
          pain_location: string | null;
          pain_location_custom: string | null;
          pain_radiates: boolean | null;
          pain_radiation: string | null;
          quality_of_life_effect: string | null;
          started_at: string;
          symptom_type: string;
          updated_at: string;
          woke_from_sleep: boolean;
        };
        Insert: {
          created_at?: string;
          custom_description?: string | null;
          custom_type?: string | null;
          ended_at?: string | null;
          entry_id: string;
          intake_list?: string | null;
          intensity: number;
          modifying_factors?: string | null;
          pain_description?: string | null;
          pain_description_custom?: string | null;
          pain_location?: string | null;
          pain_location_custom?: string | null;
          pain_radiates?: boolean | null;
          pain_radiation?: string | null;
          quality_of_life_effect?: string | null;
          started_at: string;
          symptom_type: string;
          updated_at?: string;
          woke_from_sleep: boolean;
        };
        Update: {
          created_at?: string;
          custom_description?: string | null;
          custom_type?: string | null;
          ended_at?: string | null;
          entry_id?: string;
          intake_list?: string | null;
          intensity?: number;
          modifying_factors?: string | null;
          pain_description?: string | null;
          pain_description_custom?: string | null;
          pain_location?: string | null;
          pain_location_custom?: string | null;
          pain_radiates?: boolean | null;
          pain_radiation?: string | null;
          quality_of_life_effect?: string | null;
          started_at?: string;
          symptom_type?: string;
          updated_at?: string;
          woke_from_sleep?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'symptom_details_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'patient_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          app_language: string;
          consent_accepted_at: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          theme: string;
          updated_at: string;
          voice_language: string;
        };
        Insert: {
          app_language?: string;
          consent_accepted_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          role: Database['public']['Enums']['user_role'];
          theme?: string;
          updated_at?: string;
          voice_language?: string;
        };
        Update: {
          app_language?: string;
          consent_accepted_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          theme?: string;
          updated_at?: string;
          voice_language?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_patient_daily_form: {
        Args: { p_entry_id: string };
        Returns: string;
      };
      create_doctor_invite_code: {
        Args: never;
        Returns: {
          code: string;
          expires_at: string;
          id: string;
        }[];
      };
      export_patient_data: {
        Args: {
          export_mode: Database['public']['Enums']['export_mode'];
          export_range_type: Database['public']['Enums']['export_range_type'];
          selected_date?: string;
          selected_month?: string;
          target_patient_id: string;
        };
        Returns: Json;
      };
      redeem_doctor_invite_code: {
        Args: { invite_code: string };
        Returns: string;
      };
      revoke_doctor_invite_code: {
        Args: { invite_code_id: string };
        Returns: boolean;
      };
      save_patient_exercise: {
        Args: {
          p_activity: string;
          p_duration_minutes: number;
          p_entry_id: string;
          p_intensity: string;
          p_notes: string;
          p_occurred_at: string;
        };
        Returns: string;
      };
      save_patient_food_form: {
        Args: {
          p_day_end: string;
          p_day_start: string;
          p_has_other_fluids: boolean;
          p_meals: Json;
          p_occurred_at: string;
          p_other_fluids: string;
          p_water_liters: number;
        };
        Returns: string;
      };
      save_patient_medication: {
        Args: {
          p_dose: string;
          p_entry_id: string;
          p_is_chronic_therapy: boolean;
          p_name: string;
          p_notes: string;
          p_occurred_at: string;
        };
        Returns: string;
      };
      save_patient_menstruation: {
        Args: {
          p_entry_id: string;
          p_flow: string;
          p_notes: string;
          p_occurred_at: string;
          p_pain_level: number;
        };
        Returns: string;
      };
      save_patient_note: {
        Args: {
          p_client_entry_id: string;
          p_entry_id: string;
          p_occurred_at: string;
          p_text: string;
        };
        Returns: {
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['entry_kind'];
          occurred_at: string;
          patient_id: string;
          text: string;
          updated_at: string;
        }[];
      };
      save_patient_stool: {
        Args: {
          p_black_stool: boolean;
          p_blood: boolean;
          p_bristol_type: number;
          p_entry_id: string;
          p_fatty_stool: boolean;
          p_mucus: boolean;
          p_notes: string;
          p_occurred_at: string;
          p_pain: boolean;
          p_urgency_level: string;
        };
        Returns: string;
      };
      save_patient_symptoms: {
        Args: { p_day_end: string; p_day_start: string; p_symptoms: Json };
        Returns: number;
      };
    };
    Enums: {
      app_role: 'patient' | 'doctor';
      entry_kind:
        | 'text'
        | 'daily'
        | 'meal'
        | 'symptom'
        | 'stool'
        | 'medication'
        | 'exercise'
        | 'menstruation'
        | 'note'
        | 'custom'
        | 'fluid';
      export_mode: 'all_data' | 'all_data_with_images' | 'images_only_with_labels';
      export_range_type: 'selected_day' | 'partial_month' | 'all_time';
      user_role: 'patient' | 'doctor';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['patient', 'doctor'],
      entry_kind: [
        'text',
        'daily',
        'meal',
        'symptom',
        'stool',
        'medication',
        'exercise',
        'menstruation',
        'note',
        'custom',
        'fluid',
      ],
      export_mode: ['all_data', 'all_data_with_images', 'images_only_with_labels'],
      export_range_type: ['selected_day', 'partial_month', 'all_time'],
      user_role: ['patient', 'doctor'],
    },
  },
} as const;
