export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FormValidator {
  static validateMeterName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Meter name is required');
    }
    if (name.length > 50) {
      throw new ValidationError('Meter name must be 50 characters or less');
    }
  }

  static validateLocation(location: string): void {
    if (!location || location.trim().length === 0) {
      throw new ValidationError('Location is required');
    }
    if (location.length > 100) {
      throw new ValidationError('Location must be 100 characters or less');
    }
  }

  static validateMeterId(meterId?: string): void {
    if (meterId && meterId.length > 20) {
      throw new ValidationError('Meter ID must be 20 characters or less');
    }
    if (meterId && !/^[a-zA-Z0-9]*$/.test(meterId)) {
      throw new ValidationError('Meter ID must contain only letters and numbers');
    }
  }

  static validateReading(reading: string | number): number {
    const numReading = typeof reading === 'string' ? parseFloat(reading) : reading;
    
    if (isNaN(numReading)) {
      throw new ValidationError('Meter reading must be a valid number');
    }
    if (numReading < 0) {
      throw new ValidationError('Meter reading cannot be negative');
    }
    if (numReading > 999999.99) {
      throw new ValidationError('Meter reading seems unusually high (max 999,999.99 kWh)');
    }
    
    return numReading;
  }

  static validateReadingSequence(newReading: number, previousReading?: number): void {
    if (previousReading !== undefined && newReading < previousReading) {
      throw new ValidationError('New reading cannot be less than previous reading');
    }
  }

  static validateDate(date: string): void {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      throw new ValidationError('Cannot enter readings for future dates');
    }
  }

  static validateLimit(limit: string | number): number {
    const numLimit = typeof limit === 'string' ? parseFloat(limit) : limit;
    
    if (isNaN(numLimit)) {
      throw new ValidationError('Limit must be a valid number');
    }
    if (numLimit < 0) {
      throw new ValidationError('Limit cannot be negative');
    }
    if (numLimit > 50000) {
      throw new ValidationError('Limit seems unusually high (max 50,000 kWh)');
    }
    
    return numLimit;
  }
}