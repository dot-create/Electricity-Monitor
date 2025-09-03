import { Reading, Meter, EnergyEfficiencyTip } from '@/types';

export class EnergyEfficiencyAnalyzer {
  private static tips: EnergyEfficiencyTip[] = [
    {
      id: 'led_lighting',
      category: 'lighting',
      title: 'Switch to LED Lighting',
      description: 'Replace incandescent and CFL bulbs with LED bulbs to reduce lighting energy consumption by up to 80%.',
      potentialSavings: 15,
      difficulty: 'easy',
      estimatedCost: 50,
      paybackPeriod: 6,
    },
    {
      id: 'smart_thermostat',
      category: 'heating',
      title: 'Install Smart Thermostat',
      description: 'Programmable thermostats can reduce heating and cooling costs by automatically adjusting temperature when you\'re away.',
      potentialSavings: 23,
      difficulty: 'medium',
      estimatedCost: 200,
      paybackPeriod: 12,
    },
    {
      id: 'energy_star_appliances',
      category: 'appliances',
      title: 'Upgrade to Energy Star Appliances',
      description: 'Energy Star certified appliances use 10-50% less energy than standard models.',
      potentialSavings: 30,
      difficulty: 'hard',
      estimatedCost: 1500,
      paybackPeriod: 36,
    },
    {
      id: 'unplug_devices',
      category: 'general',
      title: 'Unplug Unused Electronics',
      description: 'Many devices consume power even when turned off. Unplug chargers, TVs, and other electronics when not in use.',
      potentialSavings: 8,
      difficulty: 'easy',
      estimatedCost: 0,
      paybackPeriod: 0,
    },
    {
      id: 'insulation_upgrade',
      category: 'heating',
      title: 'Improve Home Insulation',
      description: 'Better insulation reduces heating and cooling needs, especially in attics, walls, and basements.',
      potentialSavings: 25,
      difficulty: 'hard',
      estimatedCost: 2500,
      paybackPeriod: 48,
    },
    {
      id: 'water_heater_timer',
      category: 'heating',
      title: 'Install Water Heater Timer',
      description: 'Timer controls can reduce water heating costs by heating water only when needed.',
      potentialSavings: 12,
      difficulty: 'medium',
      estimatedCost: 100,
      paybackPeriod: 8,
    },
  ];

