import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TriangleAlert as AlertTriangle, X, Info, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface NotificationCardProps {
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  onDismiss: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  title,
  message,
  type,
  onDismiss,
}) => {
  const { colors } = useTheme();
  
  const getTypeColor = () => {
    switch (type) {
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      default: return colors.primary;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const Icon = getIcon();
  const styles = createStyles(colors, getTypeColor());

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon size={20} color={getTypeColor()} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any, typeColor: string) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: typeColor,
    marginVertical: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});