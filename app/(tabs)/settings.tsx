import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Share,
  Platform,
} from 'react-native';
import {
  Bell,
  Moon,
  Sun,
  Smartphone,
  Download,
  Upload,
  Trash2,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { StorageManager } from '@/utils/storage';
import { NotificationManager } from '@/utils/notifications';
import { AppSettings } from '@/types';

export default function SettingsScreen() {
  const { colors, theme, updateTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [notificationPermissions, setNotificationPermissions] = useState(false);

  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
  }, []);

  const loadSettings = async () => {
    const appSettings = await StorageManager.getSettings();
    setSettings(appSettings);
  };

  const checkNotificationPermissions = async () => {
    const hasPermissions = await NotificationManager.requestPermissions();
    setNotificationPermissions(hasPermissions);
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    
    const newSettings = { ...settings, ...updates };
    await StorageManager.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleExportData = async () => {
    try {
      const jsonData = await StorageManager.exportData();
      
      if (Platform.OS === 'web') {
        // For web, we'll just show the data in an alert
        Alert.alert('Export Data', 'Data exported successfully to console');
        console.log('Exported Data:', jsonData);
      } else {
        await Share.share({
          message: jsonData,
          title: 'Electricity Meter Data Export',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'To import data, please paste your exported JSON data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            // In a real app, you'd show a text input modal here
            Alert.alert('Info', 'Import functionality would open a data input interface');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your meters and readings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageManager.clearAllData();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark': return Moon;
      case 'light': return Sun;
      default: return Smartphone;
    }
  };

  const ThemeIcon = getThemeIcon();
  const styles = createStyles(colors);

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
              const currentIndex = themes.indexOf(settings.theme);
              const nextTheme = themes[(currentIndex + 1) % themes.length];
              updateTheme(nextTheme);
              updateSettings({ theme: nextTheme });
            }}
          >
            <View style={styles.settingLeft}>
              <ThemeIcon size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Theme</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
              </Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Bell size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Enable Notifications</Text>
            </View>
            <Switch
              value={settings.notifications.enabled && notificationPermissions}
              onValueChange={async (value) => {
                if (value && !notificationPermissions) {
                  const granted = await NotificationManager.requestPermissions();
                  setNotificationPermissions(granted);
                  if (!granted) {
                    Alert.alert(
                      'Permission Required',
                      'Please enable notifications in your device settings to receive alerts.'
                    );
                    return;
                  }
                }
                
                updateSettings({
                  notifications: { ...settings.notifications, enabled: value }
                });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Daily Limit Alerts</Text>
            </View>
            <Switch
              value={settings.notifications.dailyLimit}
              onValueChange={(value) =>
                updateSettings({
                  notifications: { ...settings.notifications, dailyLimit: value }
                })
              }
              disabled={!settings.notifications.enabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Monthly Limit Alerts</Text>
            </View>
            <Switch
              value={settings.notifications.monthlyLimit}
              onValueChange={(value) =>
                updateSettings({
                  notifications: { ...settings.notifications, monthlyLimit: value }
                })
              }
              disabled={!settings.notifications.enabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleExportData}
          >
            <View style={styles.settingLeft}>
              <Download size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Export Data</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleImportData}
          >
            <View style={styles.settingLeft}>
              <Upload size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Import Data</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleClearData}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.settingLabel, { color: colors.error }]}>
                Clear All Data
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Info size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Version</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
});