export class BillingCycleManager {
  static createBillingCycle(
    meterId: string,
    startDay: number,
    startReading: number,
    date: Date = new Date()
  ): BillingCycle {
    const cycleStart = new Date(date.getFullYear(), date.getMonth(), startDay);
    const cycleEnd = new Date(date.getFullYear(), date.getMonth() + 1, startDay - 1);
    
    // If we're past the start day, move to next month
    if (date.getDate() >= startDay) {
      cycleStart.setMonth(cycleStart.getMonth() + 1);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    }

    return {
      id: `${meterId}_${cycleStart.getTime()}`,
      meterId,
      startDate: cycleStart.toISOString().split('T')[0],
      endDate: cycleEnd.toISOString().split('T')[0],
      startReading,
      totalConsumption: 0,
      totalCost: 0,
      averageDailyUsage: 0,
      peakUsage: 0,
      status: 'active',
      daysInCycle: this.getDaysInMonth(cycleStart),
    };
  }

  static getCurrentBillingCycle(
    meterId: string,
    billingStartDay: number,
    cycles: BillingCycle[]
  ): BillingCycle | null {
    const today = new Date();
    const currentCycleStart = new Date(today.getFullYear(), today.getMonth(), billingStartDay);
    
    if (today.getDate() < billingStartDay) {
      currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);
    }

    return cycles.find(cycle => 
      cycle.meterId === meterId && 
      cycle.status === 'active' &&
      new Date(cycle.startDate).getTime() === currentCycleStart.getTime()
    ) || null;
  }

  static completeBillingCycle(
    cycle: BillingCycle,
    endReading: number,
    readings: Reading[]
  ): BillingCycle {
    const cycleReadings = readings.filter(r => 
      r.meterId === cycle.meterId &&
      r.date >= cycle.startDate &&
      r.date <= cycle.endDate
    );

    const totalConsumption = endReading - cycle.startReading;
    const peakUsage = Math.max(...cycleReadings.map(r => r.consumption || 0));
    const averageDailyUsage = totalConsumption / cycle.daysInCycle;

    return {
      ...cycle,
      endReading,
      totalConsumption,
      averageDailyUsage,
      peakUsage,
      status: 'completed',
    };
  }

  static calculateBillingCycleCost(
    cycle: BillingCycle,
    tariff: { rate: number; timeOfUseRates?: any },
    readings: Reading[]
  ): number {
    if (!tariff.timeOfUseRates) {
      return cycle.totalConsumption * tariff.rate;
    }

    // Time-of-use billing calculation
    const cycleReadings = readings.filter(r => 
      r.meterId === cycle.meterId &&
      r.date >= cycle.startDate &&
      r.date <= cycle.endDate
    );

    let totalCost = 0;
    cycleReadings.forEach(reading => {
      if (reading.consumption && reading.timeOfDay) {
        const rate = reading.timeOfDay === 'peak' 
          ? tariff.timeOfUseRates.peak.rate 
          : tariff.timeOfUseRates.offPeak.rate;
        totalCost += reading.consumption * rate;
      }
    });

    return totalCost;
  }

  static getUpcomingBillingDate(billingStartDay: number): Date {
    const today = new Date();
    const nextBilling = new Date(today.getFullYear(), today.getMonth(), billingStartDay);
    
    if (today.getDate() >= billingStartDay) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    return nextBilling;
  }

  static getDaysUntilBilling(billingStartDay: number): number {
    const today = new Date();
    const nextBilling = this.getUpcomingBillingDate(billingStartDay);
    const diffTime = nextBilling.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static estimateMonthlyBill(
    currentConsumption: number,
    daysElapsed: number,
    daysInCycle: number,
    tariff: { rate: number }
  ): { estimated: number; confidence: number } {
    const dailyAverage = currentConsumption / daysElapsed;
    const estimatedTotal = dailyAverage * daysInCycle;
    const estimated = estimatedTotal * tariff.rate;
    
    // Confidence decreases early in the cycle
    const confidence = Math.min(95, (daysElapsed / daysInCycle) * 100);
    
    return { estimated, confidence };
  }

  static generateBillingReport(
    cycle: BillingCycle,
    meter: any,
    readings: Reading[]
  ): any {
    const cycleReadings = readings.filter(r => 
      r.meterId === cycle.meterId &&
      r.date >= cycle.startDate &&
      r.date <= cycle.endDate
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dailyUsage = cycleReadings.map(r => ({
      date: r.date,
      consumption: r.consumption || 0,
      cost: r.cost || 0,
    }));

    const peakDay = dailyUsage.reduce((max, day) => 
      day.consumption > max.consumption ? day : max, dailyUsage[0]);

    const lowestDay = dailyUsage.reduce((min, day) => 
      day.consumption < min.consumption ? day : min, dailyUsage[0]);

    return {
      cycle,
      meter,
      summary: {
        totalConsumption: cycle.totalConsumption,
        totalCost: cycle.totalCost,
        averageDailyUsage: cycle.averageDailyUsage,
        peakUsage: cycle.peakUsage,
        daysInCycle: cycle.daysInCycle,
      },
      insights: {
        peakDay,
        lowestDay,
        weekdayAverage: this.calculateWeekdayAverage(dailyUsage),
        weekendAverage: this.calculateWeekendAverage(dailyUsage),
      },
      dailyBreakdown: dailyUsage,
    };
  }

  private static getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private static calculateWeekdayAverage(dailyUsage: any[]): number {
    const weekdays = dailyUsage.filter(day => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    });
    
    return weekdays.length > 0 
      ? weekdays.reduce((sum, day) => sum + day.consumption, 0) / weekdays.length 
      : 0;
  }

  private static calculateWeekendAverage(dailyUsage: any[]): number {
    const weekends = dailyUsage.filter(day => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });
    
    return weekends.length > 0 
      ? weekends.reduce((sum, day) => sum + day.consumption, 0) / weekends.length 
      : 0;
  }
}