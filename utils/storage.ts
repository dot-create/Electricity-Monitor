import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meter, Reading, AppSettings } from '@/types';

const STORAGE_KEYS = {
  METERS: '@meters',
  READINGS: '@readings',
  SETTINGS: '@settings',
};

export class StorageManager {
  static async getMeters(): Promise<Meter[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.METERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading meters:', error);
      return [];
    }
  }

  static async saveMeters(meters: Meter[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.METERS, JSON.stringify(meters));
    } catch (error) {
      console.error('Error saving meters:', error);
      throw error;
    }
  }

  static async getReadings(): Promise<Reading[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.READINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading readings:', error);
      return [];
    }
  }

  static async saveReadings(readings: Reading[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify(readings));
    } catch (error) {
      console.error('Error saving readings:', error);
      throw error;
    }
  }

  static async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        theme: 'system',
        notifications: {
          enabled: true,
          dailyLimit: true,
          monthlyLimit: true,
          reminderTime: '20:00',
        },
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        theme: 'system',
        notifications: {
          enabled: true,
          dailyLimit: true,
          monthlyLimit: true,
          reminderTime: '20:00',
        },
      };
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  static async exportData(): Promise<string> {
    try {
      const meters = await this.getMeters();
      const readings = await this.getReadings();
      const settings = await this.getSettings();
      
      return JSON.stringify({
        meters,
        readings,
        settings,
        exportDate: new Date().toISOString(),
      }, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.meters) await this.saveMeters(data.meters);
      if (data.readings) await this.saveReadings(data.readings);
      if (data.settings) await this.saveSettings(data.settings);
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.METERS,
        STORAGE_KEYS.READINGS,
        STORAGE_KEYS.SETTINGS,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}