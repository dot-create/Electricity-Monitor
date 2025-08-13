import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Zap, MapPin, Calendar, TrendingUp, CreditCard as Edit3 } from 'lucide-react-native';
import { Meter, Reading, UsageStats } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { UsageCalculator } from '@/utils/calculations';

interface MeterCardProps {
  meter: Meter;
  readings: Reading[];
  onPress: () => void;
  onEdit: () => void;
}

export const MeterCard: React.FC<MeterCardProps> = ({
  meter,
  readings,
  onPress,
  onEdit,
}) => {
  const { colors } = useTheme();
  const meterReadings = readings.filter(r => r.meterId === meter.id);
  const stats = UsageCalculator.getUsageStats(meterReadings, meter.id);
  
  const latestReading = UsageCalculator.getLatestReading(meterReadings, meter.id);
  const todayConsumption = UsageCalculator.getTodayConsumption(meterReadings, meter.id);
  const yesterdayConsumption = UsageCalculator.getYesterdayConsumption(meterReadings, meter.id);
  const weeklyAverage = UsageCalculator.getWeeklyAverage(meterReadings, meter.id);
  const trend = UsageCalculator.getConsumptionTrend(meterReadings, meter.id);
  const readingsCount = UsageCalculator.getMeterReadingsCount(meterReadings, meter.id);

  const isOverDailyLimit = meter.limits.daily > 0 && 
    todayConsumption > meter.limits.daily;
  
  const isOverMonthlyLimit = meter.limits.monthly > 0 && 
    stats.currentMonthTotal > meter.limits.monthly;

  const isApproachingDailyLimit = meter.limits.daily > 0 && 
    todayConsumption > meter.limits.daily * 0.8 && 
    todayConsumption <= meter.limits.daily;

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing': return colors.warning;
      case 'decreasing': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        (isOverDailyLimit || isOverMonthlyLimit) && styles.cardWarning,
        isApproachingDailyLimit && !isOverDailyLimit && styles.cardApproaching
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap size={20} color={colors.primary} />
          <Text style={styles.name}>{meter.name}</Text>
          <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Edit3 size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={14} color={colors.textSecondary} />
        <Text style={styles.location}>{meter.location}</Text>
      </View>

      {meter.meterId && (
        <Text style={styles.meterId}>ID: {meter.meterId}</Text>
      )}

      <View style={styles.readingsCountContainer}>
        <Text style={styles.readingsCountText}>
          {readingsCount} reading{readingsCount !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      {latestReading && (
        <View style={styles.currentReadingContainer}>
          <Text style={styles.currentReadingLabel}>Current Reading:</Text>
          <Text style={styles.currentReadingValue}>
            {latestReading.reading?.toLocaleString()} kWh
          </Text>
          <Text style={styles.readingDate}>
            {new Date(latestReading.date).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={[
            styles.statValue,
            isOverDailyLimit && styles.statValueWarning
          ]}>
            {todayConsumption > 0 ? `${todayConsumption.toFixed(1)} kWh` : 'No reading'}
          </Text>
          {yesterdayConsumption > 0 && todayConsumption > 0 && (
            <Text style={styles.comparisonText}>
              {todayConsumption > yesterdayConsumption ? '↑' : '↓'} 
              {Math.abs(((todayConsumption - yesterdayConsumption) / yesterdayConsumption) * 100).toFixed(0)}% vs yesterday
            </Text>
          )}
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={[
            styles.statValue,
            isOverMonthlyLimit && styles.statValueWarning
          ]}>
            {stats.currentMonthTotal.toFixed(1)} kWh
          </Text>
          <Text style={styles.comparisonText}>
            Avg: {stats.dailyAverage.toFixed(1)} kWh/day
          </Text>
        </View>
      </View>

      {weeklyAverage > 0 && (
        <View style={styles.weeklyAverageContainer}>
          <Text style={styles.weeklyAverageText}>
            Weekly average: {weeklyAverage.toFixed(1)} kWh/day
          </Text>
        </View>
      )}

      {stats.monthlyChange !== 0 && (
        <View style={styles.changeRow}>
          <TrendingUp 
            size={14} 
            color={stats.monthlyChange > 0 ? colors.warning : colors.success} 
          />
          <Text style={[
            styles.changeText,
            { color: stats.monthlyChange > 0 ? colors.warning : colors.success }
          ]}>
            {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange.toFixed(1)}% vs last month
          </Text>
        </View>
      )}

      {(isOverDailyLimit || isOverMonthlyLimit || isApproachingDailyLimit) && (
        <View style={styles.alertContainer}>
          {isOverDailyLimit && (
            <Text style={styles.alertText}>
              ⚠️ Daily limit exceeded by {((todayConsumption - meter.limits.daily) / meter.limits.daily * 100).toFixed(0)}%
            </Text>
          )}
          {isOverMonthlyLimit && (
            <Text style={styles.alertText}>
              🚨 Monthly limit exceeded by {((stats.currentMonthTotal - meter.limits.monthly) / meter.limits.monthly * 100).toFixed(0)}%
            </Text>
          )}
          {isApproachingDailyLimit && !isOverDailyLimit && (
            <Text style={styles.warningText}>
              ⚡ {(todayConsumption / meter.limits.daily * 100).toFixed(0)}% of daily limit used
            </Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Calendar size={12} color={colors.textSecondary} />
        <Text style={styles.createdDate}>
          Added {new Date(meter.createdDate).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardWarning: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  cardApproaching: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  trendIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  editButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  meterId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  readingsCountContainer: {
    marginBottom: 8,
  },
  readingsCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  currentReadingContainer: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  currentReadingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  currentReadingValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  readingDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statValueWarning: {
    color: colors.warning,
  },
  comparisonText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weeklyAverageContainer: {
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  weeklyAverageText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  alertContainer: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  alertText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  createdDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});