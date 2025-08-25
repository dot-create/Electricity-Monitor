import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export class CameraUtils {
  static async requestPermissions(): Promise<{
    camera: boolean;
    mediaLibrary: boolean;
  }> {
    try {
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      const mediaResult = await MediaLibrary.requestPermissionsAsync();
      
      return {
        camera: cameraResult.status === 'granted',
        mediaLibrary: mediaResult.status === 'granted',
      };
    } catch (error) {
      console.error('Permission request failed:', error);
      return { camera: false, mediaLibrary: false };
    }
  }

  static async captureImage(): Promise<string | null> {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.camera) {
        throw new Error('Camera permission not granted');
      }

      // Show helpful tip for better results
      Alert.alert(
        'Camera Tips',
        '📸 For best results:\n• Ensure good lighting\n• Keep meter display centered\n• Hold camera steady\n• Clean meter display if dirty'
      );

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const imageUri = result.assets[0].uri;
      
      // Optionally enhance the image immediately after capture
      try {
        const enhanced = await this.enhanceImageForOCR(imageUri);
        return enhanced;
      } catch (error) {
        console.warn('Image enhancement failed, using original:', error);
        return imageUri;
      }
    } catch (error) {
      console.error('Image capture failed:', error);
      throw new Error('Failed to capture image');
    }
  }

  static async pickImageFromLibrary(): Promise<string | null> {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.mediaLibrary) {
        throw new Error('Media library permission not granted');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const imageUri = result.assets[0].uri;
      
      // Optionally enhance the image
      try {
        const enhanced = await this.enhanceImageForOCR(imageUri);
        return enhanced;
      } catch (error) {
        console.warn('Image enhancement failed, using original:', error);
        return imageUri;
      }
    } catch (error) {
      console.error('Image selection failed:', error);
      throw new Error('Failed to select image');
    }
  }

  static async saveImageToLibrary(imageUri: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return; // Cannot save to library on web
      }

      const permissions = await this.requestPermissions();
      
      if (!permissions.mediaLibrary) {
        throw new Error('Media library permission not granted');
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
    } catch (error) {
      console.error('Failed to save image:', error);
      throw new Error('Failed to save image to library');
    }
  }

  static async enhanceImageForOCR(imageUri: string): Promise<string> {
    try {
      // Apply basic enhancements for better OCR
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          // Resize to optimal size for OCR processing
          { resize: { width: 1024 } }
        ],
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      return result.uri;
    } catch (error) {
      console.error('Failed to enhance image:', error);
      return imageUri; // Return original if enhancement fails
    }
  }

  static getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = imageUri;
      } else {
        // For native platforms, you would use a native image library
        resolve({ width: 1920, height: 1080 }); // Mock dimensions
      }
    });
  }
}