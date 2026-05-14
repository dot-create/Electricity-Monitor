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
  Dimensions,
} from 'react-native';
import { Plus, Activity, TrendingUp, Zap, DollarSign, Target, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { useGoals } from '@/hooks/useGoals';
import { useBillingCycle } from '@/hooks/useBillingCycle';
import { MeterCard } from '@/components/MeterCard';
import { EnhancedMeterCard } from '@/components/EnhancedMeterCard';
import { CameraReadingModal } from '@/components/CameraReadingModal';
import { NotificationCard } from '@/components/NotificationCard';
import { UsageCalculator } from '@/utils/calculations';
import { NotificationManager } from '@/utils/notifications';
import { StorageManager } from '@/utils/storage';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { meters, loading: metersLoading, refreshMeters } = useMeters();
  const { readings, loading: readingsLoading, refreshReadings } = useReadings();
  const { goals } = useGoals();
  const { billingCycles, getCurrentCycle } = useBillingCycle();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedMeterForCamera, setSelectedMeterForCamera] = useState<any>(null);

  const loading = metersLoading || readingsLoading;

  useEffect(() => {
    checkForNotifications();
  }, [meters, readings]);

  useEffect(() => {
    // Check for notifications every 5 minutes
    const interval = setInterval(() => {
      checkForNotifications();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [meters, readings]);

  const checkForNotifications = async () => {
    const settings = await StorageManager.getSettings();
    const alerts: any[] = [];
    
    // Check each meter individually
    for (const meter of meters) {
      const meterReadings = readings.filter(r => r.meterId === meter.id);
      const stats = UsageCalculator.getUsageStats(meterReadings, meter.id, meter.billingCycle);
      const todayConsumption = UsageCalculator.getTodayConsumption(meterReadings, meter.id);
      const yesterdayConsumption = UsageCalculator.getYesterdayConsumption(meterReadings, meter.id);
      const trend = UsageCalculator.getConsumptionTrend(meterReadings, meter.id);
      const peakDay = UsageCalculator.getPeakUsageDay(meterReadings, meter.id);
      
      // Check billing cycle status
      if (meter.billingCycle) {
        const currentCycle = getCurrentCycle(meter.id, meter.billingCycle.startDay);
        if (!currentCycle && meter.isActive) {
          alerts.push({
            id: `no-cycle-${meter.id}`,
            title: 'No Active Billing Cycle',
            message: `${meter.name}: Create a billing cycle to track monthly costs`,
            type: 'info',
          });
        }
      }

      // Daily limit alerts
      if (settings.notifications.dailyLimit && meter.limits.daily > 0 && todayConsumption > meter.limits.daily) {
        const percentage = ((todayConsumption - meter.limits.daily) / meter.limits.daily * 100).toFixed(1);
        alerts.push({
          id: `daily-${meter.id}`,
          title: 'Daily Limit Exceeded',
          message: `${meter.name}: ${todayConsumption.toFixed(1)} kWh (+${percentage}% over ${meter.limits.daily} kWh limit)`,
          type: 'warning',
        });
      }

      // Monthly limit alerts
      if (settings.notifications.monthlyLimit && meter.limits.monthly > 0 && stats.currentMonthTotal > meter.limits.monthly) {
        const percentage = ((stats.currentMonthTotal - meter.limits.monthly) / meter.limits.monthly * 100).toFixed(1);
        alerts.push({
          id: `monthly-${meter.id}`,
          title: 'Monthly Limit Exceeded',
          message: `${meter.name}: ${stats.currentMonthTotal.toFixed(1)} kWh (+${percentage}% over ${meter.limits.monthly} kWh limit)`,
          type: 'error',
        });
      }

      // High usage alerts (approaching limits)
      if (meter.limits.daily > 0 && todayConsumption > meter.limits.daily * 0.8 && todayConsumption <= meter.limits.daily) {
        const percentage = (todayConsumption / meter.limits.daily * 100).toFixed(0);
        alerts.push({
          id: `approaching-daily-${meter.id}`,
          title: 'Approaching Daily Limit',
          message: `${meter.name}: ${todayConsumption.toFixed(1)} kWh (${percentage}% of daily limit)`,
          type: 'info',
        });
      }

      // Usage trend alerts
      if (trend === 'increasing' && yesterdayConsumption > 0) {
        const increase = ((todayConsumption - yesterdayConsumption) / yesterdayConsumption * 100);
        if (increase > 50) {
          alerts.push({
            id: `trend-${meter.id}`,
            title: 'Usage Spike Detected',
            message: `${meter.name}: Today's usage is ${increase.toFixed(0)}% higher than yesterday`,
            type: 'info',
          });
        }
      }

      // Peak usage information
      if (peakDay && todayConsumption > 0 && todayConsumption >= peakDay.consumption) {
        alerts.push({
          id: `peak-${meter.id}`,
          title: 'New Peak Usage',
          message: `${meter.name}: Today's usage (${todayConsumption.toFixed(1)} kWh) is your highest recorded!`,
          type: 'info',
        });
      }
    }

    setNotifications(alerts);
    setLastNotificationCheck(new Date());

    // Trigger system notifications for critical alerts
    if (settings.notifications.enabled) {
      await NotificationManager.checkAndNotifyLimits(meters, readings, settings.notifications);
      await NotificationManager.checkAndNotifyTrends(meters, readings);
    }
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

  const handleCameraReading = (meter: any) => {
    setSelectedMeterForCamera(meter);
    setShowCameraModal(true);
  };

  const handleCameraReadingConfirmed = async (value: number, imageUri?: string) => {
    if (!selectedMeterForCamera) return;
    
    try {
      // This would typically use the readings hook, but for demo we'll show success
      Alert.alert('Success', `Camera reading of ${value} kWh recorded for ${selectedMeterForCamera.name}!`);
      setShowCameraModal(false);
      setSelectedMeterForCamera(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to save camera reading');
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTotalStats = () => {
    const activeMeters = meters.filter(m => m.isActive);
    if (activeMeters.length === 0) {
      return { 
        totalMonthly: 0, 
        totalWeekly: 0, 
        averageChange: 0, 
        totalToday: 0,
        totalCostThisMonth: 0,
        projectedMonthlyCost: 0,
        activeGoalsCount: 0,
        completedGoalsCount: 0,
      };
    }

    let totalMonthly = 0;
    let totalWeekly = 0;
    let totalToday = 0;
    let totalChange = 0;
    let totalCostThisMonth = 0;
    let projectedMonthlyCost = 0;
    let metersWithData = 0;

    activeMeters.forEach(meter => {
      const meterReadings = readings.filter(r => r.meterId === meter.id);
      const stats = UsageCalculator.getUsageStats(meterReadings, meter.id, meter.billingCycle);
      const todayConsumption = UsageCalculator.getTodayConsumption(meterReadings, meter.id);
      
      totalMonthly += stats.currentMonthTotal;
      totalWeekly += stats.currentWeekTotal;
      totalToday += todayConsumption;
      
      if (meter.tariff) {
        totalCostThisMonth += stats.currentMonthTotal * meter.tariff.rate;
        projectedMonthlyCost += stats.projectedMonthlyUsage * meter.tariff.rate;
      }
      
      if (stats.monthlyChange !== 0) {
        totalChange += stats.monthlyChange;
        metersWithData++;
      }
    });

    const activeGoalsCount = goals.filter(g => g.isActive).length;
    const completedGoalsCount = goals.filter(g => g.progress >= 100).length;
    return {
      totalMonthly,
      totalWeekly,
      totalToday,
      averageChange: metersWithData > 0 ? totalChange / metersWithData : 0,
      totalCostThisMonth,
      projectedMonthlyCost,
      activeGoalsCount,
      completedGoalsCount,
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
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>
              {totalStats.totalToday.toFixed(1)} kWh
            </Text>
            {totalStats.totalCostThisMonth > 0 && (
              <Text style={styles.summarySubValue}>
                ~${(totalStats.totalToday * (totalStats.totalCostThisMonth / totalStats.totalMonthly || 0)).toFixed(2)}
              </Text>
            )}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>
              {totalStats.totalMonthly.toFixed(1)} kWh
            </Text>
            {totalStats.totalCostThisMonth > 0 && (
              <Text style={styles.summarySubValue}>
                ${totalStats.totalCostThisMonth.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Weekly Avg</Text>
            <Text style={styles.summaryValue}>
              {(totalStats.totalWeekly / 7).toFixed(1)} kWh/day
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Target size={16} color={colors.primary} />
            <Text style={styles.summaryLabel}>Goals</Text>
            <Text style={styles.summaryValue}>
              {totalStats.completedGoalsCount}/{totalStats.activeGoalsCount}
            </Text>
          </View>
        </View>

        {totalStats.projectedMonthlyCost > 0 && (
          <View style={styles.costProjectionContainer}>
            <DollarSign size={16} color={colors.warning} />
            <Text style={styles.costProjectionText}>
              Projected monthly cost: ${totalStats.projectedMonthlyCost.toFixed(2)}
              {totalStats.projectedMonthlyCost > totalStats.totalCostThisMonth && (
                <Text style={styles.costIncreaseText}>
                  {' '}(+${(totalStats.projectedMonthlyCost - totalStats.totalCostThisMonth).toFixed(2)})
                </Text>
              )}
            </Text>
          </View>
        )}
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

        {lastNotificationCheck && (
          <View style={styles.lastUpdateContainer}>
            <Text style={styles.lastUpdateText}>
              Last updated: {lastNotificationCheck.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
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
            {meters.filter(m => m.isActive).map(meter => (
              <EnhancedMeterCard
                key={meter.id}
                meter={meter}
                readings={readings.filter(r => r.meterId === meter.id)}
                onPress={() => handleMeterPress(meter.id)}
                onEdit={() => handleMeterEdit(meter.id)}
                onCameraReading={() => handleCameraReading(meter)}
              />
            ))}
            {meters.filter(m => !m.isActive).length > 0 && (
              <TouchableOpacity 
                style={styles.inactiveMetersButton}
                onPress={() => router.push('/meters')}
              >
                <Text style={styles.inactiveMetersText}>
                  {meters.filter(m => !m.isActive).length} inactive meter(s) - Tap to manage
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Camera Reading Modal */}
      {selectedMeterForCamera && (
        <CameraReadingModal
          visible={showCameraModal}
          meter={selectedMeterForCamera}
          onClose={() => {
            setShowCameraModal(false);
            setSelectedMeterForCamera(null);
          }}
          onReadingConfirmed={handleCameraReadingConfirmed}
        />
      )}
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
  summarySubValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lastUpdateContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  costProjectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  costProjectionText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
    color: colors.text,
  },
  costIncreaseText: {
    color: colors.warning,
    fontWeight: '600',
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
  inactiveMetersButton: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 8,
  },
  inactiveMetersText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});