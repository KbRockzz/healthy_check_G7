/**
 * Auth Context — quản lý trạng thái đăng nhập toàn app với Supabase
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: any;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; session?: any }>;
  signOut: () => Promise<void>;
  isProfileComplete: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const DEMO_SESSION = {
    user: { id: 'demo-owner-id', email: 'demo.owner@healthy-check.app' },
    access_token: 'demo-token',
  };
  const DEMO_PROFILE: any = {
    id: 'demo-owner-id',
    full_name: 'Nguyễn Minh Anh',
    gender: 'female',
    date_of_birth: '1998-05-15',
    avatar_url: null,
    step_goal: 10000,
    calorie_goal: 1800,
    sleep_goal_minutes: 480,
    water_goal_ml: 2000,
    cycle_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const [session, setSession] = useState<any>(DEMO_SESSION);
  const [profile, setProfile] = useState<Profile | null>(DEMO_PROFILE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user) {
          setSession(supaSession);
          await fetchProfile(supaSession.user.id);
        } else {
          setSession(DEMO_SESSION);
          setProfile(DEMO_PROFILE);
          setLoading(false);
        }
      } catch (err) {
        setSession(DEMO_SESSION);
        setProfile(DEMO_PROFILE);
        setLoading(false);
      }
    }

    initAuth();

    // Lắng nghe thay đổi trạng thái auth từ Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        await fetchProfile(newSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Nếu không tìm thấy profile, tự tạo profile mặc định
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('404')) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: 'User',
              gender: 'unspecified',
            });
          if (!createError) {
            const { data: newData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            if (newData) setProfile(newData);
          }
        }
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.warn('Lỗi fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        setSession(data.session);
        if (data.user) {
          await fetchProfile(data.user.id);
        }
        setLoading(false);
      }
      return { error };
    } catch (err: any) {
      console.error('Lỗi signIn:', err);
      return { error: err };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (!error && data.session) {
        setSession(data.session);
        if (data.user) {
          await fetchProfile(data.user.id);
        }
        setLoading(false);
      }
      return { error, session: data?.session };
    } catch (err: any) {
      console.error('Lỗi signUp:', err);
      return { error: err };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Lỗi signOut:', e);
    }
    // Xóa hết AsyncStorage cache để không dính dữ liệu user cũ
    try {
      AsyncStorage.getAllKeys().then((keys) => {
        AsyncStorage.multiRemove(keys).catch(() => {});
      }).catch(() => {});
    } catch { /* ignore */ }
    setSession(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (!session?.user) return;
    await fetchProfile(session.user.id);
  }

  function isProfileComplete(): boolean {
    if (!profile) return false;
    return !!(profile.full_name && profile.gender !== 'unspecified' && profile.height_cm && profile.weight_kg);
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      isProfileComplete,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
