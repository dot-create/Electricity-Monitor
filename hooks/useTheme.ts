import { useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { StorageManager } from '@/utils/storage';
import { AppSettings } from '@/types';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const appSettings = await StorageManager.getSettings();
      setSettings(appSettings);
      updateTheme(appSettings.theme);
    };

    const updateTheme = (themePreference: 'light' | 'dark' | 'system') => {
      if (themePreference === 'system') {
        const systemTheme = Appearance.getColorScheme() || 'light';
        setTheme(systemTheme);
      } else {
        setTheme(themePreference);
      }
    };

    loadSettings();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (settings?.theme === 'system') {
        setTheme(colorScheme || 'light');
      }
    });

    return () => subscription?.remove();
  }, [settings?.theme]);

  const updateThemePreference = async (newTheme: 'light' | 'dark' | 'system') => {
    if (settings) {
      const updatedSettings = { ...settings, theme: newTheme };
      await StorageManager.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    }
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return {
    theme,
    colors,
    isDark: theme === 'dark',
    updateTheme: updateThemePreference,
  };
};

const lightColors = {
  primary: '#2563EB',
  secondary: '#059669',
  accent: '#EA580C',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const darkColors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F97316',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  background: '#111827',
  surface: '#1F2937',
  card: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#4B5563',
  shadow: 'rgba(0, 0, 0, 0.3)',
};