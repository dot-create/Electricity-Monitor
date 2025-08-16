import { Reading, UsageForecast, UsagePattern } from '@/types';
import { UsageCalculator } from './calculations';

export class ForecastingEngine {
  static generateForecast(readings: Reading[], meterId: string): UsageForecast {
    const meterReadings = readings.filter(r => r.meterId === meterId);
    const readingsWithConsumption = UsageCalculator.calculateConsumption(meterReadings);
    
    if (readingsWithConsumption.length < 7) {
      return {
        nextWeekPrediction: 0,
        nextMonthPrediction: 0,
        confidence: 0,
        factors: ['Insufficient data for accurate prediction'],
      };
    }

    const recentReadings = readingsWithConsumption
      .filter(r => r.consumption && r.consumption > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    const weeklyAverage = this.calculateWeeklyAverage(recentReadings);
    const monthlyAverage = this.calculateMonthlyAverage(recentReadings);
    const trend = this.calculateTrend(recentReadings);
    const seasonality = this.calculateSeasonality(recentReadings);
    
    const nextWeekPrediction = weeklyAverage * (1 + trend + seasonality);
    const nextMonthPrediction = monthlyAverage * (1 + trend + seasonality);
    
    const confidence = this.calculateConfidence(recentReadings);
    const factors = this.identifyFactors(recentReadings, trend, seasonality);

    return {
      nextWeekPrediction: Math.max(0, nextWeekPrediction),
      nextMonthPrediction: Math.max(0, nextMonthPrediction),
      confidence,
      factors,
    };
  }

  private static calculateWeeklyAverage(readings: Reading[]): number {
    const weeklyTotals: number[] = [];
    const groupedByWeek = this.groupReadingsByWeek(readings);
    
    Object.values(groupedByWeek).forEach(weekReadings => {
      const weekTotal = weekReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
      if (weekTotal > 0) weeklyTotals.push(weekTotal);
    });

    return weeklyTotals.length > 0 
      ? weeklyTotals.reduce((sum, total) => sum + total, 0) / weeklyTotals.length 
      : 0;
  }

  private static calculateMonthlyAverage(readings: Reading[]): number {
    const monthlyTotals: number[] = [];
    const groupedByMonth = this.groupReadingsByMonth(readings);
    
    Object.values(groupedByMonth).forEach(monthReadings => {
      const monthTotal = monthReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
      if (monthTotal > 0) monthlyTotals.push(monthTotal);
    });

    return monthlyTotals.length > 0 
      ? monthlyTotals.reduce((sum, total) => sum + total, 0) / monthlyTotals.length 
      : 0;
  }

  private static calculateTrend(readings: Reading[]): number {
    if (readings.length < 14) return 0;

    const recent = readings.slice(0, 7);
    const previous = readings.slice(7, 14);

    const recentAvg = recent.reduce((sum, r) => sum + (r.consumption || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, r) => sum + (r.consumption || 0), 0) / previous.length;

    return previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;
  }

  private static calculateSeasonality(readings: Reading[]): number {
    const currentMonth = new Date().getMonth();
    const monthlyAverages: Record<number, number> = {};
    
    readings.forEach(reading => {
      const month = new Date(reading.date).getMonth();
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = 0;
      }
      monthlyAverages[month] += reading.consumption || 0;
    });

    const overallAverage = Object.values(monthlyAverages).reduce((sum, avg) => sum + avg, 0) / Object.keys(monthlyAverages).length;
    const currentMonthAverage = monthlyAverages[currentMonth] || overallAverage;

    return overallAverage > 0 ? (currentMonthAverage - overallAverage) / overallAverage : 0;
  }

  private static calculateConfidence(readings: Reading[]): number {
    const dataPoints = readings.length;
    const consistency = this.calculateConsistency(readings);
    const recency = this.calculateRecency(readings);
    
    let confidence = 0;
    
    // Data quantity factor (0-40%)
    confidence += Math.min(dataPoints / 30, 1) * 40;
    
    // Consistency factor (0-30%)
    confidence += consistency * 30;
    
    // Recency factor (0-30%)
    confidence += recency * 30;
    
    return Math.round(confidence);
  }

