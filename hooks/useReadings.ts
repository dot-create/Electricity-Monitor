import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/utils/storage';
import { FormValidator } from '@/utils/validation';
import { Reading } from '@/types';
import { useMeters } from './useMeters';

export const useReadings = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
    const { getMeter } = useMeters();
    try {
      setLoading(true);
      setError(null);
      const loadedReadings = await StorageManager.getReadings();
      setReadings(loadedReadings);
    } catch (err) {
      setError('Failed to load readings');
      console.error('Error loading readings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const addReading = async (
    meterId: string,
    date: string,
    units: number
  ): Promise<void> => {
    try {
      FormValidator.validateDate(date);
      
      const meter = getMeter(meterId);
      const calculatedUnits = meter?.startingReading ? units - meter.startingReading : units;
      const validatedUnits = FormValidator.validateUnits(calculatedUnits);

      // Check for duplicate entries
      const existingReading = readings.find(
        r => r.meterId === meterId && r.date === date
      );

      if (existingReading) {
        throw new Error('Reading already exists for this date');
      }

      const newReading: Reading = {
        id: Date.now().toString(),
        meterId,
        date,
        units: validatedUnits,
        timestamp: new Date().toISOString(),
      };

      const updatedReadings = [...readings, newReading];
      await StorageManager.saveReadings(updatedReadings);
      setReadings(updatedReadings);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to add reading');
    }
  };

  const updateReading = async (
    id: string,
    units: number
  ): Promise<void> => {
    try {
      const validatedUnits = FormValidator.validateUnits(units);
      
      const reading = readings.find(r => r.id === id);
      if (!reading) {
        throw new Error('Reading not found');
      }

      // Check if reading is within 7-day edit window
      const readingDate = new Date(reading.date);
      const now = new Date();
      const daysDiff = (now.getTime() - readingDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff > 7) {
        throw new Error('Cannot edit readings older than 7 days');
      }

      const updatedReadings = readings.map(r => 
        r.id === id ? { ...r, units: validatedUnits } : r
      );
      
      await StorageManager.saveReadings(updatedReadings);
      setReadings(updatedReadings);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to update reading');
    }
  };

  const deleteReading = async (id: string): Promise<void> => {
    try {
      const updatedReadings = readings.filter(reading => reading.id !== id);
      await StorageManager.saveReadings(updatedReadings);
      setReadings(updatedReadings);
    } catch (err) {
      throw new Error('Failed to delete reading');
    }
  };

  const getReadingsForMeter = (meterId: string): Reading[] => {
    return readings
      .filter(reading => reading.meterId === meterId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const canEditReading = (date: string): boolean => {
    const readingDate = new Date(date);
    const now = new Date();
    const daysDiff = (now.getTime() - readingDate.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 7;
  };

  return {
    readings,
    loading,
    error,
    addReading,
    updateReading,
    deleteReading,
    getReadingsForMeter,
    canEditReading,
    refreshReadings: loadReadings,
  };
};