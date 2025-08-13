import React from 'react';
import { View, StyleSheet, Dimensions, Text, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/hooks/useTheme';
import { UsageCalculator } from '@/utils/calculations';
import { Reading } from '@/types';

interface ReadingChartProps {
  readings: Reading[];
  meterId: string;
  days?: number;
}

export const ReadingChart: React.FC<ReadingChartProps> = ({
  readings,
  meterId,
  days = 7,
}) => {
  const { colors } = useTheme();

  const chartData = UsageCalculator.getChartData(readings, meterId, days);

  if (chartData.data.every(value => value === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No readings available for chart
        </Text>
      </View>
    );
  }

  // Default screen width (with 32 padding for margins)
  const screenWidth = Dimensions.get('window').width - 32;
  // Wider width for 30-day scrollable chart
  const chartWidth = days === 30 ? screenWidth * 3 : screenWidth - 20;

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Usage Trend ({days} days)
      </Text>

      {days === 30 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  data: chartData.data,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix=" kWh"
            withHorizontalLabels
            withVerticalLabels
            withDots
            withShadow={false}
          />
        </ScrollView>
      ) : (
        <LineChart
          data={{
            labels: chartData.labels,
            datasets: [
              {
                data: chartData.data,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                strokeWidth: 2,
              },
            ],
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix=" kWh"
          withHorizontalLabels
          withVerticalLabels
          withDots
          withShadow={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 40,
  },
});
