import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/utils/storage';
import { FormValidator } from '@/utils/validation';
import { Meter } from '@/types';

export const useMeters = () => {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMeters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedMeters = await StorageManager.getMeters();
      setMeters(loadedMeters);
    } catch (err) {
      setError('Failed to load meters');
      console.error('Error loading meters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeters();
  }, [loadMeters]);

  const addMeter = async (
    name: string,
    location: string,
    meterId?: string,
    dailyLimit: number = 0,
    monthlyLimit: number = 0,
    category: 'residential' | 'commercial' | 'industrial' = 'residential',
    tariff?: { rate: number; currency: string }
  ): Promise<void> => {
    try {
      FormValidator.validateMeterName(name);
      FormValidator.validateLocation(location);
      FormValidator.validateMeterId(meterId);

      const newMeter: Meter = {
        id: Date.now().toString(),
        name: name.trim(),
        location: location.trim(),
        meterId: meterId?.trim(),
        createdDate: new Date().toISOString(),
        limits: {
          daily: dailyLimit,
          monthly: monthlyLimit,
        },
        category,
        tariff,
        isActive: true,
      };

      const updatedMeters = [...meters, newMeter];
      await StorageManager.saveMeters(updatedMeters);
      setMeters(updatedMeters);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to add meter');
    }
  };

  const updateMeter = async (
    id: string,
    updates: Partial<Omit<Meter, 'id' | 'createdDate'>>
  ): Promise<void> => {
    try {
      if (updates.name) FormValidator.validateMeterName(updates.name);
      if (updates.location) FormValidator.validateLocation(updates.location);
      if (updates.meterId !== undefined) FormValidator.validateMeterId(updates.meterId);

      const updatedMeters = meters.map(meter => 
        meter.id === id ? { ...meter, ...updates } : meter
      );
      
      await StorageManager.saveMeters(updatedMeters);
      setMeters(updatedMeters);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to update meter');
    }
  };

  const deleteMeter = async (id: string): Promise<void> => {
    try {
      const updatedMeters = meters.filter(meter => meter.id !== id);
      await StorageManager.saveMeters(updatedMeters);
      setMeters(updatedMeters);
    } catch (err) {
      throw new Error('Failed to delete meter');
    }
  };

  const getMeter = (id: string): Meter | undefined => {
    return meters.find(meter => meter.id === id);
  };

  return {
    meters,
    loading,
    error,
    addMeter,
    updateMeter,
    deleteMeter,
    getMeter,
    refreshMeters: loadMeters,
  };
};