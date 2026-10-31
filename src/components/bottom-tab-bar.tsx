import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/theme';

const TABS = [
  { name: 'Overview', icon: 'bar-chart-outline', activeIcon: 'bar-chart', route: '/dashboard' },
  { name: 'Health Data', icon: 'list-outline', activeIcon: 'list', route: '/health-data' },
  { name: 'Explore', icon: 'compass-outline', activeIcon: 'compass', route: '/explore' },
  { name: 'Sharing', icon: 'share-social-outline', activeIcon: 'share-social', route: '/share' },
] as const;

interface BottomTabBarProps {
  currentRoute: string;
  onTabPress: (route: string) => void;
}

/**
 * Thanh điều hướng dưới đáy (Bottom Navigation Bar)
 * - 4 tab chuẩn: Overview | Health Data | Explore | Sharing
 */
export default function BottomTabBar({ currentRoute, onTabPress }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = currentRoute === tab.route;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 6,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
