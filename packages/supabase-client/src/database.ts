import type { Database as GeneratedDatabase } from './database.types';

type GeneratedFunctions = GeneratedDatabase['public']['Functions'];
type FunctionName = keyof GeneratedFunctions;
type FunctionArgs<Name extends FunctionName> = GeneratedFunctions[Name] extends {
  Args: infer Args;
}
  ? Args
  : never;

type WithNullableArgs<
  Name extends FunctionName,
  NullableKeys extends keyof FunctionArgs<Name>,
> = Omit<GeneratedFunctions[Name], 'Args'> & {
  Args: Omit<FunctionArgs<Name>, NullableKeys> & {
    [Key in NullableKeys]: FunctionArgs<Name>[Key] | null;
  };
};

type AppFunctions = Omit<
  GeneratedFunctions,
  | 'save_patient_exercise'
  | 'save_patient_food_form'
  | 'save_patient_medication'
  | 'save_patient_menstruation'
  | 'save_patient_note'
  | 'save_patient_stool'
> & {
  save_patient_exercise: WithNullableArgs<'save_patient_exercise', 'p_entry_id' | 'p_notes'>;
  save_patient_food_form: WithNullableArgs<
    'save_patient_food_form',
    'p_water_liters' | 'p_has_other_fluids' | 'p_other_fluids'
  >;
  save_patient_medication: WithNullableArgs<
    'save_patient_medication',
    'p_entry_id' | 'p_name' | 'p_dose' | 'p_notes' | 'p_is_chronic_therapy'
  >;
  save_patient_menstruation: WithNullableArgs<
    'save_patient_menstruation',
    'p_entry_id' | 'p_notes'
  >;
  save_patient_note: WithNullableArgs<'save_patient_note', 'p_entry_id' | 'p_client_entry_id'>;
  save_patient_stool: WithNullableArgs<'save_patient_stool', 'p_entry_id' | 'p_notes'>;
};

/**
 * Linked-project types plus the nullable RPC arguments accepted by Postgres.
 * Supabase's generator does not currently encode function-argument nullability.
 */
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions'> & {
    Functions: AppFunctions;
  };
};
