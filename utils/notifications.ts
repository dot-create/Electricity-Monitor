import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { UsageCalculator } from './calculations';
import { Meter, Reading } from '@/types';

export class NotificationManager {
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Meter Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleReminder(hour: number, minute: number): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Meter Reading Reminder',
          body: 'Don\'t forget to log your electricity meter readings today!',
          sound: 'default',
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }

  static async showLimitAlert(
    meterName: string,
    usage: number,
    limit: number,
    type: 'daily' | 'monthly'
  ): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      const percentage = ((usage - limit) / limit * 100).toFixed(1);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${type === 'daily' ? 'Daily' : 'Monthly'} Limit Exceeded`,
          body: `${meterName}: ${usage.toFixed(1)} kWh (${percentage}% over ${limit} kWh limit)`,
          sound: 'default',
          data: {
            type: 'limit_exceeded',
            meterName,
            usage,
            limit,
            period: type,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing limit alert:', error);
    }
  }

  static async checkAndNotifyLimits(
    meters: Meter[],
    readings: Reading[],
    notificationSettings: any
  ): Promise<void> {
    if (!notificationSettings.enabled || Platform.OS === 'web') {
      return;
    }

    for (const meter of meters) {
      const stats = UsageCalculator.getUsageStats(readings, meter.id);

      if (notificationSettings.dailyLimit && meter.limits.daily > 0) {
        const todayUsage = this.getTodayUsage(readings, meter.id);
        if (todayUsage > meter.limits.daily) {
          await this.showLimitAlert(meter.name, todayUsage, meter.limits.daily, 'daily');
        }
      }

      if (notificationSettings.monthlyLimit && meter.limits.monthly > 0) {
        if (stats.currentMonthTotal > meter.limits.monthly) {
          await this.showLimitAlert(
            meter.name,
            stats.currentMonthTotal,
            meter.limits.monthly,
            'monthly'
          );
        }
      }
    }
  }

  private static getTodayUsage(readings: Reading[], meterId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const todayReading = readings.find(r => r.meterId === meterId && r.date === today);
    return todayReading ? todayReading.units : 0;
  }
}