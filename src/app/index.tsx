import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '@/theme';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/dashboard" />;
  }

  return <Redirect href="/launch" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
});
