export interface Meter {
  id: string;
  name: string;
  location: string;
  meterId?: string;
  createdDate: string;
  limits: {
    daily: number;
    monthly: number;
  };
}

export interface Reading {
  id: string;
  meterId: string;
  date: string;
  units: number;
  timestamp: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyLimit: boolean;
  monthlyLimit: boolean;
  reminderTime: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
}

export interface UsageStats {
  currentWeekTotal: number;
  currentMonthTotal: number;
  dailyAverage: number;
  monthlyChange: number;
}