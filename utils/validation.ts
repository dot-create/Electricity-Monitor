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

  static validateUnits(units: string | number): number {
    const numUnits = typeof units === 'string' ? parseFloat(units) : units;
    
    if (isNaN(numUnits)) {
      throw new ValidationError('Units must be a valid number');
    }
    if (numUnits < 0) {
      throw new ValidationError('Units cannot be negative');
    }
    if (numUnits > 10000) {
      throw new ValidationError('Units seem unusually high (max 10,000 kWh)');
    }
    
    return numUnits;
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