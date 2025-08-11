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
import { Plus, CreditCard as Edit3, Trash2, Save, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useMeters } from '@/hooks/useMeters';
import { Meter } from '@/types';
import { FormValidator, ValidationError } from '@/utils/validation';
import { router, useLocalSearchParams } from 'expo-router';

interface FormData {
  name: string;
  location: string;
  meterId: string;
  dailyLimit: string;
  monthlyLimit: string;
}

export default function MetersScreen() {
  const { colors } = useTheme();
  const { meters, addMeter, updateMeter, deleteMeter } = useMeters();
  const params = useLocalSearchParams();
  
  const [showForm, setShowForm] = useState(false);
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    meterId: '',
    dailyLimit: '',
    monthlyLimit: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.edit) {
      const meterToEdit = meters.find(m => m.id === params.edit);
      if (meterToEdit) {
        setEditingMeter(meterToEdit);
        setFormData({
          name: meterToEdit.name,
          location: meterToEdit.location,
          meterId: meterToEdit.meterId || '',
          dailyLimit: meterToEdit.limits.daily.toString(),
          monthlyLimit: meterToEdit.limits.monthly.toString(),
        });
        setShowForm(true);
      }
    }
  }, [params.edit, meters]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    try {
      FormValidator.validateMeterName(formData.name);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.name = err.message;
      }
    }

    try {
      FormValidator.validateLocation(formData.location);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.location = err.message;
      }
    }

    try {
      FormValidator.validateMeterId(formData.meterId);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.meterId = err.message;
      }
    }

    try {
      if (formData.dailyLimit) {
        FormValidator.validateLimit(formData.dailyLimit);
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.dailyLimit = err.message;
      }
    }

    try {
      if (formData.monthlyLimit) {
        FormValidator.validateLimit(formData.monthlyLimit);
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.monthlyLimit = err.message;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const dailyLimit = formData.dailyLimit ? parseFloat(formData.dailyLimit) : 0;
      const monthlyLimit = formData.monthlyLimit ? parseFloat(formData.monthlyLimit) : 0;

      if (editingMeter) {
        await updateMeter(editingMeter.id, {
          name: formData.name,
          location: formData.location,
          meterId: formData.meterId || undefined,
          limits: { daily: dailyLimit, monthly: monthlyLimit },
        });
      } else {
        await addMeter(
          formData.name,
          formData.location,
          formData.meterId || undefined,
          dailyLimit,
          monthlyLimit
        );
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save meter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (meter: Meter) => {
    Alert.alert(
      'Delete Meter',
      `Are you sure you want to delete "${meter.name}"? This will also delete all associated readings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMeter(meter.id),
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      meterId: '',
      dailyLimit: '',
      monthlyLimit: '',
    });
    setFormErrors({});
    setEditingMeter(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
    if (params.edit) {
      router.back();
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Meters</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {meters.map(meter => (
          <View key={meter.id} style={styles.meterItem}>
            <View style={styles.meterInfo}>
              <Text style={styles.meterName}>{meter.name}</Text>
              <Text style={styles.meterLocation}>{meter.location}</Text>
              {meter.meterId && (
                <Text style={styles.meterIdText}>ID: {meter.meterId}</Text>
              )}
              <View style={styles.limitsContainer}>
                <Text style={styles.limitsText}>
                  Daily: {meter.limits.daily || 'No limit'} kWh | 
                  Monthly: {meter.limits.monthly || 'No limit'} kWh
                </Text>
              </View>
            </View>
            <View style={styles.meterActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setEditingMeter(meter);
                  setFormData({
                    name: meter.name,
                    location: meter.location,
                    meterId: meter.meterId || '',
                    dailyLimit: meter.limits.daily.toString(),
                    monthlyLimit: meter.limits.monthly.toString(),
                  });
                  setShowForm(true);
                }}
              >
                <Edit3 size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(meter)}
              >
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {meters.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meters configured yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first meter to start tracking electricity usage
            </Text>
          </View>
        )}
      </ScrollView>

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
              {editingMeter ? 'Edit Meter' : 'Add New Meter'}
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

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter Name *</Text>
              <TextInput
                style={[styles.input, formErrors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="e.g., Main House, Garage"
                placeholderTextColor={colors.textSecondary}
                maxLength={50}
              />
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location/Address *</Text>
              <TextInput
                style={[styles.input, formErrors.location && styles.inputError]}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="e.g., 123 Main Street, Living Room"
                placeholderTextColor={colors.textSecondary}
                maxLength={100}
                multiline
              />
              {formErrors.location && (
                <Text style={styles.errorText}>{formErrors.location}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meter ID (Optional)</Text>
              <TextInput
                style={[styles.input, formErrors.meterId && styles.inputError]}
                value={formData.meterId}
                onChangeText={(text) => setFormData(prev => ({ ...prev, meterId: text }))}
                placeholder="e.g., MTR001, ABC123"
                placeholderTextColor={colors.textSecondary}
                maxLength={20}
              />
              {formErrors.meterId && (
                <Text style={styles.errorText}>{formErrors.meterId}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Daily Usage Limit (kWh)</Text>
              <TextInput
                style={[styles.input, formErrors.dailyLimit && styles.inputError]}
                value={formData.dailyLimit}
                onChangeText={(text) => setFormData(prev => ({ ...prev, dailyLimit: text }))}
                placeholder="0 (no limit)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              {formErrors.dailyLimit && (
                <Text style={styles.errorText}>{formErrors.dailyLimit}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Monthly Usage Limit (kWh)</Text>
              <TextInput
                style={[styles.input, formErrors.monthlyLimit && styles.inputError]}
                value={formData.monthlyLimit}
                onChangeText={(text) => setFormData(prev => ({ ...prev, monthlyLimit: text }))}
                placeholder="0 (no limit)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              {formErrors.monthlyLimit && (
                <Text style={styles.errorText}>{formErrors.monthlyLimit}</Text>
              )}
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
                  {submitting ? 'Saving...' : (editingMeter ? 'Update' : 'Add Meter')}
                </Text>
              </TouchableOpacity>
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
  meterItem: {
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
  meterInfo: {
    flex: 1,
  },
  meterName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  meterLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  meterIdText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  limitsContainer: {
    marginTop: 4,
  },
  limitsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  meterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
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