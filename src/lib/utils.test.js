import { describe, it, expect } from 'vitest'
import { slugify, toTitleCase, formatSom, toTime, formatDateTime, hueFromString } from './utils'

describe('toTitleCase', () => {
  it('title-cases a single Latin word', () => {
    expect(toTitleCase('KATTA')).toBe('Katta')
  })

  it('title-cases multiple Latin words and collapses whitespace', () => {
    expect(toTitleCase('  kATTa   suv ')).toBe('Katta Suv')
  })

  it('handles Cyrillic (locale-aware) words', () => {
    expect(toTitleCase('набеглави')).toBe('Набеглави')
  })

  it('uppercases after hyphen / slash / paren, keeps digits intact', () => {
    expect(toTitleCase('тян-шан (1.5)')).toBe('Тян-Шан (1.5)')
    expect(toTitleCase('coca-cola/pepsi')).toBe('Coca-Cola/Pepsi')
  })

  it('leaves an empty string empty and tolerates undefined', () => {
    expect(toTitleCase('')).toBe('')
    expect(toTitleCase()).toBe('')
  })
})

describe('slugify', () => {
  it('builds a url-safe slug from a Latin name', () => {
    expect(slugify('Energetik ichimliklar')).toBe('energetik-ichimliklar')
  })

  it('drops apostrophes and collapses dashes', () => {
    expect(slugify("Go'sht  mahsulotlari")).toBe('gosht-mahsulotlari')
  })

  it('falls back to a generated slug when nothing latin remains (Cyrillic)', () => {
    const s = slugify('Ичимликлар')
    expect(s.startsWith('kat-')).toBe(true)
  })
})

describe('formatSom', () => {
  // ru-RU groups thousands with a non-breaking space (U+00A0); normalise all
  // whitespace to a plain space so the assertion is stable across ICU versions.
  const norm = (v) => formatSom(v).replace(/\s/g, ' ')

  it('formats thousands with a space separator', () => {
    expect(norm(18000)).toBe("18 000 so'm")
    expect(norm(1234567)).toBe("1 234 567 so'm")
  })

  it('treats null / NaN / undefined as 0', () => {
    expect(norm(null)).toBe("0 so'm")
    expect(norm(undefined)).toBe("0 so'm")
    expect(norm('abc')).toBe("0 so'm")
  })
})

describe('toTime', () => {
  it('parses ISO strings and epoch numbers', () => {
    expect(toTime(0)).toBe(0)
    expect(toTime('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'))
    expect(toTime(1700000000000)).toBe(1700000000000)
  })

  it('returns 0 for null/garbage', () => {
    expect(toTime(null)).toBe(0)
    expect(toTime('not-a-date')).toBe(0)
  })
})

describe('formatDateTime', () => {
  it('formats a known timestamp as DD.MM.YYYY HH:MM', () => {
    // Build a local-time date so the test does not depend on the runner's TZ.
    const d = new Date(2026, 0, 9, 7, 5) // 9 Jan 2026, 07:05 local
    expect(formatDateTime(d.toISOString())).toBe('09.01.2026 07:05')
  })

  it('returns an em dash for empty / invalid input', () => {
    expect(formatDateTime('')).toBe('—')
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('garbage')).toBe('—')
  })
})

describe('hueFromString', () => {
  it('is deterministic and within 0..359', () => {
    const a = hueFromString('Olma')
    const b = hueFromString('Olma')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(360)
  })
})
