import { useState, useEffect, useCallback } from 'react';
import { StorageManager } from '@/utils/storage';
import { EnergyGoal } from '@/types';

export const useGoals = () => {
  const [goals, setGoals] = useState<EnergyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedGoals = await StorageManager.getEnergyGoals();
      setGoals(loadedGoals);
    } catch (err) {
      setError('Failed to load energy goals');
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const addGoal = async (goal: Omit<EnergyGoal, 'id' | 'progress'>): Promise<void> => {
    try {
      const newGoal: EnergyGoal = {
        ...goal,
        id: Date.now().toString(),
        progress: 0,
      };

      const updatedGoals = [...goals, newGoal];
      await StorageManager.saveEnergyGoals(updatedGoals);
      setGoals(updatedGoals);
    } catch (err) {
      throw new Error('Failed to add energy goal');
    }
  };

  const updateGoal = async (id: string, updates: Partial<EnergyGoal>): Promise<void> => {
    try {
      const updatedGoals = goals.map(goal => 
        goal.id === id ? { ...goal, ...updates } : goal
      );
      
      await StorageManager.saveEnergyGoals(updatedGoals);
      setGoals(updatedGoals);
    } catch (err) {
      throw new Error('Failed to update energy goal');
    }
  };

  const deleteGoal = async (id: string): Promise<void> => {
    try {
      const updatedGoals = goals.filter(goal => goal.id !== id);
      await StorageManager.saveEnergyGoals(updatedGoals);
      setGoals(updatedGoals);
    } catch (err) {
      throw new Error('Failed to delete energy goal');
    }
  };

  const getActiveGoals = (): EnergyGoal[] => {
    return goals.filter(goal => goal.isActive);
  };

  const getGoalsForMeter = (meterId: string): EnergyGoal[] => {
    return goals.filter(goal => goal.meterId === meterId || !goal.meterId);
  };

  return {
    goals,
    loading,
    error,
    addGoal,
    updateGoal,
    deleteGoal,
    getActiveGoals,
    getGoalsForMeter,
    refreshGoals: loadGoals,
  };
};