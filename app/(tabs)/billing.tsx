import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar, Plus, X, Save, DollarSign, TrendingUp, Clock, FileText } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { useBillingCycle } from '@/hooks/useBillingCycle';
import { BillingCycleCard } from '@/components/BillingCycleCard';
import { BillingCycle } from '@/types';

export default function BillingScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { readings } = useReadings();
  const {
    billingCycles,
    createBillingCycle,
    getCurrentCycle,
    getDaysUntilBilling,
    estimateMonthlyBill,
    generateBillingReport,
  } = useBillingCycle();

  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [billingStartDay, setBillingStartDay] = useState('1');
  const [startReading, setStartReading] = useState('');

  const activeCycles = billingCycles.filter(c => c.status === 'active');
  const completedCycles = billingCycles.filter(c => c.status === 'completed');

  const handleCreateCycle = async () => {
    try {
      if (!selectedMeterId || !billingStartDay || !startReading) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const startDay = parseInt(billingStartDay);
      const reading = parseFloat(startReading);

      if (startDay < 1 || startDay > 31) {
        Alert.alert('Error', 'Billing start day must be between 1 and 31');
        return;
      }

      if (isNaN(reading) || reading < 0) {
        Alert.alert('Error', 'Please enter a valid starting reading');
        return;
      }

      await createBillingCycle(selectedMeterId, startDay, reading);
      setShowNewCycleModal(false);
      resetForm();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create billing cycle');
    }
  };

  const resetForm = () => {
    setSelectedMeterId('');
    setBillingStartDay('1');
    setStartReading('');
  };

  const handleCyclePress = (cycle: BillingCycle) => {
    const meter = meters.find(m => m.id === cycle.meterId);
    if (!meter) return;

    const report = generateBillingReport(cycle.id, meter, readings);
    if (report) {
      // In a real app, you'd navigate to a detailed report screen
      Alert.alert(
        'Billing Report',
        `Total: ${report.summary.totalConsumption.toFixed(1)} kWh\nCost: $${report.summary.totalCost.toFixed(2)}\nAverage: ${report.summary.averageDailyUsage.toFixed(1)} kWh/day`
      );
    }
  };

  const getEstimatedBill = (cycle: BillingCycle) => {
    const meter = meters.find(m => m.id === cycle.meterId);
    if (!meter?.tariff || cycle.status !== 'active') return null;

    const cycleStart = new Date(cycle.startDate);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysElapsed <= 0) return null;

    return estimateMonthlyBill(
      cycle.totalConsumption,
      daysElapsed,
      cycle.daysInCycle,
      meter.tariff
    );
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Billing Cycles</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewCycleModal(true)}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Calendar size={20} color={colors.primary} />
            <Text style={styles.summaryLabel}>Active Cycles</Text>
            <Text style={styles.summaryValue}>{activeCycles.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <DollarSign size={20} color={colors.success} />
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>
              ${activeCycles.reduce((sum, c) => sum + c.totalCost, 0).toFixed(0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <TrendingUp size={20} color={colors.warning} />
            <Text style={styles.summaryLabel}>Avg Daily</Text>
            <Text style={styles.summaryValue}>
              {activeCycles.length > 0 
                ? (activeCycles.reduce((sum, c) => sum + c.averageDailyUsage, 0) / activeCycles.length).toFixed(1)
                : '0'} kWh
            </Text>
          </View>
        </View>

        {/* Active Cycles */}
        {activeCycles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Billing Cycles</Text>
            {activeCycles.map(cycle => {
              const meter = meters.find(m => m.id === cycle.meterId);
              if (!meter) return null;

              const daysRemaining = getDaysUntilBilling(parseInt(cycle.startDate.split('-')[2]));
              const estimatedBill = getEstimatedBill(cycle);

              return (
                <BillingCycleCard
                  key={cycle.id}
                  cycle={cycle}
                  meter={meter}
                  onPress={() => handleCyclePress(cycle)}
                  daysRemaining={daysRemaining}
                  estimatedBill={estimatedBill}
                />
              );
            })}
          </View>
        )}

        {/* Completed Cycles */}
        {completedCycles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Completed Cycles</Text>
            {completedCycles.slice(0, 5).map(cycle => {
              const meter = meters.find(m => m.id === cycle.meterId);
              if (!meter) return null;

              return (
                <BillingCycleCard
                  key={cycle.id}
                  cycle={cycle}
                  meter={meter}
                  onPress={() => handleCyclePress(cycle)}
                />
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {billingCycles.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Billing Cycles</Text>
            <Text style={styles.emptySubtitle}>
              Create billing cycles to track monthly usage and costs
            </Text>
          </View>
        )}
      </ScrollView>

      {/* New Cycle Modal */}
      <Modal
        visible={showNewCycleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowNewCycleModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Billing Cycle</Text>
            <TouchableOpacity onPress={handleCreateCycle}>
              <Save size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Meter *</Text>
              <View style={styles.meterSelector}>
                {meters.map(meter => (
                  <TouchableOpacity
                    key={meter.id}
                    style={[
                      styles.meterOption,
                      selectedMeterId === meter.id && styles.meterOptionSelected
                    ]}
                    onPress={() => setSelectedMeterId(meter.id)}
                  >
                    <Text style={[
                      styles.meterOptionText,
                      selectedMeterId === meter.id && styles.meterOptionTextSelected
                    ]}>
                      {meter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Billing Start Day *</Text>
              <TextInput
                style={styles.input}
                value={billingStartDay}
                onChangeText={setBillingStartDay}
                placeholder="1-31"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                Day of the month when your billing cycle starts
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Starting Meter Reading (kWh) *</Text>
              <TextInput
                style={styles.input}
                value={startReading}
                onChangeText={setStartReading}
                placeholder="004023.12"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                Current meter reading to start the billing cycle
              </Text>
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
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
  meterSelector: {
    gap: 8,
  },
  meterOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meterOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  meterOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  meterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
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
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});