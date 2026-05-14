export interface Meter {
  id: string;
  name: string;
  location: string;
  meterId?: string;
  createdDate: string;
  limits: {
    daily: number;
    monthly: number;
  };
  tariff?: {
    rate: number; // per kWh
    currency: string;
    timeOfUseRates?: {
      peak: { rate: number; hours: string[] };
      offPeak: { rate: number; hours: string[] };
    };
  };
  category: 'residential' | 'commercial' | 'industrial';
  isActive: boolean;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  billingCycle: {
    startDay: number; // 1-31, day of month when billing cycle starts
    endDay: number;
    currentCycleStart: string;
    currentCycleEnd: string;
  };
  connectionDetails?: {
    voltage: number;
    amperage: number;
    phases: 1 | 3;
    connectionType: 'overhead' | 'underground';
  };
}

export interface Reading {
  id: string;
  meterId: string;
  date: string;
  reading: number; // Cumulative meter reading
  consumption?: number; // Calculated daily consumption
  timestamp: string;
  cost?: number; // Calculated cost based on tariff
  notes?: string;
  photoUri?: string; // Optional photo of meter reading
  isEstimated?: boolean; // Flag for estimated readings
  billingCycle?: string; // Which billing cycle this reading belongs to
  timeOfDay?: 'peak' | 'offPeak' | 'standard';
  temperature?: number; // Ambient temperature when reading was taken
  powerFactor?: number; // For commercial/industrial meters
}

export interface BillingCycle {
  id: string;
  meterId: string;
  startDate: string;
  endDate: string;
  startReading: number;
  endReading?: number;
  totalConsumption: number;
  totalCost: number;
  averageDailyUsage: number;
  peakUsage: number;
  status: 'active' | 'completed' | 'estimated';
  daysInCycle: number;
  estimatedEndReading?: number;
  estimatedCost?: number;
  notes?: string;
}

export interface Alert {
  id: string;
  meterId?: string;
  type: 'limit_exceeded' | 'unusual_usage' | 'maintenance_due' | 'billing_cycle' | 'cost_alert' | 'efficiency_tip';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead: boolean;
  actionRequired?: boolean;
  data?: any;
}

export interface UsageComparison {
  currentPeriod: number;
  previousPeriod: number;
  percentageChange: number;
  costDifference: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface EnergyEfficiencyTip {
  id: string;
  category: 'heating' | 'cooling' | 'lighting' | 'appliances' | 'general';
  title: string;
  description: string;
  potentialSavings: number; // Percentage
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedCost: number;
  paybackPeriod: number; // months
}

export interface NotificationSettings {
  enabled: boolean;
  dailyLimit: boolean;
  monthlyLimit: boolean;
  reminderTime: string;
  weeklyReport: boolean;
  monthlyReport: boolean;
  unusualUsage: boolean;
  maintenanceReminders: boolean;
  billingCycleAlerts: boolean;
  costAlerts: boolean;
  efficiencyTips: boolean;
  weatherAlerts: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  currency: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  units: 'kWh' | 'MWh';
  autoBackup: boolean;
  biometricAuth: boolean;
}

export interface UsageStats {
  currentWeekTotal: number;
  currentMonthTotal: number;
  dailyAverage: number;
  monthlyChange: number;
  weeklyChange: number;
  yearToDateTotal: number;
  projectedMonthlyUsage: number;
  costThisMonth: number;
  projectedMonthlyCost: number;
}

export interface UsageForecast {
  nextWeekPrediction: number;
  nextMonthPrediction: number;
  confidence: number;
  factors: string[];
}

export interface MeterDetection {
  id: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  type: 'digital' | 'analog' | 'lcd' | 'led';
  extractedText?: string;
  processedValue?: number;
  validationStatus: 'valid' | 'invalid' | 'needs_review';
  timestamp: string;
}

export interface CameraReading {
  id: string;
  meterId: string;
  imageUri: string;
  detections: MeterDetection[];
  selectedDetection?: string;
  manualReading?: number;
  confidence: number;
  processingTime: number;
  date: string;
  timestamp: string;
  status: 'processing' | 'completed' | 'failed' | 'manual_review';
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageProcessingSettings {
  brightness: number;
  contrast: number;
  autoEnhance: boolean;
  noiseReduction: boolean;
  perspectiveCorrection: boolean;
  edgeDetection: boolean;
}

export interface MaintenanceRecord {
  id: string;
  meterId: string;
  date: string;
  type: 'routine' | 'repair' | 'calibration' | 'replacement';
  description: string;
  cost?: number;
  technician?: string;
  nextDueDate?: string;
}

export interface EnergyGoal {
  id: string;
  meterId?: string; // If undefined, applies to all meters
  type: 'reduction' | 'limit' | 'efficiency';
  target: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  description: string;
  isActive: boolean;
  progress: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  date: string;
}

export interface UsagePattern {
  dayOfWeek: number;
  hour: number;
  averageUsage: number;
  peakUsage: number;
  efficiency: number;
}

export interface MeterTemplate {
  id: string;
  name: string;
  type: 'digital' | 'analog' | 'lcd' | 'led';
  brand?: string;
  model?: string;
  digitCount: number;
  decimalPlaces: number;
  units: string;
  readingPattern: RegExp;
  validationRules: {
    minValue: number;
    maxValue: number;
    incrementOnly: boolean;
  };
  processingHints: {
    expectedPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
    backgroundColor: 'light' | 'dark';
    textColor: 'light' | 'dark';
  };
}

interface FormData {
  name: string;
  location: string;
  meterId: string;
  dailyLimit: string;
  monthlyLimit: string;
  category: 'residential' | 'commercial' | 'industrial';
  tariffRate: string;
  currency: string;
  isActive: boolean;
  billingStartDay: string;
  voltage: string;
  amperage: string;
  phases: 1 | 3;
  connectionType: 'overhead' | 'underground';
}