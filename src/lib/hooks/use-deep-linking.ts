/**
 * Hook xử lý deep linking từ Supabase auth callbacks
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

const PREVIOUS_URL = 'expo-auth-session/previous-url';

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    // Handle URL scheme
    const handleInitialUrl = async (url: string | null) => {
      if (!url) return;

      console.log('Handling deep link:', url);

      // Parse Supabase auth callback URL
      // Format: healthy-check-g7://auth/callback?token=xxx&type=signup
      const { hostname, queryParams } = Linking.parse(url);

      if (hostname === 'auth.callback' && queryParams?.token) {
        const token = queryParams.token as string;
        const type = queryParams.type as string;

        try {
          if (type === 'signup') {
            // Handle signup callback
            const { data, error } = await supabase.auth.exchangeCodeForSession(token);
            if (error) {
              console.error('Signup callback error:', error);
              return;
            }
            router.replace('/dashboard');
          } else if (type === 'recovery') {
            // Handle password recovery
            router.push('/auth/sign-in');
          }
        } catch (err) {
          console.error('Error handling auth callback:', err);
        }
      }
    };

    // Get initial URL
    Linking.getInitialURL().then(handleInitialUrl);

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', (event) => {
      handleInitialUrl(event.url);
    });

    return () => subscription?.remove();
  }, [router]);
}
