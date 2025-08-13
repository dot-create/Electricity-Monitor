import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { UsageCalculator } from './calculations';
import { Meter, Reading, NotificationSettings } from '@/types';

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

  static async scheduleWeeklyReport(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Usage Report',
          body: 'Check your weekly electricity usage summary in the app',
          sound: 'default',
        },
        trigger: {
          weekday: 1, // Monday
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });
    } catch (error) {
      console.error('Error scheduling weekly report:', error);
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

  static async showTrendAlert(
    meterName: string,
    trend: 'increasing' | 'decreasing',
    percentage: number
  ): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        return;
      }

      const message = trend === 'increasing' 
        ? `${meterName}: Usage increased by ${percentage.toFixed(1)}% this week`
        : `${meterName}: Usage decreased by ${Math.abs(percentage).toFixed(1)}% this week`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Usage Trend Alert`,
          body: message,
          sound: 'default',
          data: {
            type: 'trend_alert',
            meterName,
            trend,
            percentage,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing trend alert:', error);
    }
  }

  static async checkAndNotifyLimits(
    meters: Meter[],
    readings: Reading[],
    notificationSettings: NotificationSettings
  ): Promise<void> {
    if (!notificationSettings.enabled || Platform.OS === 'web') {
      return;
    }

    for (const meter of meters) {
      const stats = UsageCalculator.getUsageStats(readings, meter.id);
      const todayConsumption = UsageCalculator.getTodayConsumption(readings, meter.id);

      if (notificationSettings.dailyLimit && meter.limits.daily > 0) {
        if (todayConsumption > meter.limits.daily) {
          await this.showLimitAlert(meter.name, todayConsumption, meter.limits.daily, 'daily');
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

  static async checkAndNotifyTrends(
    meters: Meter[],
    readings: Reading[]
  ): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    for (const meter of meters) {
      const trend = UsageCalculator.getConsumptionTrend(readings, meter.id, 7);
      
      if (trend === 'increasing') {
        const currentWeek = UsageCalculator.getWeeklyTotal(readings, meter.id);
        const lastWeek = this.getLastWeekTotal(readings, meter.id);
        
        if (lastWeek > 0) {
          const percentage = ((currentWeek - lastWeek) / lastWeek) * 100;
          if (percentage > 20) { // Only notify for significant increases
            await this.showTrendAlert(meter.name, 'increasing', percentage);
          }
        }
      }
    }
  }

  private static getLastWeekTotal(readings: Reading[], meterId: string): number {
    const now = new Date();
    const startOfLastWeek = new Date(now.setDate(now.getDate() - now.getDay() - 6));
    const endOfLastWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfLastWeek.setHours(0, 0, 0, 0);
    endOfLastWeek.setHours(23, 59, 59, 999);

    const readingsWithConsumption = UsageCalculator.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        return reading.meterId === meterId && 
               readingDate >= startOfLastWeek && 
               readingDate <= endOfLastWeek;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }
}