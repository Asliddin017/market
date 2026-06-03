import { describe, it, expect } from 'vitest'
import { mapProduct, mapCategory, mapProfile, mapOrder, mapOrderItem, mapContact } from './useData'

describe('row <-> app mappers (snake_case -> camelCase)', () => {
  it('mapProduct maps every field and defaults image to null', () => {
    const row = {
      id: 'p1',
      name: 'Olma',
      category_id: 'c1',
      price: 12000,
      unit: 'kg',
      image_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }
    expect(mapProduct(row)).toEqual({
      id: 'p1',
      name: 'Olma',
      categoryId: 'c1',
      price: 12000,
      unit: 'kg',
      image: null,
      soldByPiece: false,
      piecePrice: null,
      pieceBundleQty: null,
      pieceBundlePrice: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })
  })

  it('mapProduct passes through an image_url when present', () => {
    expect(mapProduct({ id: 'p', image_url: 'data:abc' }).image).toBe('data:abc')
  })

  it('mapProduct maps per-piece (cigarette) config', () => {
    const m = mapProduct({
      id: 'cig',
      sold_by_piece: true,
      piece_price: 2000,
      piece_bundle_qty: 3,
      piece_bundle_price: 5000,
    })
    expect(m).toMatchObject({
      soldByPiece: true,
      piecePrice: 2000,
      pieceBundleQty: 3,
      pieceBundlePrice: 5000,
    })
  })

  it('mapCategory resolves the icon from the NAME (ignores stored emoji)', () => {
    // Stored emoji is wrong/legacy on purpose — the resolver wins.
    const row = { id: 'c1', name: 'Sut', slug: 'sut', emoji: '🍼', created_at: 't', updated_at: 't2' }
    expect(mapCategory(row)).toEqual({
      id: 'c1',
      name: 'Sut',
      slug: 'sut',
      icon: '🥛', // resolved from "Sut", not the stored 🍼
      hiddenForClients: false,
      createdAt: 't',
      updatedAt: 't2',
    })
    expect(mapCategory({ id: 'c2', name: 'Energetik — Banka' }).icon).toBe('⚡')
    expect(mapCategory({ id: 'c3', name: 'Nomalum kategoriya' }).icon).toBe('🛒') // default
  })

  it('mapCategory carries the hidden_for_clients flag', () => {
    expect(mapCategory({ id: 'c', name: 'Sigaretlar', hidden_for_clients: true }).hiddenForClients).toBe(true)
    expect(mapCategory({ id: 'c', name: 'Pishloq' }).hiddenForClients).toBe(false)
  })

  it('mapContact maps snake_case + defaults', () => {
    const row = {
      id: 'k1', label: 'Asosiy', name: 'Asliddin', phone: '+998500170099',
      is_primary: true, sort_order: 0, created_at: 't', updated_at: 't2',
    }
    expect(mapContact(row)).toEqual({
      id: 'k1', label: 'Asosiy', name: 'Asliddin', phone: '+998500170099',
      isPrimary: true, sortOrder: 0, createdAt: 't', updatedAt: 't2',
    })
    const bare = mapContact({ id: 'k2', name: 'X', phone: '+998901112233' })
    expect(bare.isPrimary).toBe(false)
    expect(bare.sortOrder).toBe(0)
    expect(bare.label).toBeNull()
  })

  it('mapProfile maps username/role/createdAt', () => {
    const row = { id: 'u1', username: 'asliddin', role: 'admin', created_at: 't' }
    expect(mapProfile(row)).toEqual({ id: 'u1', username: 'asliddin', role: 'admin', createdAt: 't' })
  })

  it('mapOrderItem maps snapshot columns to camelCase', () => {
    const row = {
      id: 'oi1',
      order_id: 'o1',
      product_id: 'p1',
      name_snapshot: 'Cola (banka)',
      unit: 'dona',
      original_price: 13000,
      custom_price: 18000,
      quantity: 2,
      is_available: false,
      sold_by_piece: true,
      piece_price: 2000,
      piece_bundle_qty: 3,
      piece_bundle_price: 5000,
      sell_mode: 'dona',
    }
    expect(mapOrderItem(row)).toEqual({
      id: 'oi1',
      orderId: 'o1',
      productId: 'p1',
      name: 'Cola (banka)',
      unit: 'dona',
      originalPrice: 13000,
      customPrice: 18000,
      quantity: 2,
      isAvailable: false,
      soldByPiece: true,
      piecePrice: 2000,
      pieceBundleQty: 3,
      pieceBundlePrice: 5000,
      sellMode: 'dona',
    })
  })

  it('mapOrderItem defaults custom_price/product_id to null', () => {
    const m = mapOrderItem({ id: 'x', order_id: 'o', name_snapshot: 'A', unit: 'dona', original_price: 1, quantity: 1, is_available: true })
    expect(m.customPrice).toBeNull()
    expect(m.productId).toBeNull()
  })

  it('mapOrder maps fields, nested items and joined client name', () => {
    const row = {
      id: 'o1',
      client_id: 'c1',
      status: 'tayyor',
      total: 26000,
      note: null,
      created_at: 't1',
      updated_at: 't2',
      ready_at: 't3',
      client_name: 'Ali Valiyev',
      client_phone: '+998901234567',
      profiles: { username: 'ali' },
      order_items: [
        { id: 'oi1', order_id: 'o1', product_id: null, name_snapshot: 'A', unit: 'dona', original_price: 13000, custom_price: null, quantity: 2, is_available: true },
      ],
    }
    const m = mapOrder(row)
    expect(m).toMatchObject({
      id: 'o1',
      clientId: 'c1',
      status: 'tayyor',
      total: 26000,
      createdAt: 't1',
      updatedAt: 't2',
      readyAt: 't3',
      clientName: 'ali',
      customerName: 'Ali Valiyev',
      customerPhone: '+998901234567',
    })
    expect(m.items).toHaveLength(1)
    expect(m.items[0].name).toBe('A')
  })

  it('mapOrder leaves items undefined when not selected (lets callers tell "not loaded" from [])', () => {
    const m = mapOrder({ id: 'o2', client_id: 'c', status: 'buyurtma_berildi', total: 0, created_at: 't', updated_at: 't' })
    expect(m.items).toBeUndefined()
    expect(m.clientName).toBeNull()
  })
})
