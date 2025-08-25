import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { CameraReading, MeterDetection, Meter } from '@/types';
import { ImageProcessor } from '@/utils/imageProcessing';
import { CameraUtils } from '@/utils/cameraUtils';

export const useCameraReading = () => {
  const [processing, setProcessing] = useState(false);
  const [currentReading, setCurrentReading] = useState<CameraReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');

  const captureAndProcessImage = useCallback(async (
    meter: Meter,
    source: 'camera' | 'library' = 'camera'
  ): Promise<CameraReading | null> => {
    try {
      setProcessing(true);
      setError(null);
      setProcessingStage('Capturing image...');

      // Capture or select image
      const imageUri = source === 'camera' 
        ? await CameraUtils.captureImage()
        : await CameraUtils.pickImageFromLibrary();

      if (!imageUri) {
        setProcessing(false);
        setProcessingStage('');
        return null;
      }

      setProcessingStage('Assessing image quality...');
      
      // Assess image quality
      const qualityAssessment = await ImageProcessor.assessImageQuality(imageUri);
      
      if (qualityAssessment.quality === 'poor') {
        Alert.alert(
          'Image Quality Warning',
          `Image quality is ${qualityAssessment.quality}. ${qualityAssessment.suggestions.join('. ')}`,
          [
            { text: 'Continue Anyway', style: 'default' },
            { text: 'Retake Photo', style: 'cancel', onPress: () => {
              setProcessing(false);
              setProcessingStage('');
              return null;
            }}
          ]
        );
      }

      setProcessingStage('Enhancing image...');
      
      // Process and enhance image
      const processedImageUri = await ImageProcessor.processImage(imageUri);
      
      setProcessingStage('Detecting meters...');
      
      // Detect meters using real OCR
      const detections = await ImageProcessor.detectMeters(processedImageUri);
      
      setProcessingStage('Validating readings...');
      
      // Validate each detection
      const validatedDetections = detections.map(detection => {
        const validation = ImageProcessor.validateMeterReading(
          detection.extractedText || '',
          undefined,
          // You could pass previous reading here for sequence validation
        );
        
        return {
          ...detection,
          validationStatus: validation.isValid ? 'valid' as const : 'needs_review' as const,
          confidence: ImageProcessor.calculateConfidenceScore(
            detection.confidence,
            detection.confidence,
            validation
          )
        };
      });

      setProcessingStage('Finalizing results...');

      // Create camera reading record
      const cameraReading: CameraReading = {
        id: Date.now().toString(),
        meterId: meter.id,
        imageUri: processedImageUri,
        detections: validatedDetections,
        confidence: validatedDetections.length > 0 
          ? Math.max(...validatedDetections.map(d => d.confidence)) 
          : 0,
        processingTime: Date.now() - parseInt(Date.now().toString()),
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        status: validatedDetections.length > 0 ? 'completed' : 'manual_review',
      };

      setCurrentReading(cameraReading);
      setProcessingStage('');
      
      // Show quality feedback to user
      if (qualityAssessment.suggestions.length > 0) {
        console.log('Image quality suggestions:', qualityAssessment.suggestions);
      }
      
      return cameraReading;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      console.error('Camera reading failed:', err);
      
      // Provide specific error feedback
      if (errorMessage.includes('OCR')) {
        Alert.alert(
          'OCR Error',
          'Failed to read text from the image. Please ensure the meter display is clearly visible and try again.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('permission')) {
        Alert.alert(
          'Permission Error',
          'Camera or photo library access is required. Please check your app permissions.',
          [{ text: 'OK' }]
        );
      }
      
      return null;
    } finally {
      setProcessing(false);
      setProcessingStage('');
    }
  }, []);

  const selectDetection = useCallback((
    readingId: string,
    detectionId: string
  ): void => {
    if (currentReading && currentReading.id === readingId) {
      setCurrentReading({
        ...currentReading,
        selectedDetection: detectionId,
      });
    }
  }, [currentReading]);

  const setManualReading = useCallback((
    readingId: string,
    value: number
  ): void => {
    if (currentReading && currentReading.id === readingId) {
      // Validate manual reading
      const validation = ImageProcessor.validateMeterReading(value.toString());
      
      setCurrentReading({
        ...currentReading,
        manualReading: value,
        status: validation.isValid ? 'completed' : 'manual_review',
      });
    }
  }, [currentReading]);

  const confirmReading = useCallback(async (
    readingId: string
  ): Promise<number | null> => {
    if (!currentReading || currentReading.id !== readingId) {
      return null;
    }

    try {
      let finalValue: number | null = null;

      if (currentReading.manualReading !== undefined) {
        finalValue = currentReading.manualReading;
      } else if (currentReading.selectedDetection) {
        const detection = currentReading.detections.find(
          d => d.id === currentReading.selectedDetection
        );
        finalValue = detection?.processedValue || null;
      } else if (currentReading.detections.length > 0) {
        // Use highest confidence detection
        const bestDetection = currentReading.detections.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        );
        finalValue = bestDetection.processedValue || null;
      }

      if (finalValue !== null) {
        // Final validation
        const validation = ImageProcessor.validateMeterReading(finalValue.toString());
        
        if (!validation.isValid) {
          Alert.alert(
            'Validation Warning',
            `Reading validation issues: ${validation.errors.join(', ')}. Continue anyway?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue', onPress: () => {
                // Save the reading even with validation warnings
                this.saveCameraReading(currentReading);
                setCurrentReading(null);
                return finalValue;
              }}
            ]
          );
          return null;
        }
        
        // Save the camera reading record for future reference
        await this.saveCameraReading(currentReading);
        setCurrentReading(null);
        return finalValue;
      }

      throw new Error('No valid reading found');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reading');
      return null;
    }
  }, [currentReading]);

  const saveCameraReading = async (reading: CameraReading): Promise<void> => {
    try {
      // In a production app, you'd save this to a dedicated camera readings storage
      // For now, we'll just log it
      console.log('Saving camera reading:', {
        id: reading.id,
        meterId: reading.meterId,
        detections: reading.detections.length,
        confidence: reading.confidence,
        status: reading.status,
        timestamp: reading.timestamp
      });
      
      // You could also save to AsyncStorage or send to a backend service
      // await StorageManager.saveCameraReading(reading);
    } catch (error) {
      console.error('Failed to save camera reading:', error);
    }
  };

  const retryProcessing = useCallback(async (): Promise<void> => {
    if (!currentReading) return;

    try {
      setProcessing(true);
      setError(null);
      setProcessingStage('Reprocessing image...');

      const detections = await ImageProcessor.detectMeters(currentReading.imageUri);
      
      setCurrentReading({
        ...currentReading,
        detections,
        confidence: detections.length > 0 ? Math.max(...detections.map(d => d.confidence)) : 0,
        status: detections.length > 0 ? 'completed' : 'manual_review',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry processing');
    } finally {
      setProcessing(false);
      setProcessingStage('');
    }
  }, [currentReading]);

  const clearReading = useCallback((): void => {
    setCurrentReading(null);
    setError(null);
    setProcessingStage('');
  }, []);

  return {
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
  };
};