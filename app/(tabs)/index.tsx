import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Plus, Activity, TrendingUp, Zap } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { MeterCard } from '@/components/MeterCard';
import { NotificationCard } from '@/components/NotificationCard';
import { UsageCalculator } from '@/utils/calculations';
import { NotificationManager } from '@/utils/notifications';
import { StorageManager } from '@/utils/storage';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { meters, loading: metersLoading, refreshMeters } = useMeters();
  const { readings, loading: readingsLoading, refreshReadings } = useReadings();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loading = metersLoading || readingsLoading;

  useEffect(() => {
    checkForLimitExceeded();
  }, [meters, readings]);

  const checkForLimitExceeded = async () => {
    const settings = await StorageManager.getSettings();
    const alerts: any[] = [];

    meters.forEach(meter => {
      const stats = UsageCalculator.getUsageStats(readings, meter.id);
      const todayReading = readings.find(
        r => r.meterId === meter.id && r.date === new Date().toISOString().split('T')[0]
      );

      if (meter.limits.daily > 0 && todayReading && todayReading.units > meter.limits.daily) {
        alerts.push({
          id: `daily-${meter.id}`,
          title: 'Daily Limit Exceeded',
          message: `${meter.name}: ${todayReading.units.toFixed(1)} kWh (limit: ${meter.limits.daily} kWh)`,
          type: 'warning',
        });
      }

      if (meter.limits.monthly > 0 && stats.currentMonthTotal > meter.limits.monthly) {
        alerts.push({
          id: `monthly-${meter.id}`,
          title: 'Monthly Limit Exceeded',
          message: `${meter.name}: ${stats.currentMonthTotal.toFixed(1)} kWh (limit: ${meter.limits.monthly} kWh)`,
          type: 'error',
        });
      }
    });

    setNotifications(alerts);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMeters(), refreshReadings()]);
    setRefreshing(false);
  };

  const handleMeterPress = (meterId: string) => {
    router.push(`/readings?meterId=${meterId}`);
  };

  const handleMeterEdit = (meterId: string) => {
    router.push(`/meters?edit=${meterId}`);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTotalStats = () => {
    const allStats = meters.map(meter => 
      UsageCalculator.getUsageStats(readings, meter.id)
    );

    return {
      totalMonthly: allStats.reduce((sum, stats) => sum + stats.currentMonthTotal, 0),
      totalWeekly: allStats.reduce((sum, stats) => sum + stats.currentWeekTotal, 0),
      averageChange: allStats.length > 0 
        ? allStats.reduce((sum, stats) => sum + stats.monthlyChange, 0) / allStats.length 
        : 0,
    };
  };

  const totalStats = getTotalStats();
  const styles = createStyles(colors);

  if (loading && meters.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Activity size={32} color={colors.primary} />
          <Text style={styles.loadingText}>Loading your meters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Electricity Monitor</Text>
          <Text style={styles.subtitle}>Track your energy usage</Text>
        </View>

        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onDismiss={() => dismissNotification(notification.id)}
          />
        ))}

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>
              {totalStats.totalMonthly.toFixed(1)} kWh
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>
              {totalStats.totalWeekly.toFixed(1)} kWh
            </Text>
          </View>
        </View>

        {totalStats.averageChange !== 0 && (
          <View style={styles.changeContainer}>
            <TrendingUp 
              size={16} 
              color={totalStats.averageChange > 0 ? colors.warning : colors.success} 
            />
            <Text style={[
              styles.changeText,
              { color: totalStats.averageChange > 0 ? colors.warning : colors.success }
            ]}>
              {totalStats.averageChange > 0 ? '+' : ''}{totalStats.averageChange.toFixed(1)}% average change
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Meters</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/meters')}
          >
            <Plus size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        {meters.length === 0 ? (
          <View style={styles.emptyState}>
            <Zap size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No meters added yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first electricity meter to start tracking usage
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/meters')}
            >
              <Text style={styles.emptyButtonText}>Add Your First Meter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.metersContainer}>
            {meters.map(meter => (
              <MeterCard
                key={meter.id}
                meter={meter}
                readings={readings.filter(r => r.meterId === meter.id)}
                onPress={() => handleMeterPress(meter.id)}
                onEdit={() => handleMeterEdit(meter.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  changeText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  metersContainer: {
    gap: 8,
  },
});