import { Reading, UsageStats } from '@/types';

export class UsageCalculator {
  static getWeeklyTotal(readings: Reading[], meterId?: string): number {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startOfWeek.setHours(0, 0, 0, 0);

    return readings
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate >= startOfWeek && matchesMeter;
      })
      .reduce((total, reading) => total + reading.units, 0);
  }

  static getMonthlyTotal(readings: Reading[], meterId?: string, month?: Date): number {
    const targetMonth = month || new Date();
    const year = targetMonth.getFullYear();
    const monthNumber = targetMonth.getMonth();

    return readings
      .filter(reading => {
        const readingDate = new Date(reading.date);
        const matchesMeter = meterId ? reading.meterId === meterId : true;
        return readingDate.getFullYear() === year && 
               readingDate.getMonth() === monthNumber && 
               matchesMeter;
      })
      .reduce((total, reading) => total + reading.units, 0);
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

  static getUsageStats(readings: Reading[], meterId?: string): UsageStats {
    return {
      currentWeekTotal: this.getWeeklyTotal(readings, meterId),
      currentMonthTotal: this.getMonthlyTotal(readings, meterId),
      dailyAverage: this.getDailyAverage(readings, meterId),
      monthlyChange: this.getMonthlyChange(readings, meterId),
    };
  }

  static getChartData(readings: Reading[], meterId: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const reading = readings.find(r => 
        r.meterId === meterId && r.date === dateString
      );
      
      labels.push(currentDate.toLocaleDateString('en-US', { weekday: 'short' }));
      data.push(reading ? reading.units : 0);
    }

    return { labels, data };
  }

  static checkLimitExceeded(usage: number, limit: number): boolean {
    return usage > limit;
  }

  static formatNumber(num: number, decimals: number = 1): string {
    return num.toFixed(decimals);
  }
}