/**
 * Unit tests for validation helpers
 * These test pure functions that don't require database access
 */

import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateEmail,
  validatePhone,
  validateNumber,
  validateLineItems,
  validateSignatureData,
} from './helpers';

describe('validateString', () => {
  it('should pass for valid string', () => {
    const result = validateString('Hello World', 'Name');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Hello World');
  });

  it('should trim whitespace', () => {
    const result = validateString('  Hello  ', 'Name');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('Hello');
  });

  it('should fail for empty required string', () => {
    const result = validateString('', 'Name', { required: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should pass for empty optional string', () => {
    const result = validateString('', 'Name', { required: false });
    expect(result.valid).toBe(true);
  });

  it('should fail if below minLength', () => {
    const result = validateString('ab', 'Name', { minLength: 3 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3');
  });

  it('should fail if above maxLength', () => {
    const result = validateString('abcdef', 'Name', { maxLength: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at most 5');
  });

  it('should validate pattern', () => {
    const result = validateString('abc123', 'Code', { 
      pattern: /^[a-z]+$/, 
      patternMessage: 'Only letters allowed' 
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Only letters allowed');
  });
});

describe('validateEmail', () => {
  it('should pass for valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('user@example.com');
  });

  it('should lowercase email', () => {
    const result = validateEmail('User@EXAMPLE.COM');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('user@example.com');
  });

  it('should fail for invalid email format', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
    expect(validateEmail('spaces in@email.com').valid).toBe(false);
  });

  it('should fail for empty email', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });
});

describe('validatePhone', () => {
  it('should pass for valid phone numbers', () => {
    expect(validatePhone('+60123456789').valid).toBe(true);
    expect(validatePhone('012-345-6789').valid).toBe(true);
    expect(validatePhone('(012) 345 6789').valid).toBe(true);
  });

  it('should pass for empty phone (optional)', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(true);
  });

  it('should fail for invalid characters', () => {
    expect(validatePhone('abc123').valid).toBe(false);
    expect(validatePhone('012-ABC-6789').valid).toBe(false);
  });

  it('should fail if too long', () => {
    const result = validatePhone('123456789012345678901234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('20');
  });
});

describe('validateNumber', () => {
  it('should pass for valid positive number', () => {
    expect(validateNumber(10, 'Amount').valid).toBe(true);
    expect(validateNumber(0.5, 'Amount').valid).toBe(true);
  });

  it('should fail for zero by default', () => {
    const result = validateNumber(0, 'Amount');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be zero');
  });

  it('should allow zero when configured', () => {
    const result = validateNumber(0, 'Amount', { allowZero: true });
    expect(result.valid).toBe(true);
  });

  it('should fail below min', () => {
    const result = validateNumber(5, 'Amount', { min: 10 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 10');
  });

  it('should fail above max', () => {
    const result = validateNumber(100, 'Amount', { max: 50 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at most 50');
  });

  it('should fail for NaN', () => {
    const result = validateNumber(NaN, 'Amount');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a number');
  });
});

describe('validateLineItems', () => {
  it('should pass for valid line items', () => {
    const items = [
      { description: 'Service A', quantity: 2, unitPrice: 5000, amount: 10000 },
      { description: 'Service B', quantity: 1, unitPrice: 3000, amount: 3000 },
    ];
    const result = validateLineItems(items);
    expect(result.valid).toBe(true);
    expect(result.totalAmount).toBe(13000);
  });

  it('should fail for empty line items', () => {
    const result = validateLineItems([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one line item');
  });

  it('should fail for missing description', () => {
    const items = [{ description: '', quantity: 1, unitPrice: 1000, amount: 1000 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Description is required');
  });

  it('should fail for description too long', () => {
    const items = [{ description: 'x'.repeat(501), quantity: 1, unitPrice: 1000, amount: 1000 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should fail for zero quantity', () => {
    const items = [{ description: 'Service', quantity: 0, unitPrice: 1000, amount: 0 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Quantity must be positive');
  });

  it('should fail for negative quantity', () => {
    const items = [{ description: 'Service', quantity: -1, unitPrice: 1000, amount: -1000 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Quantity must be positive');
  });

  it('should fail for negative unit price', () => {
    const items = [{ description: 'Service', quantity: 1, unitPrice: -1000, amount: -1000 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be negative');
  });

  it('should fail for amount mismatch', () => {
    const items = [{ description: 'Service', quantity: 2, unitPrice: 1000, amount: 3000 }]; // Should be 2000
    const result = validateLineItems(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Amount mismatch');
  });

  it('should allow small float tolerance in amount', () => {
    // quantity * unitPrice = 1.5 * 1000 = 1500, but due to float we might get 1500.0000001
    const items = [{ description: 'Service', quantity: 1, unitPrice: 1000, amount: 1001 }];
    const result = validateLineItems(items);
    expect(result.valid).toBe(true); // Within tolerance of 1
  });
});

describe('validateSignatureData', () => {
  it('should pass for valid drawn signature', () => {
    const validBase64 = 'data:image/png;base64,iVBORw0KGgo=';
    const result = validateSignatureData('draw', validBase64);
    expect(result.valid).toBe(true);
  });

  it('should pass for valid typed signature', () => {
    const result = validateSignatureData('type', 'John Doe');
    expect(result.valid).toBe(true);
  });

  it('should fail for empty signature', () => {
    const result = validateSignatureData('draw', '');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should fail for invalid image format', () => {
    const result = validateSignatureData('draw', 'not-a-data-url');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid signature image format');
  });

  it('should fail for typed signature too short', () => {
    const result = validateSignatureData('type', 'X');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should fail for typed signature too long', () => {
    const result = validateSignatureData('type', 'A'.repeat(201));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should fail for image signature too large', () => {
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(600 * 1024);
    const result = validateSignatureData('draw', largeBase64);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });
});
