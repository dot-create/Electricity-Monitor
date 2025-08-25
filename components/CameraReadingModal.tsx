import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Camera, Image as ImageIcon, X, Check, RefreshCw, Eye, CircleAlert as AlertCircle, Zap, Info } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCameraReading } from '@/hooks/useCameraReading';
import { Meter, MeterDetection } from '@/types';

interface CameraReadingModalProps {
  visible: boolean;
  meter: Meter;
  onClose: () => void;
  onReadingConfirmed: (value: number) => void;
}

export const CameraReadingModal: React.FC<CameraReadingModalProps> = ({
  visible,
  meter,
  onClose,
  onReadingConfirmed,
}) => {
  const { colors } = useTheme();
  const {
    processing,
    currentReading,
    error,
    processingStage,
    captureAndProcessImage,
    selectDetection,
    setManualReading,
    confirmReading,
    retryProcessing,
    clearReading,
  } = useCameraReading();

  const [manualValue, setManualValue] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleCapture = async (source: 'camera' | 'library') => {
    const reading = await captureAndProcessImage(meter, source);
    if (reading && reading.detections.length === 0) {
      setShowManualInput(true);
    }
  };

  const handleConfirm = async () => {
    if (!currentReading) return;

    let finalValue: number | null = null;

    if (showManualInput && manualValue) {
      const value = parseFloat(manualValue);
      if (!isNaN(value)) {
        setManualReading(currentReading.id, value);
        finalValue = value;
      }
    } else {
      finalValue = await confirmReading(currentReading.id);
    }

    if (finalValue !== null) {
      onReadingConfirmed(finalValue);
      handleClose();
    }
  };

  const handleClose = () => {
    clearReading();
    setManualValue('');
    setShowManualInput(false);
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return colors.success;
    if (confidence >= 0.7) return colors.warning;
    return colors.error;
  };

  const styles = createStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Smart Reading - {meter.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {!currentReading && !processing && (
            <View style={styles.captureSection}>
              <View style={styles.instructionsContainer}>
                <Zap size={32} color={colors.primary} />
                <Text style={styles.instructionsTitle}>Capture Meter Reading</Text>
                <Text style={styles.instructionsText}>
                  Position your camera to clearly show the meter display. 
                  The app will automatically detect and read the numbers.
                </Text>
              </View>

              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => handleCapture('camera')}
                >
                  <Camera size={24} color={colors.background} />
                  <Text style={styles.captureButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.libraryButton}
                  onPress={() => handleCapture('library')}
                >
                  <ImageIcon size={24} color={colors.primary} />
                  <Text style={styles.libraryButtonText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {processing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>
                {processingStage || 'Processing image...'}
              </Text>
              <Text style={styles.processingSubtext}>
                Using advanced OCR and computer vision
              </Text>
              <View style={styles.processingSteps}>
                <Text style={styles.stepText}>🔍 Analyzing image quality</Text>
                <Text style={styles.stepText}>📖 Extracting text with ML Kit OCR</Text>
                <Text style={styles.stepText}>✅ Validating meter readings</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color={colors.error} />
              <Text style={styles.errorTitle}>Processing Failed</Text>
              <Text style={styles.errorText}>
                {error}
              </Text>
              <View style={styles.errorHints}>
                <Text style={styles.hintText}>💡 Try ensuring good lighting</Text>
                <Text style={styles.hintText}>📱 Keep meter display centered</Text>
                <Text style={styles.hintText}>🔍 Move closer for better clarity</Text>
              </View>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retryProcessing}
              >
                <RefreshCw size={16} color={colors.primary} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentReading && (
            <View style={styles.resultsContainer}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: currentReading.imageUri }} style={styles.capturedImage} />
                <View style={styles.imageInfo}>
                  <View style={styles.imageStats}>
                    <Text style={styles.imageStatsText}>
                      Processing: {(currentReading.processingTime / 1000).toFixed(1)}s
                    </Text>
                    <Text style={styles.imageStatsText}>
                      Detections: {currentReading.detections.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.imageOverlay}>
                  <Text style={styles.confidenceText}>
                    Confidence: {(currentReading.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>

              {currentReading.detections.length > 0 && (
                <View style={styles.detectionsContainer}>
                  <View style={styles.detectionsHeader}>
                    <Text style={styles.detectionsTitle}>🎯 AI Detected Readings</Text>
                    <Info size={16} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.detectionsSubtitle}>
                    Select the correct reading or enter manually below
                  </Text>
                  {currentReading.detections.map((detection, index) => (
                    <TouchableOpacity
                      key={detection.id}
                      style={[
                        styles.detectionItem,
                        currentReading.selectedDetection === detection.id && styles.detectionSelected
                      ]}
                      onPress={() => selectDetection(currentReading.id, detection.id)}
                    >
                      <View style={styles.detectionInfo}>
                        <View style={styles.detectionHeader}>
                          <Text style={styles.detectionNumber}>Reading #{index + 1}</Text>
                        </View>
                        <Text style={styles.detectionValue}>
                          {detection.processedValue?.toLocaleString()} kWh
                        </Text>
                        <Text style={styles.detectionText}>
                          Raw: "{detection.extractedText}"
                        </Text>
                        <Text style={styles.detectionType}>
                          {detection.type.toUpperCase()} • Status: {detection.validationStatus}
                        </Text>
                        <Text style={styles.detectionConfidence}>
                          Confidence: {(detection.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <View style={[
                        styles.confidenceBadge,
                        { backgroundColor: getConfidenceColor(detection.confidence) }
                      ]}>
                        <Text style={styles.confidenceBadgeText}>
                          {(detection.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.manualSection}>
                <TouchableOpacity
                  style={styles.manualToggle}
                  onPress={() => setShowManualInput(!showManualInput)}
                >
                  <Eye size={16} color={colors.primary} />
                  <Text style={styles.manualToggleText}>
                    {showManualInput ? 'Hide Manual Entry' : 'Manual Entry Override'}
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
                      Use this if OCR detection is incorrect or for verification
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!currentReading.selectedDetection && !manualValue && currentReading.detections.length === 0) && styles.confirmButtonDisabled
                  ]}
                  onPress={handleConfirm}
                  disabled={!currentReading.selectedDetection && !manualValue && currentReading.detections.length === 0}
                >
                  <Check size={16} color={colors.background} />
                  <Text style={styles.confirmButtonText}>Confirm Reading</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  captureSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  captureButtons: {
    width: '100%',
    gap: 12,
  },
  captureButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  captureButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  libraryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  libraryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  processingSteps: {
    marginTop: 16,
    gap: 4,
  },
  stepText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 12,
  },
  errorHints: {
    marginVertical: 12,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageInfo: {
    backgroundColor: colors.surface,
    padding: 8,
  },
  imageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageStatsText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 6,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detectionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detectionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  detectionsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  detectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  detectionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  detectionInfo: {
    flex: 1,
  },
  detectionHeader: {
    marginBottom: 4,
  },
  detectionNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  detectionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  detectionText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detectionType: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detectionConfidence: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
  manualSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  manualToggleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  manualInputContainer: {
    gap: 8,
  },
  manualLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  manualHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  confirmButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});