  static analyzeUsagePatterns(readings: Reading[], meter: Meter): {
    insights: string[];
    recommendations: EnergyEfficiencyTip[];
    potentialSavings: number;
  } {
    const insights: string[] = [];
    const recommendations: EnergyEfficiencyTip[] = [];
    let potentialSavings = 0;

    // Analyze usage patterns
    const recentReadings = readings
      .filter(r => r.meterId === meter.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    if (recentReadings.length < 7) {
      insights.push('Need more data for comprehensive analysis');
      return { insights, recommendations, potentialSavings };
    }

    // Calculate average daily usage
    const totalConsumption = recentReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
    const averageDaily = totalConsumption / recentReadings.length;

    // High usage analysis
    if (averageDaily > 30) {
      insights.push('High daily usage detected - consider energy efficiency upgrades');
      recommendations.push(...this.tips.filter(t => t.potentialSavings > 20));
      potentialSavings += 25;
    } else if (averageDaily > 20) {
      insights.push('Moderate usage - some efficiency improvements possible');
      recommendations.push(...this.tips.filter(t => t.difficulty === 'easy' || t.difficulty === 'medium'));
      potentialSavings += 15;
    } else {
      insights.push('Good energy efficiency - minor optimizations available');
      recommendations.push(...this.tips.filter(t => t.difficulty === 'easy'));
      potentialSavings += 8;
    }

    // Peak usage analysis
    const peakUsage = Math.max(...recentReadings.map(r => r.consumption || 0));
    if (peakUsage > averageDaily * 2) {
      insights.push('High peak usage detected - check for energy-intensive appliances');
      recommendations.push(this.tips.find(t => t.id === 'smart_thermostat')!);
    }

    // Weekend vs weekday analysis
    const weekdayReadings = recentReadings.filter(r => {
      const day = new Date(r.date).getDay();
      return day >= 1 && day <= 5;
    });
    
    const weekendReadings = recentReadings.filter(r => {
      const day = new Date(r.date).getDay();
      return day === 0 || day === 6;
    });

    if (weekendReadings.length > 0 && weekdayReadings.length > 0) {
      const weekdayAvg = weekdayReadings.reduce((sum, r) => sum + (r.consumption || 0), 0) / weekdayReadings.length;
      const weekendAvg = weekendReadings.reduce((sum, r) => sum + (r.consumption || 0), 0) / weekendReadings.length;
      
      if (weekendAvg > weekdayAvg * 1.3) {
        insights.push('Higher weekend usage - consider programmable devices');
        recommendations.push(this.tips.find(t => t.id === 'unplug_devices')!);
      }
    }

    // Remove duplicates and limit recommendations
    const uniqueRecommendations = recommendations.filter((tip, index, self) => 
      index === self.findIndex(t => t.id === tip.id)
    ).slice(0, 3);

    return {
      insights,
      recommendations: uniqueRecommendations,
      potentialSavings: Math.min(potentialSavings, 40), // Cap at 40%
    };
  }

  static calculatePotentialSavings(
    currentMonthlyBill: number,
    tips: EnergyEfficiencyTip[]
  ): {
    monthlySavings: number;
    annualSavings: number;
    implementationCost: number;
    paybackPeriod: number;
  } {
    const totalSavingsPercentage = tips.reduce((sum, tip) => sum + tip.potentialSavings, 0);
    const cappedSavings = Math.min(totalSavingsPercentage, 50) / 100; // Cap at 50%
    
    const monthlySavings = currentMonthlyBill * cappedSavings;
    const annualSavings = monthlySavings * 12;
    const implementationCost = tips.reduce((sum, tip) => sum + tip.estimatedCost, 0);
    const paybackPeriod = implementationCost > 0 ? implementationCost / monthlySavings : 0;

    return {
      monthlySavings,
      annualSavings,
      implementationCost,
      paybackPeriod,
    };
  }

  static getSeasonalTips(month: number): EnergyEfficiencyTip[] {
    const winterMonths = [11, 0, 1, 2]; // Dec, Jan, Feb, Mar
    const summerMonths = [5, 6, 7, 8]; // Jun, Jul, Aug, Sep

    if (winterMonths.includes(month)) {
      return this.tips.filter(t => t.category === 'heating');
    } else if (summerMonths.includes(month)) {
      return this.tips.filter(t => t.category === 'cooling');
    }

    return this.tips.filter(t => t.category === 'general' || t.category === 'lighting');
  }

  static generateEfficiencyReport(
    readings: Reading[],
    meter: Meter,
    currentBill: number
  ): any {
    const analysis = this.analyzeUsagePatterns(readings, meter);
    const savings = this.calculatePotentialSavings(currentBill, analysis.recommendations);
    const seasonalTips = this.getSeasonalTips(new Date().getMonth());

    return {
      meterName: meter.name,
      analysisDate: new Date().toISOString(),
      currentMonthlyBill: currentBill,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      potentialSavings: savings,
      seasonalTips,
      score: this.calculateEfficiencyScore(readings, meter),
    };
  }

  private static calculateEfficiencyScore(readings: Reading[], meter: Meter): number {
    // Calculate efficiency score based on usage patterns
    const recentReadings = readings
      .filter(r => r.meterId === meter.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    if (recentReadings.length < 7) return 50; // Default score

    const averageDaily = recentReadings.reduce((sum, r) => sum + (r.consumption || 0), 0) / recentReadings.length;
    const consistency = this.calculateConsistency(recentReadings);
    
    // Score based on usage level and consistency
    let score = 100;
    
    if (averageDaily > 40) score -= 30;
    else if (averageDaily > 25) score -= 15;
    else if (averageDaily > 15) score -= 5;
    
    score -= (1 - consistency) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private static calculateConsistency(readings: Reading[]): number {
    const consumptions = readings.map(r => r.consumption || 0).filter(c => c > 0);
    if (consumptions.length < 2) return 0;

    const mean = consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
    const variance = consumptions.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / consumptions.length;
    const standardDeviation = Math.sqrt(variance);
    
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    return Math.max(0, 1 - coefficientOfVariation);
  }
}