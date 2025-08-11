import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { ChartBar as BarChart3, TrendingUp, TrendingDown, Activity, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { ReadingChart } from '@/components/ReadingChart';
import { UsageCalculator } from '@/utils/calculations';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { readings } = useReadings();
  const [selectedMeterId, setSelectedMeterId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<7 | 30>(7);

  useEffect(() => {
    if (meters.length > 0 && selectedMeterId === 'all') {
      // Keep 'all' selected by default
    }
  }, [meters]);

  const selectedMeter = meters.find(m => m.id === selectedMeterId);
  const filteredReadings = selectedMeterId === 'all' 
    ? readings 
    : readings.filter(r => r.meterId === selectedMeterId);

  const stats = selectedMeterId === 'all'
    ? {
        currentWeekTotal: meters.reduce((sum, meter) => 
          sum + UsageCalculator.getWeeklyTotal(readings, meter.id), 0),
        currentMonthTotal: meters.reduce((sum, meter) => 
          sum + UsageCalculator.getMonthlyTotal(readings, meter.id), 0),
        dailyAverage: meters.reduce((sum, meter) => 
          sum + UsageCalculator.getDailyAverage(readings, meter.id), 0),
        monthlyChange: meters.length > 0 
          ? meters.reduce((sum, meter) => 
              sum + UsageCalculator.getMonthlyChange(readings, meter.id), 0) / meters.length
          : 0,
      }
    : UsageCalculator.getUsageStats(readings, selectedMeterId);

  const getTopConsumer = () => {
    if (meters.length === 0) return null;
    
    const meterStats = meters.map(meter => ({
      meter,
      usage: UsageCalculator.getMonthlyTotal(readings, meter.id),
    }));
    
    return meterStats.reduce((top, current) => 
      current.usage > top.usage ? current : top
    );
  };

  const topConsumer = getTopConsumer();
  const styles = createStyles(colors);

  if (meters.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <BarChart3 size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptySubtitle}>
            Add meters and readings to view analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.timeframeButton, timeframe === 7 && styles.timeframeButtonActive]}
            onPress={() => setTimeframe(7)}
          >
            <Text style={[
              styles.timeframeText,
              timeframe === 7 && styles.timeframeTextActive
            ]}>7D</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeframeButton, timeframe === 30 && styles.timeframeButtonActive]}
            onPress={() => setTimeframe(30)}
          >
            <Text style={[
              styles.timeframeText,
              timeframe === 30 && styles.timeframeTextActive
            ]}>30D</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.meterSelector}>
          <Text style={styles.selectorLabel}>Viewing:</Text>
          <TouchableOpacity style={styles.selectorButton}>
            <Text style={styles.selectorText}>
              {selectedMeterId === 'all' ? 'All Meters' : selectedMeter?.name}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>
              {stats.currentWeekTotal.toFixed(1)} kWh
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statValue}>
              {stats.currentMonthTotal.toFixed(1)} kWh
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Daily Average</Text>
            <Text style={styles.statValue}>
              {stats.dailyAverage.toFixed(1)} kWh
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.changeContainer}>
              {stats.monthlyChange > 0 ? (
                <TrendingUp size={16} color={colors.warning} />
              ) : (
                <TrendingDown size={16} color={colors.success} />
              )}
            </View>
            <Text style={styles.statLabel}>Monthly Change</Text>
            <Text style={[
              styles.statValue,
              { color: stats.monthlyChange > 0 ? colors.warning : colors.success }
            ]}>
              {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange.toFixed(1)}%
            </Text>
          </View>
        </View>

        {selectedMeterId !== 'all' && selectedMeter && (
          <ReadingChart
            readings={readings}
            meterId={selectedMeterId}
            days={timeframe}
          />
        )}

        {topConsumer && (
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Top Consumer This Month</Text>
            <View style={styles.insightContent}>
              <Activity size={20} color={colors.warning} />
              <View style={styles.insightText}>
                <Text style={styles.insightMeter}>{topConsumer.meter.name}</Text>
                <Text style={styles.insightUsage}>
                  {topConsumer.usage.toFixed(1)} kWh
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.meterBreakdown}>
          <Text style={styles.breakdownTitle}>Monthly Breakdown</Text>
          {meters.map(meter => {
            const monthlyUsage = UsageCalculator.getMonthlyTotal(readings, meter.id);
            const percentage = stats.currentMonthTotal > 0 
              ? (monthlyUsage / stats.currentMonthTotal) * 100 
              : 0;

            return (
              <View key={meter.id} style={styles.breakdownItem}>
                <View style={styles.breakdownInfo}>
                  <Text style={styles.breakdownMeter}>{meter.name}</Text>
                  <Text style={styles.breakdownUsage}>
                    {monthlyUsage.toFixed(1)} kWh
                  </Text>
                </View>
                <View style={styles.breakdownBar}>
                  <View
                    style={[
                      styles.breakdownProgress,
                      { width: `${percentage}%` }
                    ]}
                  />
                </View>
                <Text style={styles.breakdownPercentage}>
                  {percentage.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  headerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeframeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeframeTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  meterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 12,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightText: {
    marginLeft: 12,
  },
  insightMeter: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  insightUsage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  meterBreakdown: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownMeter: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  breakdownUsage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownBar: {
    flex: 2,
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  breakdownProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
});