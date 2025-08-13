import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/utils/storage';
import { FormValidator } from '@/utils/validation';
import { Reading } from '@/types';

export const useReadings = () => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
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
    reading: number
  ): Promise<void> => {
    try {
      FormValidator.validateDate(date);
      const validatedReading = FormValidator.validateReading(reading);

      // Check for duplicate entries
      const existingReading = readings.find(
        r => r.meterId === meterId && r.date === date
      );

      if (existingReading) {
        throw new Error('Reading already exists for this date');
      }

      // Get previous reading to validate sequence
      const meterReadings = readings
        .filter(r => r.meterId === meterId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const previousReading = meterReadings.find(r => new Date(r.date) < new Date(date));
      
      if (previousReading) {
        FormValidator.validateReadingSequence(validatedReading, previousReading.reading);
      }

      const newReading: Reading = {
        id: Date.now().toString(),
        meterId,
        date,
        reading: validatedReading,
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
    reading: number
  ): Promise<void> => {
    try {
      const validatedReading = FormValidator.validateReading(reading);
      
      const existingReading = readings.find(r => r.id === id);
      if (!existingReading) {
        throw new Error('Reading not found');
      }

      // Check if reading is within 7-day edit window
      const readingDate = new Date(existingReading.date);
      const now = new Date();
      const daysDiff = (now.getTime() - readingDate.getTime()) / (1000 * 3600 * 24);
      
      if (daysDiff > 7) {
        throw new Error('Cannot edit readings older than 7 days');
      }

      // Validate sequence with adjacent readings
      const meterReadings = readings
        .filter(r => r.meterId === existingReading.meterId && r.id !== id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const previousReading = meterReadings
        .filter(r => new Date(r.date) < new Date(existingReading.date))
        .pop();
      
      const nextReading = meterReadings
        .find(r => new Date(r.date) > new Date(existingReading.date));
      
      if (previousReading) {
        FormValidator.validateReadingSequence(validatedReading, previousReading.reading);
      }
      
      if (nextReading && validatedReading > nextReading.reading) {
        throw new Error('Reading cannot be greater than subsequent readings');
      }

      const updatedReadings = readings.map(r => 
        r.id === id ? { ...r, reading: validatedReading } : r
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