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
  const stats = UsageCalculator.getUsageStats(readings, meter.id);
  
  const todayReading = readings.find(
    r => r.meterId === meter.id && r.date === new Date().toISOString().split('T')[0]
  );

  const isOverDailyLimit = meter.limits.daily > 0 && 
    (todayReading?.units || 0) > meter.limits.daily;
  
  const isOverMonthlyLimit = meter.limits.monthly > 0 && 
    stats.currentMonthTotal > meter.limits.monthly;

  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        (isOverDailyLimit || isOverMonthlyLimit) && styles.cardWarning
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap size={20} color={colors.primary} />
          <Text style={styles.name}>{meter.name}</Text>
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

      {meter.startingReading !== undefined && (
        <Text style={styles.meterId}>Starting Reading: {meter.startingReading} kWh</Text>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={[
            styles.statValue,
            isOverDailyLimit && styles.statValueWarning
          ]}>
            {todayReading ? `${todayReading.units.toFixed(1)} kWh` : 'No reading'}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={[
            styles.statValue,
            isOverMonthlyLimit && styles.statValueWarning
          ]}>
            {stats.currentMonthTotal.toFixed(1)} kWh
          </Text>
        </View>
      </View>

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
    marginBottom: 12,
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