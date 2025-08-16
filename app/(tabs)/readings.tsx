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
  Platform,
} from 'react-native';
import { Calendar, Plus, CreditCard as Edit3, Trash2, Save, X, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { Reading } from '@/types';
import { FormValidator, ValidationError } from '@/utils/validation';
import { useLocalSearchParams } from 'expo-router';
import { UsageCalculator } from '@/utils/calculations';

export default function ReadingsScreen() {
  const { colors } = useTheme();
  const { meters } = useMeters();
  const { readings, addReading, updateReading, deleteReading, canEditReading } = useReadings();
  const params = useLocalSearchParams();
  
  const [selectedMeterId, setSelectedMeterId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [showMeterPicker, setShowMeterPicker] = useState(false);
  const [editingReading, setEditingReading] = useState<Reading | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reading: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.meterId && typeof params.meterId === 'string') {
      setSelectedMeterId(params.meterId);
    } else if (meters.length > 0) {
      setSelectedMeterId(meters[0].id);
    }
  }, [params.meterId, meters]);

  const selectedMeter = meters.find(m => m.id === selectedMeterId);
  const meterReadings = readings
    .filter(r => r.meterId === selectedMeterId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    try {
      FormValidator.validateDate(formData.date);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.date = err.message;
      }
    }

    try {
      FormValidator.validateReading(formData.reading);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.reading = err.message;
      }
    }

    // Check for duplicate entry (only when adding, not editing)
    if (!editingReading) {
      const duplicate = meterReadings.find(r => r.date === formData.date);
      if (duplicate) {
        errors.date = 'Reading already exists for this date';
      }
    }

    // Validate reading sequence
    if (!editingReading && formData.reading) {
      try {
        const newReading = parseFloat(formData.reading);
        const previousReading = meterReadings
          .filter(r => new Date(r.date) < new Date(formData.date))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (previousReading) {
          FormValidator.validateReadingSequence(newReading, previousReading.reading);
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          errors.reading = err.message;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const reading = parseFloat(formData.reading);

      if (editingReading) {
        await updateReading(editingReading.id, reading);
      } else {
        await addReading(selectedMeterId, formData.date, reading);
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save reading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (reading: Reading) => {
    if (!canEditReading(reading.date)) {
      Alert.alert(
        'Cannot Edit',
        'Readings older than 7 days cannot be edited.'
      );
      return;
    }

    setEditingReading(reading);
    setFormData({
      date: reading.date,
      reading: reading.reading?.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = (reading: Reading) => {
    Alert.alert(
      'Delete Reading',
      `Are you sure you want to delete the reading for ${new Date(reading.date).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteReading(reading.id),
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reading: '',
    });
    setFormErrors({});
    setEditingReading(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const styles = createStyles(colors);

  if (meters.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Meters Available</Text>
          <Text style={styles.emptySubtitle}>
            Add a meter first to start recording readings
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const readingsWithConsumption = UsageCalculator.calculateConsumption(meterReadings);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.meterSelector}
          onPress={() => setShowMeterPicker(true)}
        >
          <Text style={styles.selectedMeterText}>
            {selectedMeter?.name || 'Select Meter'}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          disabled={!selectedMeterId}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {readingsWithConsumption.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No readings recorded</Text>
            <Text style={styles.emptySubtext}>
              Add your first reading for {selectedMeter?.name}
            </Text>
          </View>
        ) : (
          readingsWithConsumption.map(reading => (
            <View key={reading.id} style={styles.readingItem}>
              <View style={styles.readingInfo}>
                <Text style={styles.readingDate}>
                  {new Date(reading.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.readingValue}>
                  {reading.reading?.toLocaleString()} kWh
                </Text>
                {reading.consumption !== undefined && reading.consumption > 0 && (
                  <Text style={styles.consumptionText}>
                    Consumption: {reading.consumption.toFixed(1)} kWh
                  </Text>
                )}
                <Text style={styles.readingTime}>
                  Added {new Date(reading.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.readingActions}>
                {canEditReading(reading.date) && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEdit(reading)}
                  >
                    <Edit3 size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(reading)}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Meter</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.pickerContent}>
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

      {/* Reading Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingReading ? 'Edit Reading' : 'Add Reading'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[
                styles.saveButton,
                submitting && styles.saveButtonDisabled
              ]}
            >
              <Save size={20} color={submitting ? colors.textSecondary : colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formMeterName}>
              Recording for: {selectedMeter?.name}
            </Text>

            {!editingReading && meterReadings.length > 0 && (
              <View style={styles.previousReadingContainer}>
                <Text style={styles.previousReadingLabel}>Previous Reading:</Text>
                <Text style={styles.previousReadingValue}>
                  {meterReadings[0].reading?.toLocaleString()} kWh
                </Text>
                <Text style={styles.previousReadingDate}>
                  on {new Date(meterReadings[0].date).toLocaleDateString()}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={[styles.input, formErrors.date && styles.inputError]}
                value={formData.date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                editable={!editingReading}
              />
              {formErrors.date && (
                <Text style={styles.errorText}>{formErrors.date}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter Reading (kWh) *</Text>
              <TextInput
                style={[styles.input, formErrors.reading && styles.inputError]}
                value={formData.reading}
                onChangeText={(text) => setFormData(prev => ({ ...prev, reading: text }))}
                placeholder="e.g., 004023.12"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              {formErrors.reading && (
                <Text style={styles.errorText}>{formErrors.reading}</Text>
              )}
              <Text style={styles.helpText}>
                Enter the current reading shown on your electricity meter
              </Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Saving...' : (editingReading ? 'Update' : 'Add Reading')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  meterSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  selectedMeterText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
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
  readingItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  readingInfo: {
    flex: 1,
  },
  readingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  readingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  consumptionText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  readingTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  readingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
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
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
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
  saveButton: {
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
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
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formMeterName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  previousReadingContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previousReadingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previousReadingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  previousReadingDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});