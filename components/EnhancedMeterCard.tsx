import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Zap, MapPin, Calendar, TrendingUp, TrendingDown, Camera, CreditCard as Edit3, DollarSign, TriangleAlert as AlertTriangle, Activity, Target, Clock } from 'lucide-react-native';
import { Meter, Reading } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { UsageCalculator } from '@/utils/calculations';

interface EnhancedMeterCardProps {
  meter: Meter;
  readings: Reading[];
  onPress: () => void;
  onEdit: () => void;
  onCameraReading: () => void;
}

export const EnhancedMeterCard: React.FC<EnhancedMeterCardProps> = ({
  meter,
  readings,
  onPress,
  onEdit,
  onCameraReading,
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
  const todayCost = meter.tariff ? todayConsumption * meter.tariff.rate : 0;
  const monthlyCost = meter.tariff ? stats.currentMonthTotal * meter.tariff.rate : 0;

  const isOverDailyLimit = meter.limits.daily > 0 && todayConsumption > meter.limits.daily;
  const isOverMonthlyLimit = meter.limits.monthly > 0 && stats.currentMonthTotal > meter.limits.monthly;
  const isApproachingDailyLimit = meter.limits.daily > 0 && 
    todayConsumption > meter.limits.daily * 0.8 && 
    todayConsumption <= meter.limits.daily;

  const daysSinceLastReading = latestReading 
    ? Math.floor((Date.now() - new Date(latestReading.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return TrendingUp;
      case 'decreasing': return TrendingDown;
      default: return Activity;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'increasing': return colors.warning;
      case 'decreasing': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusColor = () => {
    if (isOverDailyLimit || isOverMonthlyLimit) return colors.error;
    if (isApproachingDailyLimit) return colors.warning;
    return colors.success;
  };

  const TrendIcon = getTrendIcon();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        (isOverDailyLimit || isOverMonthlyLimit) && styles.cardError,
        isApproachingDailyLimit && !isOverDailyLimit && styles.cardWarning,
        !meter.isActive && styles.cardInactive
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with meter info and actions */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Zap size={20} color={colors.primary} />
          <Text style={styles.name}>{meter.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {meter.category?.charAt(0).toUpperCase() + meter.category?.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={onCameraReading} style={styles.cameraButton}>
            <Camera size={16} color={colors.background} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Edit3 size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location and ID */}
      <View style={styles.locationRow}>
        <MapPin size={14} color={colors.textSecondary} />
        <Text style={styles.location}>{meter.location}</Text>
      </View>

      {meter.meterId && (
        <Text style={styles.meterId}>Meter ID: {meter.meterId}</Text>
      )}

      {/* Current Reading Section */}
      {latestReading ? (
        <View style={styles.currentReadingContainer}>
          <View style={styles.readingHeader}>
            <Text style={styles.currentReadingLabel}>Current Reading</Text>
            {daysSinceLastReading !== null && (
              <View style={styles.freshnessIndicator}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={styles.freshnessText}>
                  {daysSinceLastReading === 0 ? 'Today' : 
                   daysSinceLastReading === 1 ? 'Yesterday' : 
                   `${daysSinceLastReading} days ago`}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.currentReadingValue}>
            {latestReading.reading?.toLocaleString()} kWh
          </Text>
          <Text style={styles.readingDate}>
            {new Date(latestReading.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        </View>
      ) : (
        <View style={styles.noReadingContainer}>
          <Text style={styles.noReadingText}>No readings recorded</Text>
          <TouchableOpacity onPress={onCameraReading} style={styles.firstReadingButton}>
            <Camera size={16} color={colors.primary} />
            <Text style={styles.firstReadingText}>Take First Reading</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Usage Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={[
            styles.statValue,
            isOverDailyLimit && styles.statValueError
          ]}>
            {todayConsumption > 0 ? `${todayConsumption.toFixed(1)} kWh` : 'No reading'}
          </Text>
          {todayCost > 0 && (
            <Text style={styles.costText}>
              ${todayCost.toFixed(2)}
            </Text>
          )}
          {meter.limits.daily > 0 && (
            <Text style={styles.limitText}>
              Limit: {meter.limits.daily} kWh
            </Text>
          )}
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
            isOverMonthlyLimit && styles.statValueError
          ]}>
            {stats.currentMonthTotal.toFixed(1)} kWh
          </Text>
          {monthlyCost > 0 && (
            <Text style={styles.costText}>
              ${monthlyCost.toFixed(2)}
            </Text>
          )}
          {meter.limits.monthly > 0 && (
            <Text style={styles.limitText}>
              Limit: {meter.limits.monthly} kWh
            </Text>
          )}
          <Text style={styles.comparisonText}>
            Avg: {stats.dailyAverage.toFixed(1)} kWh/day
          </Text>
        </View>
      </View>

      {/* Trend and Insights */}
      {readingsCount > 1 && (
        <View style={styles.trendsContainer}>
          <View style={styles.trendItem}>
            <TrendIcon size={14} color={getTrendColor()} />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trend === 'increasing' ? 'Usage Rising' : 
               trend === 'decreasing' ? 'Usage Falling' : 
               'Usage Stable'}
            </Text>
          </View>
          
          {weeklyAverage > 0 && (
            <Text style={styles.averageText}>
              Weekly avg: {weeklyAverage.toFixed(1)} kWh/day
            </Text>
          )}
          
          {stats.monthlyChange !== 0 && (
            <Text style={[
              styles.changeText,
              { color: stats.monthlyChange > 0 ? colors.warning : colors.success }
            ]}>
              {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange.toFixed(1)}% vs last month
            </Text>
          )}
        </View>
      )}

      {/* Alerts and Warnings */}
      {(isOverDailyLimit || isOverMonthlyLimit || isApproachingDailyLimit) && (
        <View style={styles.alertContainer}>
          <AlertTriangle size={16} color={colors.warning} />
          <View style={styles.alertContent}>
            {isOverDailyLimit && (
              <Text style={styles.alertText}>
                Daily limit exceeded by {((todayConsumption - meter.limits.daily) / meter.limits.daily * 100).toFixed(0)}%
              </Text>
            )}
            {isOverMonthlyLimit && (
              <Text style={styles.alertText}>
                Monthly limit exceeded by {((stats.currentMonthTotal - meter.limits.monthly) / meter.limits.monthly * 100).toFixed(0)}%
              </Text>
            )}
            {isApproachingDailyLimit && !isOverDailyLimit && (
              <Text style={styles.warningText}>
                {(todayConsumption / meter.limits.daily * 100).toFixed(0)}% of daily limit used
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Footer with metadata */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Calendar size={12} color={colors.textSecondary} />
          <Text style={styles.createdDate}>
            Added {new Date(meter.createdDate).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.readingsCount}>
          {readingsCount} reading{readingsCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {!meter.isActive && (
        <View style={styles.inactiveOverlay}>
          <Text style={styles.inactiveText}>INACTIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  cardError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  cardWarning: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  cardInactive: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cameraButton: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 8,
  },
  editButton: {
    padding: 8,
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
    flex: 1,
  },
  meterId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  currentReadingContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentReadingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  freshnessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freshnessText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  currentReadingValue: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  readingDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noReadingContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noReadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  firstReadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  firstReadingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statValueError: {
    color: colors.error,
  },
  costText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trendsContainer: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  averageText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    gap: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    lineHeight: 16,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  readingsCount: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inactiveText: {
    fontSize: 10,
    color: colors.background,
    fontWeight: '700',
  },
  comparisonText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
});