/**
 * Unit tests for bulk actions utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  formatDateForExport,
  formatDateTimeForExport,
  formatCurrencyForExport,
} from './bulk-actions';

describe('formatDateForExport', () => {
  it('should format timestamp to ISO date string', () => {
    // Jan 15, 2026 at noon UTC
    const timestamp = new Date('2026-01-15T12:30:45Z').getTime();
    const result = formatDateForExport(timestamp);
    
    expect(result).toBe('2026-01-15');
  });

  it('should return empty string for undefined', () => {
    expect(formatDateForExport(undefined)).toBe('');
  });

  it('should return empty string for zero timestamp', () => {
    expect(formatDateForExport(0)).toBe('');
  });

  it('should handle edge of year', () => {
    const newYear = new Date('2026-12-31T23:59:59Z').getTime();
    expect(formatDateForExport(newYear)).toBe('2026-12-31');
  });
});

describe('formatDateTimeForExport', () => {
  it('should format timestamp to ISO datetime string', () => {
    // Jan 15, 2026 at 12:30:45 UTC
    const timestamp = new Date('2026-01-15T12:30:45Z').getTime();
    const result = formatDateTimeForExport(timestamp);
    
    expect(result).toBe('2026-01-15 12:30:45');
  });

  it('should return empty string for undefined', () => {
    expect(formatDateTimeForExport(undefined)).toBe('');
  });

  it('should handle midnight correctly', () => {
    const midnight = new Date('2026-01-15T00:00:00Z').getTime();
    expect(formatDateTimeForExport(midnight)).toBe('2026-01-15 00:00:00');
  });
});

describe('formatCurrencyForExport', () => {
  it('should convert cents to ringgit with 2 decimal places', () => {
    expect(formatCurrencyForExport(10000)).toBe('100.00');
    expect(formatCurrencyForExport(10050)).toBe('100.50');
    expect(formatCurrencyForExport(99)).toBe('0.99');
    expect(formatCurrencyForExport(1)).toBe('0.01');
  });

  it('should return empty string for undefined', () => {
    expect(formatCurrencyForExport(undefined)).toBe('');
  });

  it('should handle zero', () => {
    expect(formatCurrencyForExport(0)).toBe('0.00');
  });

  it('should handle large amounts', () => {
    // 10,000,000 cents = RM 100,000
    expect(formatCurrencyForExport(10000000)).toBe('100000.00');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrencyForExport(-5000)).toBe('-50.00');
  });
});
