import { describe, it, expect } from 'vitest';
import { assert, assertDefined } from '../src/utils/assert';

describe('assert utility', () => {
  it('should not throw if condition is truthy', () => {
    expect(() => assert(true)).not.toThrow();
    expect(() => assert('hello')).not.toThrow();
    expect(() => assert(123)).not.toThrow();
    expect(() => assert({})).not.toThrow();
  });

  it('should throw if condition is falsy', () => {
    expect(() => assert(false)).toThrow('Assertion failed');
    expect(() => assert(0)).toThrow('Assertion failed');
    expect(() => assert('')).toThrow('Assertion failed');
    expect(() => assert(null)).toThrow('Assertion failed');
  });

  it('should throw with custom message', () => {
    expect(() => assert(false, 'Custom error message')).toThrow('Custom error message');
  });
});

describe('assertDefined utility', () => {
  it('should not throw if value is defined', () => {
    expect(() => assertDefined('hello')).not.toThrow();
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined(false)).not.toThrow();
    expect(() => assertDefined({})).not.toThrow();
  });

  it('should throw if value is null or undefined', () => {
    expect(() => assertDefined(null)).toThrow('Expected value to be defined, but got null');
    expect(() => assertDefined(undefined)).toThrow(
      'Expected value to be defined, but got undefined'
    );
  });

  it('should throw with custom message', () => {
    expect(() => assertDefined(null, 'Must be defined')).toThrow('Must be defined');
  });
});
