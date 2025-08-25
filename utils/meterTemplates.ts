import { MeterTemplate } from '@/types';

export class MeterTemplateManager {
  private static templates: MeterTemplate[] = [
    {
      id: 'generic_digital',
      name: 'Generic Digital Meter',
      type: 'digital',
      digitCount: 6,
      decimalPlaces: 2,
      units: 'kWh',
      readingPattern: /^\d{1,6}\.\d{1,2}$/,
      validationRules: {
        minValue: 0,
        maxValue: 999999.99,
        incrementOnly: true,
      },
      processingHints: {
        expectedPosition: 'center',
        backgroundColor: 'dark',
        textColor: 'light',
      },
    },
    {
      id: 'lcd_display',
      name: 'LCD Display Meter',
      type: 'lcd',
      digitCount: 8,
      decimalPlaces: 3,
      units: 'kWh',
      readingPattern: /^\d{1,8}\.\d{1,3}$/,
      validationRules: {
        minValue: 0,
        maxValue: 99999999.999,
        incrementOnly: true,
      },
      processingHints: {
        expectedPosition: 'center',
        backgroundColor: 'light',
        textColor: 'dark',
      },
    },
    {
      id: 'led_display',
      name: 'LED Display Meter',
      type: 'led',
      digitCount: 7,
      decimalPlaces: 2,
      units: 'kWh',
      readingPattern: /^\d{1,7}\.\d{1,2}$/,
      validationRules: {
        minValue: 0,
        maxValue: 9999999.99,
        incrementOnly: true,
      },
      processingHints: {
        expectedPosition: 'center',
        backgroundColor: 'dark',
        textColor: 'light',
      },
    },
    {
      id: 'analog_meter',
      name: 'Analog Dial Meter',
      type: 'analog',
      digitCount: 5,
      decimalPlaces: 0,
      units: 'kWh',
      readingPattern: /^\d{1,5}$/,
      validationRules: {
        minValue: 0,
        maxValue: 99999,
        incrementOnly: true,
      },
      processingHints: {
        expectedPosition: 'center',
        backgroundColor: 'light',
        textColor: 'dark',
      },
    },
  ];

  static getAllTemplates(): MeterTemplate[] {
    return this.templates;
  }

  static getTemplate(id: string): MeterTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  static getTemplatesByType(type: 'digital' | 'analog' | 'lcd' | 'led'): MeterTemplate[] {
    return this.templates.filter(template => template.type === type);
  }

  static validateReadingAgainstTemplate(
    reading: string,
    templateId: string
  ): { isValid: boolean; errors: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { isValid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];
    const numericValue = parseFloat(reading);

    // Check pattern
    if (!template.readingPattern.test(reading)) {
      errors.push(`Reading format doesn't match expected pattern for ${template.name}`);
    }

    // Check range
    if (numericValue < template.validationRules.minValue) {
      errors.push(`Reading below minimum value (${template.validationRules.minValue})`);
    }

    if (numericValue > template.validationRules.maxValue) {
      errors.push(`Reading above maximum value (${template.validationRules.maxValue})`);
    }

    // Check decimal places
    const decimalPart = reading.split('.')[1];
    if (decimalPart && decimalPart.length > template.decimalPlaces) {
      errors.push(`Too many decimal places (max ${template.decimalPlaces})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static suggestTemplate(reading: string): MeterTemplate | null {
    // Try to match reading format to templates
    for (const template of this.templates) {
      if (template.readingPattern.test(reading)) {
        return template;
      }
    }
    return null;
  }

  static createCustomTemplate(
    name: string,
    type: 'digital' | 'analog' | 'lcd' | 'led',
    digitCount: number,
    decimalPlaces: number
  ): MeterTemplate {
    const pattern = new RegExp(`^\\d{1,${digitCount}}\\.\\d{1,${decimalPlaces}}$`);
    
    return {
      id: `custom_${Date.now()}`,
      name,
      type,
      digitCount,
      decimalPlaces,
      units: 'kWh',
      readingPattern: pattern,
      validationRules: {
        minValue: 0,
        maxValue: Math.pow(10, digitCount) - 1,
        incrementOnly: true,
      },
      processingHints: {
        expectedPosition: 'center',
        backgroundColor: type === 'analog' ? 'light' : 'dark',
        textColor: type === 'analog' ? 'dark' : 'light',
      },
    };
  }
}