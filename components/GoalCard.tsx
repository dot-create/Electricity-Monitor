import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Target, TrendingDown, Calendar, CircleCheck as CheckCircle } from 'lucide-react-native';
import { EnergyGoal } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface GoalCardProps {
  goal: EnergyGoal;
  onPress: () => void;
  onEdit: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onPress, onEdit }) => {
  const { colors } = useTheme();
  
  const getProgressColor = () => {
    if (goal.progress >= 100) return colors.success;
    if (goal.progress >= 75) return colors.warning;
    return colors.primary;
  };

  const getTypeIcon = () => {
    switch (goal.type) {
      case 'reduction': return TrendingDown;
      case 'efficiency': return Target;
      default: return Target;
    }
  };

  const TypeIcon = getTypeIcon();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TypeIcon size={20} color={colors.primary} />
          <Text style={styles.description}>{goal.description}</Text>
        </View>
        {goal.progress >= 100 && (
          <CheckCircle size={20} color={colors.success} />
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(goal.progress, 100)}%`,
                backgroundColor: getProgressColor()
              }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: getProgressColor() }]}>
          {goal.progress.toFixed(1)}%
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.target}>
          Target: {goal.target} {goal.type === 'reduction' ? '% reduction' : 'kWh'} per {goal.period}
        </Text>
        <View style={styles.dateRow}>
          <Calendar size={12} color={colors.textSecondary} />
          <Text style={styles.dateText}>
            {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
          </Text>
        </View>
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
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  details: {
    gap: 4,
  },
  target: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
});