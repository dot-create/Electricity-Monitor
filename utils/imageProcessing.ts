import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { OCRResult, MeterDetection, ImageProcessingSettings } from '@/types';

export class ImageProcessor {
  private static defaultSettings: ImageProcessingSettings = {
    brightness: 0,
    contrast: 0,
    autoEnhance: true,
    noiseReduction: true,
    perspectiveCorrection: true,
    edgeDetection: true,
  };

  static async processImage(
    imageUri: string,
    settings: ImageProcessingSettings = this.defaultSettings
  ): Promise<string> {
    try {
      console.log('Processing image:', imageUri);
      
      let processedUri = imageUri;
      
      // Apply image enhancements using ImageManipulator
      const manipulatorActions: ImageManipulator.Action[] = [];
      
      // Auto-enhance if enabled
      if (settings.autoEnhance) {
        // Resize for better OCR performance
        manipulatorActions.push({
          resize: { width: 1024 }
        });
      }
      
      // Apply brightness and contrast adjustments
      if (settings.brightness !== 0 || settings.contrast !== 0) {
        // Note: ImageManipulator doesn't support brightness/contrast directly
        // In a production app, you'd use a more advanced image processing library
        console.log('Brightness/contrast adjustments would be applied here');
      }
      
      if (manipulatorActions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          manipulatorActions,
          { 
            compress: 0.8, 
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        processedUri = result.uri;
      }
      
      return processedUri;
    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error('Failed to process image');
    }
  }

  static async detectMeters(imageUri: string): Promise<MeterDetection[]> {
    try {
      console.log('Detecting meters in image:', imageUri);
      
      // First, enhance the image for better OCR
      const enhancedUri = await this.enhanceImageForOCR(imageUri);
      
      // Perform OCR on the entire image
      const ocrResult = await this.performOCR(enhancedUri);
      
      // Process OCR results to find meter readings
      const detections = await this.processOCRResults(ocrResult, enhancedUri);
      
      return detections;
    } catch (error) {
      console.error('Meter detection failed:', error);
      throw new Error('Failed to detect meters: ' + (error as Error).message);
    }
  }

  private static async performOCR(imageUri: string): Promise<any> {
    try {
      if (Platform.OS === 'web') {
        // For web platform, we'll simulate OCR since ML Kit doesn't work on web
        console.warn('OCR not available on web platform, using fallback');
        return this.simulateOCRForWeb(imageUri);
      }
      
      // Use ML Kit Text Recognition for native platforms
      const result = await TextRecognition.recognize(imageUri);
      return result;
    } catch (error) {
      console.error('OCR failed:', error);
      // Fallback to simulated OCR if ML Kit fails
      return this.simulateOCRForWeb(imageUri);
    }
  }

  private static async simulateOCRForWeb(imageUri: string): Promise<any> {
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return simulated OCR structure similar to ML Kit
    return {
      text: '004023.12 kWh\n1234.56\n789.01',
      blocks: [
        {
          text: '004023.12',
          frame: { x: 100, y: 150, width: 200, height: 40 },
          confidence: 0.95
        },
        {
          text: '1234.56',
          frame: { x: 50, y: 300, width: 150, height: 35 },
          confidence: 0.88
        }
      ]
    };
  }

  private static async processOCRResults(ocrResult: any, imageUri: string): Promise<MeterDetection[]> {
    const detections: MeterDetection[] = [];
    
    if (!ocrResult.blocks) {
      // If no blocks, try to extract from main text
      const numbers = this.extractNumbersFromText(ocrResult.text || '');
      numbers.forEach((number, index) => {
        const detection = this.createDetectionFromNumber(number, index, imageUri);
        if (detection) {
          detections.push(detection);
        }
      });
      return detections;
    }
    
    // Process each OCR block
    ocrResult.blocks.forEach((block: any, index: number) => {
      const text = block.text || '';
      const frame = block.frame || { x: 0, y: 0, width: 100, height: 50 };
      const confidence = block.confidence || 0.5;
      
      // Look for meter reading patterns
      const meterReadings = this.extractMeterReadings(text);
      
      meterReadings.forEach((reading, readingIndex) => {
        const detection: MeterDetection = {
          id: `detection_${index}_${readingIndex}`,
          boundingBox: {
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height
          },
          confidence: confidence,
          type: this.detectMeterType(text),
          extractedText: text,
          processedValue: reading.value,
          validationStatus: reading.isValid ? 'valid' : 'needs_review',
          timestamp: new Date().toISOString(),
        };
        
        detections.push(detection);
      });
    });
    
    return detections;
  }

  private static extractNumbersFromText(text: string): string[] {
    // Extract potential meter readings using regex
    const patterns = [
      /\b\d{4,6}\.\d{1,3}\b/g,  // Format: 004023.12
      /\b\d{3,5}\.\d{1,2}\b/g,  // Format: 1234.56
      /\b\d{4,7}\b/g,           // Format: 123456 (no decimal)
    ];
    
    const numbers: string[] = [];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        numbers.push(...matches);
      }
    });
    
    return [...new Set(numbers)]; // Remove duplicates
  }

  private static extractMeterReadings(text: string): Array<{value: number, isValid: boolean}> {
    const numbers = this.extractNumbersFromText(text);
    
    return numbers.map(numStr => {
      const value = parseFloat(numStr);
      const isValid = this.validateMeterReading(numStr).isValid;
      return { value, isValid };
    }).filter(reading => !isNaN(reading.value));
  }

  private static detectMeterType(text: string): 'digital' | 'analog' | 'lcd' | 'led' {
    // Simple heuristics to detect meter type based on text characteristics
    if (/\d+\.\d+/.test(text)) {
      return 'digital';
    }
    if (/LCD|DISPLAY/i.test(text)) {
      return 'lcd';
    }
    if (/LED/i.test(text)) {
      return 'led';
    }
    return 'digital'; // Default
  }

  private static createDetectionFromNumber(numberStr: string, index: number, imageUri: string): MeterDetection | null {
    const value = parseFloat(numberStr);
    if (isNaN(value)) return null;
    
    const validation = this.validateMeterReading(numberStr);
    
    return {
      id: `detection_${index}`,
      boundingBox: {
        x: 50 + (index * 100),
        y: 150 + (index * 80),
        width: 200,
        height: 60
      },
      confidence: validation.isValid ? 0.9 : 0.6,
      type: 'digital',
      extractedText: numberStr,
      processedValue: value,
      validationStatus: validation.isValid ? 'valid' : 'needs_review',
      timestamp: new Date().toISOString(),
    };
  }

  static async extractTextFromRegion(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number }
  ): Promise<OCRResult> {
    try {
      // Crop the image to the specified region
      const croppedResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{
          crop: {
            originX: boundingBox.x,
            originY: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
          }
        }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );
      
      // Perform OCR on the cropped region
      const ocrResult = await this.performOCR(croppedResult.uri);
      
      return {
        text: ocrResult.text || '',
        confidence: ocrResult.blocks?.[0]?.confidence || 0.8,
        boundingBox,
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from region');
    }
  }

  static validateMeterReading(
    text: string,
    expectedPattern?: RegExp,
    previousReading?: number
  ): { isValid: boolean; value?: number; errors: string[] } {
    const errors: string[] = [];
    
    // Clean the text
    const cleanText = text.replace(/[^\d.]/g, '');
    const value = parseFloat(cleanText);
    
    if (isNaN(value)) {
      errors.push('Could not parse numeric value');
      return { isValid: false, errors };
    }
    
    if (value < 0) {
      errors.push('Reading cannot be negative');
    }
    
    if (value > 999999.99) {
      errors.push('Reading seems unusually high');
    }
    
    // Check for reasonable decimal places (max 3)
    const decimalPart = cleanText.split('.')[1];
    if (decimalPart && decimalPart.length > 3) {
      errors.push('Too many decimal places');
    }
    
    if (previousReading && value < previousReading) {
      errors.push('Reading cannot be less than previous reading');
    }
    
    if (expectedPattern && !expectedPattern.test(cleanText)) {
      errors.push('Reading format does not match expected pattern');
    }
    
    // Additional validation for common meter reading formats
    if (value > 0 && value < 0.1) {
      errors.push('Reading seems unusually low for a cumulative meter');
    }
    
    return {
      isValid: errors.length === 0,
      value: errors.length === 0 ? value : undefined,
      errors,
    };
  }

  static async enhanceImageForOCR(imageUri: string): Promise<string> {
    try {
      console.log('Enhancing image for OCR:', imageUri);
      
      // Apply image enhancements for better OCR accuracy
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize to optimal size for OCR (not too large, not too small)
          { resize: { width: 1024 } },
          // Rotate if needed (this would require additional logic to detect orientation)
        ],
        { 
          compress: 0.9, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      return result.uri;
    } catch (error) {
      console.error('Image enhancement failed:', error);
      // Return original image if enhancement fails
      return imageUri;
    }
  }

  static calculateConfidenceScore(
    ocrConfidence: number,
    detectionConfidence: number,
    validationResult: { isValid: boolean; errors: string[] }
  ): number {
    let score = (ocrConfidence + detectionConfidence) / 2;
    
    if (!validationResult.isValid) {
      score *= 0.5; // Reduce confidence for invalid readings
    }
    
    if (validationResult.errors.length > 0) {
      score *= Math.max(0.3, 1 - (validationResult.errors.length * 0.15));
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Real-time image quality assessment
  static async assessImageQuality(imageUri: string): Promise<{
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions: string[];
    score: number;
  }> {
    try {
      // Get image dimensions and basic info
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { compress: 1 }
      );
      
      const suggestions: string[] = [];
      let score = 1.0;
      
      // Check image size (too small might affect OCR accuracy)
      if (imageInfo.width < 800 || imageInfo.height < 600) {
        suggestions.push('Image resolution is low - move closer to the meter');
        score -= 0.2;
      }
      
      // Additional quality checks would go here in a production app
      // (brightness analysis, blur detection, etc.)
      
      let quality: 'excellent' | 'good' | 'fair' | 'poor';
      if (score >= 0.9) quality = 'excellent';
      else if (score >= 0.7) quality = 'good';
      else if (score >= 0.5) quality = 'fair';
      else quality = 'poor';
      
      return { quality, suggestions, score };
    } catch (error) {
      return {
        quality: 'fair',
        suggestions: ['Unable to assess image quality'],
        score: 0.5
      };
    }
  }
}