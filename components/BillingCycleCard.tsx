import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, DollarSign, TrendingUp, Clock, Zap, Edit3, Trash2 } from 'lucide-react-native';
import { BillingCycle, Meter } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface BillingCycleCardProps {
  cycle: BillingCycle;
  meter: Meter;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  daysRemaining?: number;
  estimatedBill?: { estimated: number; confidence: number };
}

export const BillingCycleCard: React.FC<BillingCycleCardProps> = ({
  cycle,
  meter,
  onPress,
  daysRemaining,
  estimatedBill,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  
  const getStatusColor = () => {
    switch (cycle.status) {
      case 'active': return colors.primary;
      case 'completed': return colors.success;
      case 'estimated': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: meter.tariff?.currency || 'USD',
    }).format(amount);
  };

  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar size={20} color={colors.primary} />
          <Text style={styles.meterName}>{meter.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{cycle.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <Edit3 size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.dateRange}>
        <Text style={styles.dateText}>
          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
        </Text>
        {daysRemaining !== undefined && cycle.status === 'active' && (
          <View style={styles.daysRemaining}>
            <Clock size={14} color={colors.warning} />
            <Text style={styles.daysRemainingText}>
              {daysRemaining} days left
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Zap size={16} color={colors.primary} />
          <Text style={styles.statLabel}>Consumption</Text>
          <Text style={styles.statValue}>
            {cycle.totalConsumption.toFixed(1)} kWh
          </Text>
        </View>

        <View style={styles.statItem}>
          <DollarSign size={16} color={colors.success} />
          <Text style={styles.statLabel}>
            {cycle.status === 'active' ? 'Current Cost' : 'Total Cost'}
          </Text>
          <Text style={styles.statValue}>
            {formatCurrency(cycle.totalCost)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <TrendingUp size={16} color={colors.secondary} />
          <Text style={styles.statLabel}>Daily Average</Text>
          <Text style={styles.statValue}>
            {cycle.averageDailyUsage.toFixed(1)} kWh
          </Text>
        </View>
      </View>

      {estimatedBill && cycle.status === 'active' && (
        <View style={styles.estimationContainer}>
          <Text style={styles.estimationLabel}>Estimated Monthly Bill</Text>
          <Text style={styles.estimationValue}>
            {formatCurrency(estimatedBill.estimated)}
          </Text>
          <Text style={styles.confidenceText}>
            {estimatedBill.confidence.toFixed(0)}% confidence
          </Text>
        </View>
      )}

      {cycle.peakUsage > 0 && (
        <View style={styles.peakUsageContainer}>
          <Text style={styles.peakUsageLabel}>Peak Daily Usage</Text>
          <Text style={styles.peakUsageValue}>
            {cycle.peakUsage.toFixed(1)} kWh
          </Text>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: colors.background,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  daysRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysRemainingText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  estimationContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  estimationLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  estimationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  confidenceText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  peakUsageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  peakUsageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  peakUsageValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
});