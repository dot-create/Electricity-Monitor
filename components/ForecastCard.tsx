import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Brain, Calendar } from 'lucide-react-native';
import { UsageForecast } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface ForecastCardProps {
  forecast: UsageForecast;
  meterName: string;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast, meterName }) => {
  const { colors } = useTheme();
  
  const getConfidenceColor = () => {
    if (forecast.confidence >= 80) return colors.success;
    if (forecast.confidence >= 60) return colors.warning;
    return colors.error;
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Brain size={20} color={colors.primary} />
        <Text style={styles.title}>Usage Forecast - {meterName}</Text>
      </View>

      <View style={styles.predictions}>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>Next Week</Text>
          <Text style={styles.predictionValue}>
            {forecast.nextWeekPrediction.toFixed(1)} kWh
          </Text>
        </View>
        <View style={styles.predictionItem}>
          <Text style={styles.predictionLabel}>Next Month</Text>
          <Text style={styles.predictionValue}>
            {forecast.nextMonthPrediction.toFixed(1)} kWh
          </Text>
        </View>
      </View>

      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>Prediction Confidence</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              { 
                width: `${forecast.confidence}%`,
                backgroundColor: getConfidenceColor()
              }
            ]}
          />
        </View>
        <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
          {forecast.confidence}%
        </Text>
      </View>

      <View style={styles.factorsContainer}>
        <Text style={styles.factorsTitle}>Prediction Factors:</Text>
        {forecast.factors.map((factor, index) => (
          <Text key={index} style={styles.factorText}>
            • {factor}
          </Text>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  predictions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  predictionItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  factorsContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  factorText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
});