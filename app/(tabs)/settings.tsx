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
  TextInput,
  Modal,
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
  Shield,
  Clock,
  Globe,
  Database,
  X,
  Save,
  DollarSign,
  Calendar,
  Settings
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { StorageManager } from '@/utils/storage';
import { NotificationManager } from '@/utils/notifications';
import { useMeters } from '@/hooks/useMeters';
import { useReadings } from '@/hooks/useReadings';
import { AppSettings } from '@/types';

export default function SettingsScreen() {
  const { colors, theme, updateTheme } = useTheme();
  const { meters } = useMeters();
  const { readings } = useReadings();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [notificationPermissions, setNotificationPermissions] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [storageSize, setStorageSize] = useState(0);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
    loadStorageInfo();
  }, []);

  const loadSettings = async () => {
    const appSettings = await StorageManager.getSettings();
    setSettings(appSettings);
  };

  const loadStorageInfo = async () => {
    const size = await StorageManager.getStorageSize();
    const backup = await StorageManager.getLastBackupTime();
    setStorageSize(size);
    setLastBackup(backup);
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

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Weekly Reports</Text>
            </View>
            <Switch
              value={settings.notifications.weeklyReport}
              onValueChange={(value) =>
                updateSettings({
                  notifications: { ...settings.notifications, weeklyReport: value }
                })
              }
              disabled={!settings.notifications.enabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Unusual Usage Alerts</Text>
            </View>
            <Switch
              value={settings.notifications.unusualUsage}
              onValueChange={(value) =>
                updateSettings({
                  notifications: { ...settings.notifications, unusualUsage: value }
                })
              }
              disabled={!settings.notifications.enabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
              const currentIndex = currencies.indexOf(settings.currency);
              const nextCurrency = currencies[(currentIndex + 1) % currencies.length];
              updateSettings({ currency: nextCurrency });
            }}
          >
            <View style={styles.settingLeft}>
              <DollarSign size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings.currency}</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              const formats: ('MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD')[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
              const currentIndex = formats.indexOf(settings.dateFormat);
              const nextFormat = formats[(currentIndex + 1) % formats.length];
              updateSettings({ dateFormat: nextFormat });
            }}
          >
            <View style={styles.settingLeft}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Date Format</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings.dateFormat}</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Database size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Auto Backup</Text>
            </View>
            <Switch
              value={settings.autoBackup}
              onValueChange={(value) => updateSettings({ autoBackup: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.background}
            />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.storageInfo}>
            <Text style={styles.storageLabel}>Storage Used</Text>
            <Text style={styles.storageValue}>
              {(storageSize / 1024).toFixed(1)} KB
            </Text>
            {lastBackup && (
              <Text style={styles.lastBackupText}>
                Last backup: {lastBackup.toLocaleDateString()}
              </Text>
            )}
          </View>

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

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowAdvancedSettings(true)}
          >
            <View style={styles.settingLeft}>
              <Settings size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Advanced Settings</Text>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showAdvancedSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdvancedSettings(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Advanced Settings</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Shield size={20} color={colors.primary} />
                  <Text style={styles.settingLabel}>Biometric Authentication</Text>
                </View>
                <Switch
                  value={settings?.biometricAuth || false}
                  onValueChange={(value) => updateSettings({ biometricAuth: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance</Text>
              
              <View style={styles.performanceInfo}>
                <Text style={styles.performanceLabel}>App Performance</Text>
                <Text style={styles.performanceValue}>Excellent</Text>
                <Text style={styles.performanceDetail}>
                  {meters.length} meters, {readings.length} readings
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  storageInfo: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storageLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  storageValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  lastBackupText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  performanceInfo: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  performanceLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  performanceDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});