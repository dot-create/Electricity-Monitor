import { Tabs } from 'expo-router';
import { Chrome as Home, Zap, ChartBar as BarChart3, BookOpen, Settings } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // tabBarStyle: {
        //   backgroundColor: colors.card,
        //   borderTopColor: colors.border,
        //   borderTopWidth: 1,
        //   paddingTop: 8,
        //   paddingBottom: 8,
        //   height: 60,
        // },
        // tabBarLabelStyle: {
        //   fontSize: 12,
        //   fontWeight: '500',
        //   marginTop: 4,
        // },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meters"
        options={{
          title: 'Meters',
          tabBarIcon: ({ size, color }) => (
            <Zap size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="readings"
        options={{
          title: 'Readings',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}