/**
 * Unit tests for utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatDistanceToNow, 
  formatDistanceToFuture,
  formatDate, 
  formatCurrency,
  cn,
} from './utils';

describe('cn (className merge)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge tailwind classes correctly', () => {
    // Later class should override earlier
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});

describe('formatDistanceToNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for less than 60 seconds', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 30 * 1000)).toBe('just now');
    expect(formatDistanceToNow(now - 59 * 1000)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 60 * 1000)).toBe('1 minute ago');
    expect(formatDistanceToNow(now - 5 * 60 * 1000)).toBe('5 minutes ago');
    expect(formatDistanceToNow(now - 59 * 60 * 1000)).toBe('59 minutes ago');
  });

  it('should return hours ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 60 * 60 * 1000)).toBe('1 hour ago');
    expect(formatDistanceToNow(now - 3 * 60 * 60 * 1000)).toBe('3 hours ago');
    expect(formatDistanceToNow(now - 23 * 60 * 60 * 1000)).toBe('23 hours ago');
  });

  it('should return days ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 24 * 60 * 60 * 1000)).toBe('1 day ago');
    expect(formatDistanceToNow(now - 5 * 24 * 60 * 60 * 1000)).toBe('5 days ago');
  });

  it('should return weeks ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 7 * 24 * 60 * 60 * 1000)).toBe('1 week ago');
    expect(formatDistanceToNow(now - 3 * 7 * 24 * 60 * 60 * 1000)).toBe('3 weeks ago');
  });

  it('should return months ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 35 * 24 * 60 * 60 * 1000)).toBe('1 month ago');
    expect(formatDistanceToNow(now - 90 * 24 * 60 * 60 * 1000)).toBe('3 months ago');
  });

  it('should return years ago', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToNow(now - 400 * 24 * 60 * 60 * 1000)).toBe('1 year ago');
    expect(formatDistanceToNow(now - 800 * 24 * 60 * 60 * 1000)).toBe('2 years ago');
  });
});

describe('formatDistanceToFuture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "in a few seconds" for less than 60 seconds', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToFuture(now + 30 * 1000)).toBe('in a few seconds');
  });

  it('should return "in X minutes"', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToFuture(now + 60 * 1000)).toBe('in 1 minute');
    expect(formatDistanceToFuture(now + 5 * 60 * 1000)).toBe('in 5 minutes');
  });

  it('should return "in X hours"', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToFuture(now + 60 * 60 * 1000)).toBe('in 1 hour');
    expect(formatDistanceToFuture(now + 3 * 60 * 60 * 1000)).toBe('in 3 hours');
  });

  it('should return "in X days"', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    expect(formatDistanceToFuture(now + 24 * 60 * 60 * 1000)).toBe('in 1 day');
    expect(formatDistanceToFuture(now + 5 * 24 * 60 * 60 * 1000)).toBe('in 5 days');
  });

  it('should fall back to formatDistanceToNow for past dates', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    // Past date should use "ago" format
    const result = formatDistanceToFuture(now - 5 * 60 * 1000);
    expect(result).toContain('ago');
  });
});

describe('formatDate', () => {
  it('should format timestamp to locale date string', () => {
    // Jan 15, 2026
    const timestamp = new Date('2026-01-15T12:00:00Z').getTime();
    const result = formatDate(timestamp);
    
    // Should contain year, month abbreviation, and day
    expect(result).toContain('2026');
    expect(result).toContain('15');
    // Month format depends on locale but should contain Jan
    expect(result).toMatch(/Jan/i);
  });
});

describe('formatCurrency', () => {
  it('should format cents to MYR currency', () => {
    expect(formatCurrency(10000)).toContain('100');
    expect(formatCurrency(10050)).toContain('100.50');
    expect(formatCurrency(99)).toContain('0.99');
  });

  it('should include currency symbol or code', () => {
    const result = formatCurrency(10000);
    // Should contain RM or MYR
    expect(result.match(/RM|MYR/)).toBeTruthy();
  });

  it('should handle zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle large amounts', () => {
    // 1,000,000 cents = RM 10,000
    const result = formatCurrency(1000000);
    expect(result).toContain('10');
    expect(result).toContain('000');
  });
});
