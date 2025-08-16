import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Modal as RNModal
} from 'react-native';
import { ChartBar as BarChart3, TrendingUp, TrendingDown, Activity, ChevronDown, X as CloseIcon } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { ReadingChart } from '@/components/ReadingChart';
import { ForecastCard } from '@/components/ForecastCard';
import { UsageCalculator } from '@/utils/calculations';
import { ForecastingEngine } from '@/utils/forecasting';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { readings } = useReadings();
  const [selectedMeterId, setSelectedMeterId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<7 | 30>(7);
  const [showMeterPicker, setShowMeterPicker] = useState(false);

  useEffect(() => {
    if (meters.length > 0 && selectedMeterId === 'all') {
      // Keep 'all' selected by default
    }
  }, [meters]);

  const selectedMeter = meters.find(m => m.id === selectedMeterId);
  
  const getStatsForMeter = (meterId: string) => {
    const meterReadings = readings.filter(r => r.meterId === meterId);
    return UsageCalculator.getUsageStats(meterReadings, meterId);
  };

  const stats = selectedMeterId === 'all'
    ? {
        currentWeekTotal: meters.reduce((sum, meter) => {
          const meterReadings = readings.filter(r => r.meterId === meter.id);
          return sum + UsageCalculator.getWeeklyTotal(meterReadings, meter.id);
        }, 0),
        currentMonthTotal: meters.reduce((sum, meter) => {
          const meterReadings = readings.filter(r => r.meterId === meter.id);
          return sum + UsageCalculator.getMonthlyTotal(meterReadings, meter.id);
        }, 0),
        dailyAverage: meters.reduce((sum, meter) => {
          const meterReadings = readings.filter(r => r.meterId === meter.id);
          return sum + UsageCalculator.getDailyAverage(meterReadings, meter.id);
        }, 0),
        monthlyChange: meters.length > 0 
          ? meters.reduce((sum, meter) => {
              const meterReadings = readings.filter(r => r.meterId === meter.id);
              return sum + UsageCalculator.getMonthlyChange(meterReadings, meter.id);
            }, 0) / meters.length
          : 0,
      }
    : getStatsForMeter(selectedMeterId);

  const getTopConsumer = () => {
    if (meters.length === 0) return null;
    
    const meterStats = meters.map(meter => ({
      meter,
      usage: UsageCalculator.getMonthlyTotal(readings.filter(r => r.meterId === meter.id), meter.id),
    }));
    
    return meterStats.reduce((top, current) => 
      current.usage > top.usage ? current : top
    );
  };

  const getMeterInsights = () => {
    if (selectedMeterId === 'all') return null;
    
    const meterReadings = readings.filter(r => r.meterId === selectedMeterId);
    const trend = UsageCalculator.getConsumptionTrend(meterReadings, selectedMeterId);
    const peakDay = UsageCalculator.getPeakUsageDay(meterReadings, selectedMeterId);
    const todayConsumption = UsageCalculator.getTodayConsumption(meterReadings, selectedMeterId);
    const weeklyAverage = UsageCalculator.getWeeklyAverage(meterReadings, selectedMeterId);
    
    return {
      trend,
      peakDay,
      todayConsumption,
      weeklyAverage,
      readingsCount: UsageCalculator.getMeterReadingsCount(meterReadings, selectedMeterId),
    };
  };

  const getAverageReading = () => {
    if (meters.length === 0) return null;
    
    const meterReadings = meters.map(meter => {
      const meterSpecificReadings = readings.filter(r => r.meterId === meter.id);
      const latestReading = UsageCalculator.getLatestReading(meterSpecificReadings, meter.id);
      return {
        meter,
        reading: latestReading?.reading || 0,
      };
    });
    
    const totalReading = meterReadings.reduce((sum, mr) => sum + mr.reading, 0);
    return {
      average: totalReading / meters.length,
      total: totalReading,
    };
  };

  const topConsumer = getTopConsumer();
  const averageReading = getAverageReading();
  const meterInsights = getMeterInsights();
  const forecast = selectedMeterId !== 'all' && selectedMeter 
    ? ForecastingEngine.generateForecast(readings, selectedMeterId)
    : null;
  const recommendations = selectedMeterId !== 'all' 
    ? ForecastingEngine.getUsageRecommendations(readings, selectedMeterId)
    : [];
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
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={() => setShowMeterPicker(true)}
          >
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

        {meterInsights && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Meter Insights</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Trend</Text>
                <Text style={[
                  styles.insightValue,
                  { color: meterInsights.trend === 'increasing' ? colors.warning : 
                           meterInsights.trend === 'decreasing' ? colors.success : colors.textSecondary }
                ]}>
                  {meterInsights.trend === 'increasing' ? '📈 Rising' : 
                   meterInsights.trend === 'decreasing' ? '📉 Falling' : '➡️ Stable'}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Readings</Text>
                <Text style={styles.insightValue}>{meterInsights.readingsCount}</Text>
              </View>
              {meterInsights.peakDay && (
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>Peak Day</Text>
                  <Text style={styles.insightValue}>
                    {meterInsights.peakDay.consumption.toFixed(1)} kWh
                  </Text>
                  <Text style={styles.insightDate}>
                    {new Date(meterInsights.peakDay.date).toLocaleDateString()}
                  </Text>
                </View>
              )}
              {meterInsights.weeklyAverage > 0 && (
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>Weekly Avg</Text>
                  <Text style={styles.insightValue}>
                    {meterInsights.weeklyAverage.toFixed(1)} kWh/day
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {averageReading && selectedMeterId === 'all' && (
          <View style={styles.readingOverview}>
            <Text style={styles.overviewTitle}>Current Readings Overview</Text>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewLabel}>Total Reading</Text>
                <Text style={styles.overviewValue}>
                  {averageReading.total?.toLocaleString()} kWh
                </Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewLabel}>Average Reading</Text>
                <Text style={styles.overviewValue}>
                  {averageReading.average?.toLocaleString()} kWh
                </Text>
              </View>
            </View>
          </View>
        )}

        {forecast && selectedMeter && (
          <ForecastCard forecast={forecast} meterName={selectedMeter.name} />
        )}

        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>💡 Smart Recommendations</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}

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
            const meterReadings = readings.filter(r => r.meterId === meter.id);
            const monthlyUsage = UsageCalculator.getMonthlyTotal(meterReadings, meter.id);
            const latestReading = UsageCalculator.getLatestReading(meterReadings, meter.id);
            const todayConsumption = UsageCalculator.getTodayConsumption(meterReadings, meter.id);
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
                  {latestReading && (
                    <Text style={styles.breakdownReading}>
                      Current: {latestReading.reading?.toLocaleString()} kWh
                    </Text>
                  )}
                  {todayConsumption > 0 && (
                    <Text style={styles.breakdownToday}>
                      Today: {todayConsumption.toFixed(1)} kWh
                    </Text>
                  )}
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

      {/* Meter Picker Modal */}
      <Modal
        visible={showMeterPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMeterPicker(false)}>
              <CloseIcon size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select View</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.pickerContent}>
            <TouchableOpacity
              style={[
                styles.meterOption,
                selectedMeterId === 'all' && styles.meterOptionSelected
              ]}
              onPress={() => {
                setSelectedMeterId('all');
                setShowMeterPicker(false);
              }}
            >
              <Text style={styles.meterOptionName}>All Meters</Text>
              <Text style={styles.meterOptionLocation}>Combined view</Text>
            </TouchableOpacity>
            {meters.map(meter => (
              <TouchableOpacity
                key={meter.id}
                style={[
                  styles.meterOption,
                  selectedMeterId === meter.id && styles.meterOptionSelected
                ]}
                onPress={() => {
                  setSelectedMeterId(meter.id);
                  setShowMeterPicker(false);
                }}
              >
                <Text style={styles.meterOptionName}>{meter.name}</Text>
                <Text style={styles.meterOptionLocation}>{meter.location}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  insightsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  insightLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  insightDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
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
  readingOverview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  overviewStats: {
    flexDirection: 'row',
    gap: 16,
  },
  overviewStat: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
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
  breakdownReading: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  breakdownToday: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '500',
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
  recommendationsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  recommendationItem: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  recommendationText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  pickerContent: {
    flex: 1,
    padding: 16,
  },
  meterOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meterOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  meterOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  meterOptionLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});