  private static calculateConsistency(readings: Reading[]): number {
    if (readings.length < 7) return 0;

    const consumptions = readings
      .map(r => r.consumption || 0)
      .filter(c => c > 0);

    if (consumptions.length === 0) return 0;

    const mean = consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
    const variance = consumptions.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / consumptions.length;
    const standardDeviation = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private static calculateRecency(readings: Reading[]): number {
    if (readings.length === 0) return 0;

    const latestReading = readings[0];
    const daysSinceLatest = (Date.now() - new Date(latestReading.date).getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.max(0, 1 - (daysSinceLatest / 7));
  }

  private static identifyFactors(readings: Reading[], trend: number, seasonality: number): string[] {
    const factors: string[] = [];

    if (Math.abs(trend) > 0.1) {
      factors.push(trend > 0 ? 'Increasing usage trend' : 'Decreasing usage trend');
    }

    if (Math.abs(seasonality) > 0.1) {
      factors.push(seasonality > 0 ? 'Higher seasonal usage' : 'Lower seasonal usage');
    }

    if (readings.length >= 30) {
      factors.push('Sufficient historical data');
    } else {
      factors.push('Limited historical data');
    }

    const consistency = this.calculateConsistency(readings);
    if (consistency > 0.8) {
      factors.push('Consistent usage patterns');
    } else if (consistency < 0.5) {
      factors.push('Variable usage patterns');
    }

    return factors;
  }

  private static groupReadingsByWeek(readings: Reading[]): Record<string, Reading[]> {
    return readings.reduce((groups, reading) => {
      const date = new Date(reading.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay() + 1));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(reading);
      
      return groups;
    }, {} as Record<string, Reading[]>);
  }

  private static groupReadingsByMonth(readings: Reading[]): Record<string, Reading[]> {
    return readings.reduce((groups, reading) => {
      const date = new Date(reading.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(reading);
      
      return groups;
    }, {} as Record<string, Reading[]>);
  }

  static analyzeUsagePatterns(readings: Reading[], meterId: string): UsagePattern[] {
    const meterReadings = readings.filter(r => r.meterId === meterId);
    const readingsWithConsumption = UsageCalculator.calculateConsumption(meterReadings);
    
    const patterns: Record<string, { total: number; count: number; peak: number }> = {};
    
    readingsWithConsumption.forEach(reading => {
      if (!reading.consumption || reading.consumption <= 0) return;
      
      const date = new Date(reading.date);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      const key = `${dayOfWeek}-${hour}`;
      
      if (!patterns[key]) {
        patterns[key] = { total: 0, count: 0, peak: 0 };
      }
      
      patterns[key].total += reading.consumption;
      patterns[key].count += 1;
      patterns[key].peak = Math.max(patterns[key].peak, reading.consumption);
    });

    return Object.entries(patterns).map(([key, data]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return {
        dayOfWeek,
        hour,
        averageUsage: data.total / data.count,
        peakUsage: data.peak,
        efficiency: data.peak > 0 ? (data.total / data.count) / data.peak : 0,
      };
    });
  }

  static getUsageRecommendations(readings: Reading[], meterId: string): string[] {
    const patterns = this.analyzeUsagePatterns(readings, meterId);
    const recommendations: string[] = [];
    
    // Analyze peak usage times
    const peakHours = patterns
      .filter(p => p.averageUsage > 0)
      .sort((a, b) => b.averageUsage - a.averageUsage)
      .slice(0, 3);
    
    if (peakHours.length > 0) {
      const peakHour = peakHours[0];
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][peakHour.dayOfWeek];
      recommendations.push(`Peak usage occurs on ${dayName}s around ${peakHour.hour}:00. Consider shifting non-essential appliances to off-peak hours.`);
    }

    // Analyze efficiency
    const lowEfficiencyPatterns = patterns.filter(p => p.efficiency < 0.5 && p.averageUsage > 0);
    if (lowEfficiencyPatterns.length > 0) {
      recommendations.push('Some usage patterns show low efficiency. Consider energy-saving appliances or better scheduling.');
    }

    // Analyze consistency
    const recentReadings = readings
      .filter(r => r.meterId === meterId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
    
    const consistency = this.calculateConsistency(recentReadings);
    if (consistency < 0.6) {
      recommendations.push('Your usage varies significantly. Consider establishing more consistent energy habits for better cost control.');
    }

    return recommendations;
  }
}