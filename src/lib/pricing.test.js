import { describe, it, expect } from 'vitest'
import {
  SELL_MODE,
  canEditPrice,
  canSellByPiece,
  isPieceMode,
  piecesTotal,
  unitPrice,
  lineTotal,
  total,
  displayUnit,
} from './pricing'

// ---- CHANGE A: price editing allowed only for kg -------------------------
describe('canEditPrice (Change A — kg only)', () => {
  it('is true for kg (scale) items', () => {
    expect(canEditPrice({ unit: 'kg' })).toBe(true)
  })
  it('is false for dona / litr (fixed-price packages)', () => {
    expect(canEditPrice({ unit: 'dona' })).toBe(false)
    expect(canEditPrice({ unit: 'litr' })).toBe(false)
  })
})

describe('unitPrice honors custom only for kg', () => {
  it('uses the custom price for a kg item (35000 -> 40000)', () => {
    expect(unitPrice({ unit: 'kg', price: 35000, customPrice: 40000 })).toBe(40000)
  })
  it('IGNORES a custom price on a dona item (price stays fixed)', () => {
    // A 42000 pack cannot be sold as 38000.
    expect(unitPrice({ unit: 'dona', price: 42000, customPrice: 38000 })).toBe(42000)
  })
  it('falls back to the real price when there is no custom price', () => {
    expect(unitPrice({ unit: 'kg', price: 35000, customPrice: null })).toBe(35000)
  })
  it('works on order-item shape (originalPrice)', () => {
    expect(unitPrice({ unit: 'kg', originalPrice: 35000, customPrice: 40000 })).toBe(40000)
    expect(unitPrice({ unit: 'dona', originalPrice: 42000, customPrice: 38000 })).toBe(42000)
  })
})

// ---- CHANGE B: cigarette piece pricing -----------------------------------
const FLAT = { piecePrice: 1000, pieceBundleQty: null, pieceBundlePrice: null } // specials
const BUNDLE = { piecePrice: 2000, pieceBundleQty: 3, pieceBundlePrice: 5000 } // others

describe('piecesTotal — specials (flat 1000/piece, no bundle)', () => {
  it('is a flat qty * 1000', () => {
    expect(piecesTotal(1, FLAT)).toBe(1000)
    expect(piecesTotal(2, FLAT)).toBe(2000)
    expect(piecesTotal(3, FLAT)).toBe(3000)
    expect(piecesTotal(6, FLAT)).toBe(6000)
  })
})

describe('piecesTotal — others (2000/piece, 3 = 5000)', () => {
  it('matches the spec table exactly', () => {
    expect(piecesTotal(1, BUNDLE)).toBe(2000)
    expect(piecesTotal(2, BUNDLE)).toBe(4000)
    expect(piecesTotal(3, BUNDLE)).toBe(5000)
    expect(piecesTotal(4, BUNDLE)).toBe(7000)
    expect(piecesTotal(5, BUNDLE)).toBe(9000)
    expect(piecesTotal(6, BUNDLE)).toBe(10000)
  })
  it('handles larger bundles (7 = 2 bundles + 1, 9 = 3 bundles)', () => {
    expect(piecesTotal(7, BUNDLE)).toBe(2 * 5000 + 1 * 2000) // 12000
    expect(piecesTotal(9, BUNDLE)).toBe(3 * 5000) // 15000
  })
})

describe('isPieceMode / canSellByPiece', () => {
  it('only flags piece mode when sold_by_piece AND dona mode', () => {
    expect(canSellByPiece({ soldByPiece: true })).toBe(true)
    expect(isPieceMode({ soldByPiece: true, sellMode: SELL_MODE.PIECE })).toBe(true)
    expect(isPieceMode({ soldByPiece: true, sellMode: SELL_MODE.PACK })).toBe(false)
    expect(isPieceMode({ soldByPiece: false, sellMode: SELL_MODE.PIECE })).toBe(false)
  })
})

describe('lineTotal across modes', () => {
  it('cigarette in PACK mode uses pack price * qty', () => {
    const it = { soldByPiece: true, sellMode: SELL_MODE.PACK, unit: 'dona', price: 22000, qty: 2, ...BUNDLE }
    expect(lineTotal(it)).toBe(44000)
  })
  it('cigarette in DONA mode uses bundle math (6 = 10000)', () => {
    const it = { soldByPiece: true, sellMode: SELL_MODE.PIECE, unit: 'dona', price: 22000, qty: 6, ...BUNDLE }
    expect(lineTotal(it)).toBe(10000)
  })
  it('special cigarette in DONA mode is flat (5 = 5000)', () => {
    const it = { soldByPiece: true, sellMode: SELL_MODE.PIECE, unit: 'dona', price: 18000, qty: 5, ...FLAT }
    expect(lineTotal(it)).toBe(5000)
  })
  it('kg item uses custom price * qty', () => {
    expect(lineTotal({ unit: 'kg', price: 35000, customPrice: 40000, qty: 2 })).toBe(80000)
  })
  it('dona pack ignores custom and uses fixed price * qty', () => {
    expect(lineTotal({ unit: 'dona', price: 42000, customPrice: 38000, qty: 2 })).toBe(84000)
  })
})

describe('total', () => {
  it('sums available lines only', () => {
    const items = [
      { unit: 'kg', price: 1000, qty: 2 }, // 2000
      { unit: 'dona', price: 5000, qty: 1, isAvailable: false }, // excluded
      { soldByPiece: true, sellMode: SELL_MODE.PIECE, qty: 3, ...BUNDLE }, // 5000
    ]
    expect(total(items)).toBe(7000)
  })
})

describe('displayUnit', () => {
  it('shows pachka/dona for cigarettes, real unit otherwise', () => {
    expect(displayUnit({ soldByPiece: true, sellMode: SELL_MODE.PIECE })).toBe('dona')
    expect(displayUnit({ soldByPiece: true, sellMode: SELL_MODE.PACK })).toBe('pachka')
    expect(displayUnit({ unit: 'kg' })).toBe('kg')
  })
})
