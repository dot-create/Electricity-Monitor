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
import { BillingCycleCard } from '@/components/BillingCycleCard';
import { BillingCycleManager } from '@/utils/billingCycle';
import { UsageCalculator } from '@/utils/calculations';
import { StorageManager } from '@/utils/storage';
import { BillingCycle } from '@/types';

export default function BillingScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { readings } = useReadings();

  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [editingCycle, setEditingCycle] = useState<BillingCycle | null>(null);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [billingStartDay, setBillingStartDay] = useState('1');
  const [startReading, setStartReading] = useState('');

  useEffect(() => {
    loadBillingCycles();
  }, []);

  const loadBillingCycles = async () => {
    try {
      const cycles = await StorageManager.getBillingCycles();
      setBillingCycles(cycles);
    } catch (error) {
      console.error('Failed to load billing cycles:', error);
    }
  };

  // Handles cascading deletes when a meter is removed
  useEffect(() => {
    if (billingCycles.length === 0) return;

    const meterIds = new Set(meters.map(m => m.id));
    const cyclesWithExistingMeters = billingCycles.filter(c => meterIds.has(c.meterId));

    // If the number of cycles has changed, it means a meter was deleted.
    if (cyclesWithExistingMeters.length !== billingCycles.length) {
      setBillingCycles(cyclesWithExistingMeters);
      StorageManager.saveBillingCycles(cyclesWithExistingMeters);
    }
  }, [meters, billingCycles]);

  // Pre-fill start reading and billing day when a meter is selected for a new cycle
  useEffect(() => {
    if (showNewCycleModal && selectedMeterId && !editingCycle) {
      const selectedMeter = meters.find(m => m.id === selectedMeterId);
      if (selectedMeter) {
        // Pre-fill billing start day from the meter's setting
        if (selectedMeter.billingCycle) {
          setBillingStartDay(selectedMeter.billingCycle.startDay.toString());
        }

        // Pre-fill start reading from the latest reading
        const meterReadings = readings.filter(r => r.meterId === selectedMeterId);
        const latestReading = UsageCalculator.getLatestReading(meterReadings, selectedMeterId);
        if (latestReading) {
          setStartReading(latestReading.reading.toString());
        } else {
          setStartReading(''); // Reset if no readings found for the new meter
        }
      }
    }
  }, [selectedMeterId, showNewCycleModal, editingCycle, meters, readings]);

  // This new useEffect will recalculate stats for active cycles when readings change.
  useEffect(() => {
    // Ensure we have all the necessary data before proceeding.
    if (billingCycles.length === 0 || readings.length === 0 || meters.length === 0) {
      return;
    }

    const activeCyclesExist = billingCycles.some(c => c.status === 'active');
    if (!activeCyclesExist) {
      return;
    }

    const updatedCycles = billingCycles.map(cycle => {
      // We only care about recalculating for active cycles.
      if (cycle.status !== 'active') {
        return cycle;
      }

      const meter = meters.find(m => m.id === cycle.meterId);
      if (!meter) {
        return cycle; // Meter not found, return original cycle.
      }

      const meterReadings = readings.filter(r => r.meterId === cycle.meterId);
      const latestReading = UsageCalculator.getLatestReading(meterReadings, cycle.meterId);

      // If there are no readings after the cycle started, consumption is 0.
      if (!latestReading || new Date(latestReading.date) < new Date(cycle.startDate)) {
        return {
          ...cycle,
          totalConsumption: 0,
          totalCost: 0,
          averageDailyUsage: 0,
          peakUsage: 0,
        };
      }

      // Total consumption is the difference between the latest reading and the cycle's start reading.
      const totalConsumption = Math.max(0, latestReading.reading - cycle.startReading);
      const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24)));
      const averageDailyUsage = totalConsumption / daysElapsed;

      // To calculate peak usage, we need daily consumptions. We create a "virtual" reading
      // at the start of the cycle based on the cycle's startReading value.
      const virtualStartReading: Reading = {
        id: 'virtual-start-' + cycle.id,
        meterId: cycle.meterId,
        date: new Date(new Date(cycle.startDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reading: cycle.startReading,
        timestamp: new Date(cycle.startDate).toISOString(),
      };
      const readingsInCycle = meterReadings.filter(r => {
        const readingDate = new Date(r.date);
        return readingDate >= new Date(cycle.startDate) && readingDate <= new Date();
      });
      
      const readingsForPeakCalc = [virtualStartReading, ...readingsInCycle];
      const readingsWithConsumption = UsageCalculator.calculateConsumption(readingsForPeakCalc);
      const peakUsage = Math.max(0, ...readingsWithConsumption.slice(1).map(r => r.consumption || 0));

      return {
        ...cycle,
        totalConsumption,
        totalCost: meter.tariff ? totalConsumption * meter.tariff.rate : 0,
        averageDailyUsage,
        peakUsage,
      };
    });

    // Only update state if the data has actually changed to prevent unnecessary re-renders.
    if (JSON.stringify(updatedCycles) !== JSON.stringify(billingCycles)) {
      setBillingCycles(updatedCycles);
    }
  }, [readings, meters, billingCycles]);

  const activeCycles = billingCycles.filter(c => c.status === 'active');
  const completedCycles = billingCycles.filter(c => c.status === 'completed');

  const handleSubmit = async () => {
    try {
      const readingValue = startReading;
      if ((!selectedMeterId && !editingCycle) || !billingStartDay || !readingValue) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const reading = parseFloat(readingValue);
      if (isNaN(reading) || reading < 0) {
        Alert.alert('Error', 'Please enter a valid starting reading');
        return;
      }

      if (editingCycle) {
        // Update existing cycle
        const updatedCycles = billingCycles.map(c =>
          c.id === editingCycle.id
            ? { ...c, startReading: reading } // For simplicity, only allow editing the start reading
            : c
        );
        await StorageManager.saveBillingCycles(updatedCycles);
        setBillingCycles(updatedCycles);
      } else {
        // Create new cycle
        const existingActiveCycle = activeCycles.find(c => c.meterId === selectedMeterId);
        if (existingActiveCycle) {
          Alert.alert(
            'Active Cycle Exists',
            'An active billing cycle already exists for this meter. Please complete or delete the existing one before creating a new one.'
          );
          return;
        }

        const startDay = parseInt(billingStartDay);
        if (startDay < 1 || startDay > 31) {
          Alert.alert('Error', 'Billing start day must be between 1 and 31');
          return;
        }
        const newCycle = BillingCycleManager.createBillingCycle(selectedMeterId, startDay, reading);
        const updatedCycles = [...billingCycles, newCycle];
        await StorageManager.saveBillingCycles(updatedCycles);
        setBillingCycles(updatedCycles);
      }
      
      setShowNewCycleModal(false);
      resetForm();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save billing cycle');
    }
  };

  const handleEditCycle = (cycle: BillingCycle) => {
    setEditingCycle(cycle);
    setSelectedMeterId(cycle.meterId);
    setBillingStartDay(new Date(cycle.startDate).getDate().toString());
    setStartReading(cycle.startReading.toString());
    setShowNewCycleModal(true);
  };

  const handleDeleteCycle = (cycleId: string) => {
    Alert.alert(
      'Delete Billing Cycle',
      'Are you sure you want to delete this cycle? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCycles = billingCycles.filter(c => c.id !== cycleId);
            await StorageManager.saveBillingCycles(updatedCycles);
            setBillingCycles(updatedCycles);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedMeterId('');
    setBillingStartDay('1');
    setStartReading('');
    setEditingCycle(null);
  };

  const getEstimatedBill = (cycle: BillingCycle) => {
    const meter = meters.find(m => m.id === cycle.meterId);
    if (!meter?.tariff || cycle.status !== 'active') return null;

    const cycleStart = new Date(cycle.startDate);
    const today = new Date();
    const daysElapsed = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysElapsed <= 0) return null;

    return BillingCycleManager.estimateMonthlyBill(
      cycle.totalConsumption,
      daysElapsed,
      cycle.daysInCycle,
      meter.tariff
    );
  };

  const getDaysUntilBilling = (startDay: number): number => {
    return BillingCycleManager.getDaysUntilBilling(startDay);
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
                  onPress={() => {}}
                  daysRemaining={daysRemaining}
                  estimatedBill={estimatedBill}
                  onEdit={() => handleEditCycle(cycle)}
                  onDelete={() => handleDeleteCycle(cycle.id)}
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
                  onPress={() => {}}
                  onEdit={() => handleEditCycle(cycle)}
                  onDelete={() => handleDeleteCycle(cycle.id)}
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
            <Text style={styles.modalTitle}>{editingCycle ? 'Edit' : 'New'} Billing Cycle</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Save size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Meter *</Text>
              <View style={[styles.meterSelector, !!editingCycle && styles.disabled]}>
                {meters.map(meter => (
                  <TouchableOpacity
                    key={meter.id}
                    style={[
                      styles.meterOption,
                      selectedMeterId === meter.id && styles.meterOptionSelected
                    ]}
                    onPress={() => !editingCycle && setSelectedMeterId(meter.id)}
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
                style={[styles.input, styles.disabledInput]}
                value={billingStartDay}
                onChangeText={setBillingStartDay}
                placeholder="1-31"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                editable={false}
              />
              <Text style={styles.helpText}>
                Pre-filled from meter settings. This cannot be changed here.
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
                Latest reading will be pre-filled. Update if needed.
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
  disabledInput: {
    backgroundColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});