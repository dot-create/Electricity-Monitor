import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Camera, Image as ImageIcon, Zap, CircleCheck as CheckCircle, CircleAlert as AlertCircle, RefreshCw, Eye, Target, Crosshair, Scan } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCameraReading } from '@/hooks/useCameraReading';
import { Meter, MeterDetection } from '@/types';

interface SmartReadingInterfaceProps {
  meter: Meter;
  onReadingConfirmed: (value: number, imageUri?: string) => void;
  onCancel: () => void;
}

export const SmartReadingInterface: React.FC<SmartReadingInterfaceProps> = ({
  meter,
  onReadingConfirmed,
  onCancel,
}) => {
  const { colors } = useTheme();
  const {
    processing,
    currentReading,
    error,
    captureAndProcessImage,
    selectDetection,
    setManualReading,
    confirmReading,
    retryProcessing,
  } = useCameraReading();

  const [selectedDetectionId, setSelectedDetectionId] = useState<string>('');
  const [manualValue, setManualValue] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');

  useEffect(() => {
    if (currentReading && currentReading.detections.length > 0) {
      // Auto-select the highest confidence detection
      const bestDetection = currentReading.detections.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
      setSelectedDetectionId(bestDetection.id);
      selectDetection(currentReading.id, bestDetection.id);
    }
  }, [currentReading]);

  const handleCapture = async (source: 'camera' | 'library') => {
    setProcessingStage('Capturing image...');
    const reading = await captureAndProcessImage(meter, source);
    
    if (reading) {
      if (reading.detections.length === 0) {
        setShowManualInput(true);
      }
    }
    setProcessingStage('');
  };

  const handleDetectionSelect = (detection: MeterDetection) => {
    setSelectedDetectionId(detection.id);
    selectDetection(currentReading!.id, detection.id);
    setShowManualInput(false);
  };

  const handleConfirm = async () => {
    if (!currentReading) return;

    try {
      let finalValue: number | null = null;

      if (showManualInput && manualValue) {
        const value = parseFloat(manualValue);
        if (!isNaN(value) && value > 0) {
          finalValue = value;
        } else {
          Alert.alert('Invalid Input', 'Please enter a valid meter reading');
          return;
        }
      } else {
        finalValue = await confirmReading(currentReading.id);
      }

      if (finalValue !== null) {
        onReadingConfirmed(finalValue, currentReading.imageUri);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to confirm reading');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return colors.success;
    if (confidence >= 0.7) return colors.warning;
    return colors.error;
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'valid': return CheckCircle;
      case 'invalid': return AlertCircle;
      default: return Eye;
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Reading</Text>
        <Text style={styles.subtitle}>{meter.name}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {!currentReading && !processing && (
          <View style={styles.captureSection}>
            <View style={styles.instructionsContainer}>
              <View style={styles.iconContainer}>
                <Scan size={48} color={colors.primary} />
              </View>
              <Text style={styles.instructionsTitle}>AI-Powered Meter Reading</Text>
              <Text style={styles.instructionsText}>
                Point your camera at the meter display. Our AI will automatically detect 
                and read the numbers with high accuracy.
              </Text>
              
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>📋 Tips for Best Results:</Text>
                <Text style={styles.tipText}>• Ensure good lighting</Text>
                <Text style={styles.tipText}>• Keep meter display centered</Text>
                <Text style={styles.tipText}>• Hold camera steady</Text>
                <Text style={styles.tipText}>• Clean meter display if dirty</Text>
              </View>
            </View>

            <View style={styles.captureButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleCapture('camera')}
              >
                <Camera size={24} color={colors.background} />
                <Text style={styles.primaryButtonText}>Capture with Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleCapture('library')}
              >
                <ImageIcon size={24} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Choose from Photos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingTitle}>Processing Image</Text>
            <Text style={styles.processingText}>
              {processingStage || 'Analyzing meter display...'}
            </Text>
            <View style={styles.processingSteps}>
              <Text style={styles.stepText}>🔍 Detecting meter display</Text>
              <Text style={styles.stepText}>📖 Reading numbers with OCR</Text>
              <Text style={styles.stepText}>✅ Validating results</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={32} color={colors.error} />
            <Text style={styles.errorTitle}>Processing Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryProcessing}
            >
              <RefreshCw size={16} color={colors.primary} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentReading && (
          <View style={styles.resultsContainer}>
            <View style={styles.imageSection}>
              <Image source={{ uri: currentReading.imageUri }} style={styles.capturedImage} />
              <View style={styles.imageStats}>
                <Text style={styles.imageStatsText}>
                  Processing time: {(currentReading.processingTime / 1000).toFixed(1)}s
                </Text>
                <Text style={styles.imageStatsText}>
                  Detections: {currentReading.detections.length}
                </Text>
              </View>
            </View>

            {currentReading.detections.length > 0 && (
              <View style={styles.detectionsSection}>
                <Text style={styles.sectionTitle}>🎯 Detected Readings</Text>
                <Text style={styles.sectionSubtitle}>
                  Tap to select the correct reading
                </Text>
                
                {currentReading.detections.map((detection, index) => {
                  const ValidationIcon = getValidationIcon(detection.validationStatus);
                  const isSelected = selectedDetectionId === detection.id;
                  
                  return (
                    <TouchableOpacity
                      key={detection.id}
                      style={[
                        styles.detectionCard,
                        isSelected && styles.detectionSelected
                      ]}
                      onPress={() => handleDetectionSelect(detection)}
                    >
                      <View style={styles.detectionHeader}>
                        <Text style={styles.detectionNumber}>#{index + 1}</Text>
                        <View style={[
                          styles.confidenceBadge,
                          { backgroundColor: getConfidenceColor(detection.confidence) }
                        ]}>
                          <Text style={styles.confidenceText}>
                            {(detection.confidence * 100).toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.detectionValue}>
                        {detection.processedValue?.toLocaleString()} kWh
                      </Text>
                      
                      <View style={styles.detectionDetails}>
                        <Text style={styles.detectionRaw}>
                          Raw text: "{detection.extractedText}"
                        </Text>
                        <View style={styles.detectionMeta}>
                          <Text style={styles.detectionType}>
                            {detection.type.toUpperCase()}
                          </Text>
                          <ValidationIcon 
                            size={12} 
                            color={detection.validationStatus === 'valid' ? colors.success : colors.warning} 
                          />
                        </View>
                      </View>
                      
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <CheckCircle size={16} color={colors.primary} />
                          <Text style={styles.selectedText}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.manualSection}>
              <TouchableOpacity
                style={styles.manualToggle}
                onPress={() => setShowManualInput(!showManualInput)}
              >
                <Eye size={16} color={colors.primary} />
                <Text style={styles.manualToggleText}>
                  {showManualInput ? 'Hide Manual Entry' : 'Enter Reading Manually'}
                </Text>
              </TouchableOpacity>

              {showManualInput && (
                <View style={styles.manualInputContainer}>
                  <Text style={styles.manualLabel}>Manual Reading (kWh)</Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualValue}
                    onChangeText={setManualValue}
                    placeholder="004023.12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={styles.manualHint}>
                    Use this if automatic detection failed or for verification
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!selectedDetectionId && !manualValue) && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirm}
                disabled={!selectedDetectionId && !manualValue}
              >
                <CheckCircle size={16} color={colors.background} />
                <Text style={styles.confirmButtonText}>Confirm Reading</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  captureSection: {
    alignItems: 'center',
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 50,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  tipsContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  captureButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
  },
  processingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  processingSteps: {
    marginTop: 24,
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.error,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.background,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 24,
  },
  imageSection: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  capturedImage: {
    width: '100%',
    height: 240,
  },
  imageStats: {
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageStatsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detectionsSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  detectionCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  detectionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detectionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
  detectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  detectionDetails: {
    gap: 4,
  },
  detectionRaw: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  detectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectionType: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  manualSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  manualToggleText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  manualInputContainer: {
    gap: 12,
  },
  manualLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  manualInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    fontFamily: 'monospace',
  },
  manualHint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});