import AsyncStorage from '@react-native-async-storage/async-storage';
import { Meter, Reading, AppSettings, MaintenanceRecord, EnergyGoal } from '@/types';

const STORAGE_KEYS = {
  METERS: '@meters',
  READINGS: '@readings',
  SETTINGS: '@settings',
  MAINTENANCE: '@maintenance',
  GOALS: '@goals',
  BACKUP_TIMESTAMP: '@backup_timestamp',
  USER_PREFERENCES: '@user_preferences',
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
      await this.updateBackupTimestamp();
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
      await this.updateBackupTimestamp();
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
          weeklyReport: true,
          monthlyReport: true,
          unusualUsage: true,
          maintenanceReminders: true,
        },
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        units: 'kWh',
        autoBackup: true,
        biometricAuth: false,
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
          weeklyReport: true,
          monthlyReport: true,
          unusualUsage: true,
          maintenanceReminders: true,
        },
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        units: 'kWh',
        autoBackup: true,
        biometricAuth: false,
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

  static async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading maintenance records:', error);
      return [];
    }
  }

  static async saveMaintenanceRecords(records: MaintenanceRecord[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving maintenance records:', error);
      throw error;
    }
  }

  static async getEnergyGoals(): Promise<EnergyGoal[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading energy goals:', error);
      return [];
    }
  }

  static async saveEnergyGoals(goals: EnergyGoal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving energy goals:', error);
      throw error;
    }
  }

  static async updateBackupTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
    } catch (error) {
      console.error('Error updating backup timestamp:', error);
    }
  }

  static async getLastBackupTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_TIMESTAMP);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting backup timestamp:', error);
      return null;
    }
  }

  static async exportData(): Promise<string> {
    try {
      const meters = await this.getMeters();
      const readings = await this.getReadings();
      const settings = await this.getSettings();
      const maintenance = await this.getMaintenanceRecords();
      const goals = await this.getEnergyGoals();
      
      return JSON.stringify({
        version: '2.0',
        meters,
        readings,
        settings,
        maintenance,
        goals,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      }, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.version || !data.exportDate) {
        throw new Error('Invalid backup file format');
      }
      
      if (data.meters) await this.saveMeters(data.meters);
      if (data.readings) await this.saveReadings(data.readings);
      if (data.settings) await this.saveSettings(data.settings);
      if (data.maintenance) await this.saveMaintenanceRecords(data.maintenance);
      if (data.goals) await this.saveEnergyGoals(data.goals);
      
      await this.updateBackupTimestamp();
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
        STORAGE_KEYS.MAINTENANCE,
        STORAGE_KEYS.GOALS,
        STORAGE_KEYS.BACKUP_TIMESTAMP,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  static async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      let totalSize = 0;
      
      stores.forEach(([key, value]) => {
        if (value) {
          totalSize += new Blob([value]).size;
        }
      });
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }
}