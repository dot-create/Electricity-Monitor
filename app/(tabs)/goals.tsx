import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Target, Plus, X, Save, Calendar } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useGoals } from '@/hooks/useGoals';
import { useReadings } from '@/hooks/useReadings';
import { GoalCard } from '@/components/GoalCard';
import { EnergyGoal } from '@/types';
import { UsageCalculator } from '@/utils/calculations';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const { readings } = useReadings();
  
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<EnergyGoal | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    type: 'reduction' as 'reduction' | 'limit' | 'efficiency',
    target: '',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    meterId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    // Update goal progress
    goals.forEach(goal => {
      const progress = calculateGoalProgress(goal);
      if (Math.abs(progress - goal.progress) > 0.1) {
        updateGoal(goal.id, { progress });
      }
    });
  }, [readings, goals]);

  const calculateGoalProgress = (goal: EnergyGoal): number => {
    const goalReadings = goal.meterId 
      ? readings.filter(r => r.meterId === goal.meterId)
      : readings;

    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    const now = new Date();
    
    const periodReadings = goalReadings.filter(r => {
      const readingDate = new Date(r.date);
      return readingDate >= startDate && readingDate <= Math.min(now.getTime(), endDate.getTime());
    });

    switch (goal.type) {
      case 'reduction': {
        // Calculate reduction compared to baseline
        const baselineReadings = goalReadings.filter(r => {
          const readingDate = new Date(r.date);
          const baselineStart = new Date(startDate);
          baselineStart.setFullYear(baselineStart.getFullYear() - 1);
          const baselineEnd = new Date(endDate);
          baselineEnd.setFullYear(baselineEnd.getFullYear() - 1);
          return readingDate >= baselineStart && readingDate <= baselineEnd;
        });

        const currentUsage = UsageCalculator.calculateConsumption(periodReadings)
          .reduce((sum, r) => sum + (r.consumption || 0), 0);
        const baselineUsage = UsageCalculator.calculateConsumption(baselineReadings)
          .reduce((sum, r) => sum + (r.consumption || 0), 0);

        if (baselineUsage === 0) return 0;
        const actualReduction = ((baselineUsage - currentUsage) / baselineUsage) * 100;
        return Math.max(0, (actualReduction / goal.target) * 100);
      }
      
      case 'limit': {
        const totalUsage = UsageCalculator.calculateConsumption(periodReadings)
          .reduce((sum, r) => sum + (r.consumption || 0), 0);
        return totalUsage <= goal.target ? 100 : (goal.target / totalUsage) * 100;
      }
      
      default:
        return 0;
    }
  };

  const handleSubmit = async () => {
    try {
      const target = parseFloat(formData.target);
      if (isNaN(target) || target <= 0) {
        Alert.alert('Error', 'Please enter a valid target value');
        return;
      }

      const goalData = {
        description: formData.description,
        type: formData.type,
        target,
        period: formData.period,
        meterId: formData.meterId || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: true,
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await addGoal(goalData);
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save goal');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      type: 'reduction',
      target: '',
      period: 'monthly',
      meterId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setEditingGoal(null);
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Energy Goals</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Energy Goals Set</Text>
            <Text style={styles.emptySubtitle}>
              Set goals to track your energy efficiency progress
            </Text>
          </View>
        ) : (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => {}}
              onEdit={() => {
                setEditingGoal(goal);
                setFormData({
                  description: goal.description,
                  type: goal.type,
                  target: goal.target.toString(),
                  period: goal.period,
                  meterId: goal.meterId || '',
                  startDate: goal.startDate,
                  endDate: goal.endDate,
                });
                setShowForm(true);
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { resetForm(); setShowForm(false); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingGoal ? 'Edit Goal' : 'New Energy Goal'}
            </Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Save size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal Description</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="e.g., Reduce monthly usage by 10%"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Goal Type</Text>
              <View style={styles.typeSelector}>
                {(['reduction', 'limit', 'efficiency'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.type === type && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.type === type && styles.typeButtonTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Target Value</Text>
              <TextInput
                style={styles.input}
                value={formData.target}
                onChangeText={(text) => setFormData(prev => ({ ...prev, target: text }))}
                placeholder={formData.type === 'reduction' ? '10 (percentage)' : '500 (kWh)'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Time Period</Text>
              <View style={styles.periodSelector}>
                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      formData.period === period && styles.periodButtonActive
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, period }))}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      formData.period === period && styles.periodButtonTextActive
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.dateContainer}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.startDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, startDate: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.endDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, endDate: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.background,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateGroup: {
    flex: 1,
  },
});