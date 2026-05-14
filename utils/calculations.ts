import { Reading, UsageStats } from '@/types';

export class UsageCalculator {
  static calculateConsumption(readings: Reading[]): Reading[] {
    // Group readings by meter ID first
    const readingsByMeter = readings.reduce((acc, reading) => {
      if (!acc[reading.meterId]) {
        acc[reading.meterId] = [];
      }
      acc[reading.meterId].push(reading);
      return acc;
    }, {} as Record<string, Reading[]>);

    // Calculate consumption for each meter separately
    const allReadingsWithConsumption: Reading[] = [];
    
    Object.values(readingsByMeter).forEach(meterReadings => {
      const sortedReadings = [...meterReadings].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const readingsWithConsumption = sortedReadings.map((reading, index) => {
        if (index === 0) {
          return { ...reading, consumption: 0 }; // First reading has no consumption
        }
        
        const previousReading = sortedReadings[index - 1];
        const consumption = Math.max(0, reading.reading - previousReading.reading);
        
        return { ...reading, consumption };
      });

      allReadingsWithConsumption.push(...readingsWithConsumption);
    });

    return allReadingsWithConsumption;
  }

  static getWeeklyTotal(readings: Reading[], meterId?: string): number {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const readingsWithConsumption = this.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate >= startOfWeek && matchesMeter;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }

  static getMonthlyTotal(readings: Reading[], meterId?: string, month?: Date): number {
    const targetMonth = month || new Date();
    const year = targetMonth.getFullYear();
    const monthNumber = targetMonth.getMonth();

    const readingsWithConsumption = this.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate.getFullYear() === year && 
               readingDate.getMonth() === monthNumber && 
               matchesMeter;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }

  static getDailyAverage(readings: Reading[], meterId?: string): number {
    const currentMonth = new Date();
    const currentDay = currentMonth.getDate();
    const monthlyTotal = this.getMonthlyTotal(readings, meterId, currentMonth);
    
    return currentDay > 0 ? monthlyTotal / currentDay : 0;
  }

  static getMonthlyChange(readings: Reading[], meterId?: string): number {
    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    
    const currentTotal = this.getMonthlyTotal(readings, meterId, currentMonth);
    const previousTotal = this.getMonthlyTotal(readings, meterId, previousMonth);
    
    if (previousTotal === 0) return 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }

  static getTodayConsumption(readings: Reading[], meterId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const readingsWithConsumption = this.calculateConsumption(readings);
    const todayReading = readingsWithConsumption.find(r => 
      r.meterId === meterId && r.date === today
    );
    return todayReading?.consumption || 0;
  }

  static getYesterdayConsumption(readings: Reading[], meterId: string): number {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    const readingsWithConsumption = this.calculateConsumption(readings);
    const yesterdayReading = readingsWithConsumption.find(r => 
      r.meterId === meterId && r.date === yesterdayString
    );
    return yesterdayReading?.consumption || 0;
  }

  static getWeeklyAverage(readings: Reading[], meterId?: string): number {
    const weeklyTotal = this.getWeeklyTotal(readings, meterId);
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // Sunday = 7, Monday = 1
    return dayOfWeek > 0 ? weeklyTotal / dayOfWeek : 0;
  }

  static getPeakUsageDay(readings: Reading[], meterId: string): { date: string; consumption: number } | null {
    const readingsWithConsumption = this.calculateConsumption(readings)
      .filter(r => r.meterId === meterId && r.consumption && r.consumption > 0)
      .sort((a, b) => (b.consumption || 0) - (a.consumption || 0));
    
    if (readingsWithConsumption.length === 0) return null;
    
    const peak = readingsWithConsumption[0];
    return {
      date: peak.date,
      consumption: peak.consumption || 0
    };
  }

