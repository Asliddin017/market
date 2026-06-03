import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidUzPhone, formatPhone, telHref } from './phone'

describe('normalizePhone (Uzbek)', () => {
  it('accepts +998 + 9 digits', () => {
    expect(normalizePhone('+998500170099')).toBe('+998500170099')
  })
  it('accepts 998 + 9 digits (no plus)', () => {
    expect(normalizePhone('998500170099')).toBe('+998500170099')
  })
  it('accepts 9 local digits', () => {
    expect(normalizePhone('500170099')).toBe('+998500170099')
  })
  it('ignores spaces, dashes, parens and dots', () => {
    expect(normalizePhone('+998 50 017 00 99')).toBe('+998500170099')
    expect(normalizePhone('(998) 90-123-45-67')).toBe('+998901234567')
    expect(normalizePhone('90.123.45.67')).toBe('+998901234567')
  })
  it('rejects empty / too short / too long / nullish', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('   ')).toBeNull()
    expect(normalizePhone('12345')).toBeNull() // 5 digits
    expect(normalizePhone('5001700990')).toBeNull() // 10 digits
    expect(normalizePhone('+9985001700990')).toBeNull() // 13 digits
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
  })
  it('rejects a wrong country code of the right length', () => {
    expect(normalizePhone('+997500170099')).toBeNull() // 12 digits but not 998
  })
})

describe('isValidUzPhone', () => {
  it('mirrors normalizePhone', () => {
    expect(isValidUzPhone('+998500170099')).toBe(true)
    expect(isValidUzPhone('500170099')).toBe(true)
    expect(isValidUzPhone('123')).toBe(false)
    expect(isValidUzPhone('')).toBe(false)
  })
})

describe('formatPhone / telHref', () => {
  it('pretty-prints a valid number', () => {
    expect(formatPhone('998500170099')).toBe('+998 50 017 00 99')
  })
  it('returns the raw input when invalid', () => {
    expect(formatPhone('abc')).toBe('abc')
  })
  it('telHref gives a clean +998 number', () => {
    expect(telHref('+998 50 017 00 99')).toBe('+998500170099')
  })
})
