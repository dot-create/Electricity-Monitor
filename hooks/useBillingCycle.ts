import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/utils/storage';
import { BillingCycleManager } from '@/utils/billingCycle';
import { BillingCycle, Meter, Reading } from '@/types';

export const useBillingCycle = () => {
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBillingCycles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const cycles = await StorageManager.getBillingCycles();
      setBillingCycles(cycles);
    } catch (err) {
      setError('Failed to load billing cycles');
      console.error('Error loading billing cycles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingCycles();
  }, [loadBillingCycles]);

  const createBillingCycle = async (
    meterId: string,
    startDay: number,
    startReading: number
  ): Promise<void> => {
    try {
      const newCycle = BillingCycleManager.createBillingCycle(meterId, startDay, startReading);
      const updatedCycles = [...billingCycles, newCycle];
      await StorageManager.saveBillingCycles(updatedCycles);
      setBillingCycles(updatedCycles);
    } catch (err) {
      throw new Error('Failed to create billing cycle');
    }
  };

  const completeBillingCycle = async (
    cycleId: string,
    endReading: number,
    readings: Reading[]
  ): Promise<void> => {
    try {
      const cycle = billingCycles.find(c => c.id === cycleId);
      if (!cycle) throw new Error('Billing cycle not found');

      const completedCycle = BillingCycleManager.completeBillingCycle(cycle, endReading, readings);
      const updatedCycles = billingCycles.map(c => c.id === cycleId ? completedCycle : c);
      
      await StorageManager.saveBillingCycles(updatedCycles);
      setBillingCycles(updatedCycles);
    } catch (err) {
      throw new Error('Failed to complete billing cycle');
    }
  };

  const getCurrentCycle = (meterId: string, billingStartDay: number): BillingCycle | null => {
    return BillingCycleManager.getCurrentBillingCycle(meterId, billingStartDay, billingCycles);
  };

  const getCyclesForMeter = (meterId: string): BillingCycle[] => {
    return billingCycles.filter(cycle => cycle.meterId === meterId);
  };

  const getUpcomingBillingDate = (billingStartDay: number): Date => {
    return BillingCycleManager.getUpcomingBillingDate(billingStartDay);
  };

  const getDaysUntilBilling = (billingStartDay: number): number => {
    return BillingCycleManager.getDaysUntilBilling(billingStartDay);
  };

  const estimateMonthlyBill = (
    currentConsumption: number,
    daysElapsed: number,
    daysInCycle: number,
    tariff: { rate: number }
  ) => {
    return BillingCycleManager.estimateMonthlyBill(
      currentConsumption,
      daysElapsed,
      daysInCycle,
      tariff
    );
  };

  const generateBillingReport = (
    cycleId: string,
    meter: Meter,
    readings: Reading[]
  ) => {
    const cycle = billingCycles.find(c => c.id === cycleId);
    if (!cycle) return null;

    return BillingCycleManager.generateBillingReport(cycle, meter, readings);
  };

  return {
    billingCycles,
    loading,
    error,
    createBillingCycle,
    completeBillingCycle,
    getCurrentCycle,
    getCyclesForMeter,
    getUpcomingBillingDate,
    getDaysUntilBilling,
    estimateMonthlyBill,
    generateBillingReport,
    refreshBillingCycles: loadBillingCycles,
  };
};