  static getCurrentBillingCycleDateRange(billingStartDay: number, forDate: Date = new Date()): { startDate: Date; endDate: Date; daysInCycle: number } {
    const today = forDate;
    let cycleStartDate = new Date(today.getFullYear(), today.getMonth(), billingStartDay);

    if (today.getDate() < billingStartDay) {
      // We are in the cycle that started last month
      cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
    }

    // The end date is the day before the start day of the next cycle.
    const cycleEndDate = new Date(cycleStartDate.getFullYear(), cycleStartDate.getMonth() + 1, billingStartDay - 1);
    
    const daysInCycle = Math.round((cycleEndDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    cycleStartDate.setHours(0, 0, 0, 0);
    cycleEndDate.setHours(23, 59, 59, 999);

    return { startDate: cycleStartDate, endDate: cycleEndDate, daysInCycle };
  }

  static getBillingCycleTotal(readings: Reading[], meterId: string, billingStartDay: number): number {
    const { startDate, endDate } = this.getCurrentBillingCycleDateRange(billingStartDay);

    const readingsWithConsumption = this.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        return reading.meterId === meterId &&
               readingDate >= startDate && 
               readingDate <= endDate;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }

  static getProjectedBillingCycleUsage(readings: Reading[], meterId: string, billingStartDay: number): number {
    const { startDate, daysInCycle } = this.getCurrentBillingCycleDateRange(billingStartDay);
    const cycleTotal = this.getBillingCycleTotal(readings, meterId, billingStartDay);
    
    const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const dailyAverage = cycleTotal / daysElapsed;
    return dailyAverage * daysInCycle;
  }

  static getBillingCycleChange(readings: Reading[], meterId: string, billingStartDay: number): number {
    const today = new Date();
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    const currentCycleTotal = this.getBillingCycleTotal(readings, meterId, billingStartDay);

    const { startDate: prevCycleStartDate, endDate: prevCycleEndDate } = this.getCurrentBillingCycleDateRange(billingStartDay, previousMonthDate);
    
    const readingsWithConsumption = this.calculateConsumption(readings);
    
    const previousCycleTotal = readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        return reading.meterId === meterId &&
               readingDate >= prevCycleStartDate && 
               readingDate <= prevCycleEndDate;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);

    if (previousCycleTotal === 0) return 0;
    return ((currentCycleTotal - previousCycleTotal) / previousCycleTotal) * 100;
  }

  static getUsageStats(readings: Reading[], meterId?: string, billingCycle?: { startDay: number }): UsageStats {
    const isBillingCycleBased = !!(billingCycle && meterId && billingCycle.startDay);

    let currentMonthTotal: number;
    let dailyAverage: number;
    let monthlyChange: number;
    let projectedMonthlyUsage: number;

    if (isBillingCycleBased) {
      const { startDate } = this.getCurrentBillingCycleDateRange(billingCycle.startDay);
      currentMonthTotal = this.getBillingCycleTotal(readings, meterId, billingCycle.startDay);
      const daysElapsed = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      dailyAverage = currentMonthTotal / daysElapsed;
      projectedMonthlyUsage = this.getProjectedBillingCycleUsage(readings, meterId, billingCycle.startDay);
      monthlyChange = this.getBillingCycleChange(readings, meterId, billingCycle.startDay);
    } else {
      currentMonthTotal = this.getMonthlyTotal(readings, meterId);
      dailyAverage = this.getDailyAverage(readings, meterId);
      monthlyChange = this.getMonthlyChange(readings, meterId);
      projectedMonthlyUsage = this.getProjectedMonthlyUsage(readings, meterId);
    }

    return {
      currentWeekTotal: this.getWeeklyTotal(readings, meterId),
      currentMonthTotal,
      dailyAverage,
      monthlyChange,
      weeklyChange: this.getWeeklyChange(readings, meterId),
      yearToDateTotal: this.getYearToDateTotal(readings, meterId),
      projectedMonthlyUsage,
      costThisMonth: 0, // Will be calculated by caller with tariff info
      projectedMonthlyCost: 0, // Will be calculated by caller with tariff info
    };
  }

  static getWeeklyChange(readings: Reading[], meterId?: string): number {
    const currentWeek = this.getWeeklyTotal(readings, meterId);
    const previousWeek = this.getPreviousWeekTotal(readings, meterId);
    
    if (previousWeek === 0) return 0;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  }

  static getPreviousWeekTotal(readings: Reading[], meterId?: string): number {
    const now = new Date();
    const startOfPreviousWeek = new Date(now.setDate(now.getDate() - now.getDay() - 6));
    const endOfPreviousWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfPreviousWeek.setHours(0, 0, 0, 0);
    endOfPreviousWeek.setHours(23, 59, 59, 999);

    const readingsWithConsumption = this.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate >= startOfPreviousWeek && 
               readingDate <= endOfPreviousWeek && 
               matchesMeter;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }

  static getYearToDateTotal(readings: Reading[], meterId?: string): number {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const readingsWithConsumption = this.calculateConsumption(readings);
    
    return readingsWithConsumption
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate >= startOfYear && matchesMeter;
      })
      .reduce((total, reading) => total + (reading.consumption || 0), 0);
  }

  static getProjectedMonthlyUsage(readings: Reading[], meterId?: string): number {
    const currentMonth = new Date();
    const currentDay = currentMonth.getDate();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const monthlyTotal = this.getMonthlyTotal(readings, meterId, currentMonth);
    
    if (currentDay === 0) return monthlyTotal;
    return (monthlyTotal / currentDay) * daysInMonth;
  }

  static getChartData(readings: Reading[], meterId: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const readingsWithConsumption = this.calculateConsumption(readings);
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const reading = readingsWithConsumption.find(r => 
        r.meterId === meterId && r.date === dateString
      );
      
      labels.push(currentDate.toLocaleDateString('en-US', { weekday: 'short' }));
      data.push(reading ? (reading.consumption || 0) : 0);
    }

    return { labels, data };
  }

  static getLatestReading(readings: Reading[], meterId: string): Reading | undefined {
    return readings
      .filter(r => r.meterId === meterId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  static getMeterReadingsCount(readings: Reading[], meterId: string): number {
    return readings.filter(r => r.meterId === meterId).length;
  }

  static getConsumptionTrend(readings: Reading[], meterId: string, days: number = 7): 'increasing' | 'decreasing' | 'stable' {
    const readingsWithConsumption = this.calculateConsumption(readings)
      .filter(r => r.meterId === meterId && r.consumption && r.consumption > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, days);
    
    if (readingsWithConsumption.length < 3) return 'stable';
    
    const recent = readingsWithConsumption.slice(0, Math.ceil(days / 2));
    const older = readingsWithConsumption.slice(Math.ceil(days / 2));
    
    const recentAvg = recent.reduce((sum, r) => sum + (r.consumption || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + (r.consumption || 0), 0) / older.length;
    
    const difference = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (difference > 10) return 'increasing';
    if (difference < -10) return 'decreasing';
    return 'stable';
  }

  static checkLimitExceeded(usage: number, limit: number): boolean {
    return usage > limit;
  }

  static formatNumber(num: number, decimals: number = 1): string {
    return num.toFixed(decimals);
  }
}