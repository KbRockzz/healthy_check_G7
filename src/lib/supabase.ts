import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------
// Kiểu dữ liệu từ lược đồ Supabase
// ---------------------------------------------------------------------
export type GenderType = 'male' | 'female' | 'other' | 'unspecified';
export type MetricSource = 'manual' | 'device' | 'healthkit' | 'health_connect' | 'seed';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ContentCategory = 'nutrition' | 'sports' | 'running' | 'sleep' | 'mental_health' | 'womens_health' | 'lifestyle';
export type GrantStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type SymptomType = 'cramps' | 'headache' | 'acne' | 'fatigue' | 'bloating' | 'back_pain' | 'nausea' | 'none';
export type MoodType = 'happy' | 'neutral' | 'sad' | 'anxious' | 'irritated' | 'tired';
export type MetricKind =
  | 'heart_rate'
  | 'body_mass_index'
  | 'body_weight'
  | 'body_height'
  | 'body_fat'
  | 'water_intake'
  | 'resting_energy'
  | 'blood_oxygen'
  | 'blood_pressure_sys'
  | 'blood_pressure_dia';

// ---------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: GenderType;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  step_goal: number;
  calorie_goal: number;
  water_goal_ml: number;
  sleep_goal_minutes: number;
  bedtime: string;
  wake_time: string;
  cycle_enabled: boolean;
  cycle_length_days: number;
  period_length_days: number;
  share_steps: boolean;
  share_sleep: boolean;
  share_nutrition: boolean;
  share_cycle: boolean;
  share_heart_rate: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepRecord {
  id: number;
  user_id: string;
  recorded_on: string;
  steps: number;
  distance_km: number;
  calories_burned: number;
  active_minutes: number;
  double_support_pct: number | null;
  hourly_breakdown: string;
  source: MetricSource;
  created_at: string;
  updated_at: string;
}

export interface SleepRecord {
  id: number;
  user_id: string;
  sleep_date: string;
  bedtime_at: string | null;
  wake_at: string | null;
  total_minutes: number;
  deep_minutes: number;
  light_minutes: number;
  rem_minutes: number;
  awake_minutes: number;
  awakenings: number;
  quality_score: number | null;
  source: MetricSource;
  created_at: string;
  updated_at: string;
}

export interface NutritionLog {
  id: number;
  user_id: string;
  logged_on: string;
  meal: MealType;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
}

export interface CycleRecord {
  id: number;
  user_id: string;
  period_start: string;
  period_end: string | null;
  cycle_length: number | null;
  is_predicted: boolean;
  symptom: SymptomType | null;
  mood: MoodType | null;
  fertility_risk: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthMetric {
  id: number;
  user_id: string;
  metric_kind: MetricKind;
  value: number;
  unit: string;
  recorded_at: string;
  source: MetricSource;
  created_at: string;
}

export interface SharingGrant {
  id: string;
  owner_id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_id: string | null;
  invite_token: string;
  status: GrantStatus;
  scopes: string[];
  validity_days: number | null;
  expires_at: string | null;
  notify_on_update: boolean;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthContent {
  id: string;
  slug: string;
  category: ContentCategory;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  author: string;
  read_minutes: number;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  upvotes: number;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthScoreHistory {
  user_id: string;
  score_date: string;
  score: number;
  label: string;
  components: Record<string, unknown>;
  computed_at: string;
}

// ---------------------------------------------------------------------
// Dashboard Summary type
// ---------------------------------------------------------------------
export interface DashboardSummary {
  date: string;
  owner_id: string;
  is_viewing_shared: boolean;
  health_score: {
    score: number;
    label: string;
    date: string;
    components: {
      steps: number;
      sleep: number;
      nutrition: number;
      activity: number;
      weights: Record<string, number>;
    };
  };
  goals: {
    step_goal: number;
    calorie_goal: number;
    sleep_goal_minutes: number;
    water_goal_ml: number;
  };
  steps: {
    count: number;
    distance_km: number;
    calories_burned: number;
    active_minutes: number;
    updated_at: string;
  };
  sleep: {
    total_minutes: number;
    deep_minutes: number;
    quality_score: number;
    updated_at: string;
  };
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  cycle: {
    last_period_start: string;
    days_to_next: number;
    cycle_length: number;
  } | null;
  week_report: {
    steps: number;
    active_minutes: number;
    calories_burned: number;
    sleep_minutes: number;
  };
  water: number;
  schedule: {
    bedtime: string;
    wake_time: string;
  };
}

// ---------------------------------------------------------------------
// Cấu hình client Supabase
// ---------------------------------------------------------------------
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Thiếu cấu hình Supabase:\n' +
    '   - SUPABASE_URL\n' +
    '   - SUPABASE_ANON_KEY\n' +
    'Vui lòng thêm vào expo config hoặc env variables.'
  );
}

// Web-safe storage that falls back to memory when SecureStore is unavailable
const secureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStorage[key] ?? null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      delete memoryStorage[key];
    }
  },
};

const memoryStorage: Record<string, string> = {};

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { supabase };
export default supabase;
