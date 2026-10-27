/**
 * Auth Context — quản lý trạng thái đăng nhập toàn app
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '@/lib/supabase';

interface AuthContextType {
  session: any;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Lắng nghe thay đổi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
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
        console.error('Lỗi lấy profile:', error);
        // Nếu không tìm thấy profile, tự tạo mới
        if (error.code === 'PGRST116' || error.message?.includes('Results contain 0 rows') || error.message?.includes('404')) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: 'User',
              gender: 'unspecified',
            });
          if (createError) {
            console.error('Lỗi tạo profile:', createError);
          }
        }
        return;
      }

      // Nếu data null (không tìm thấy), tự tạo
      if (!data) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: 'User',
            gender: 'unspecified',
          });
        if (createError) {
          console.error('Lỗi tạo profile:', createError);
        }
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        await fetchProfile(data.user.id);
      }
      return { error };
    } catch (err: any) {
      console.error('Lỗi signin:', err);
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
      return { error };
    } catch (err: any) {
      console.error('Lỗi signup:', err);
      return { error: err };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
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