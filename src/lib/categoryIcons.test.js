import { describe, it, expect } from 'vitest'
import { resolveCategoryIcon, DEFAULT_CATEGORY_ICON } from './categoryIcons'

describe('resolveCategoryIcon — current categories (fixed icons)', () => {
  const cases = [
    ['Ichimliklar — Baklashka', '💧'],
    ['Ichimliklar — Banka', '🥫'],
    ['Ichimliklar — Butulka', '🍾'],
    ['Energetik — Banka', '⚡'],
    ['Energetik — Baklashka', '⚡'],
    ['Muzlatilgan mahsulotlar', '🧊'],
    ['Muzqaymoq', '🍦'],
    ['Pishirilgan kolbasa', '🌭'],
    ['Dudlangan kolbasa', '🌭'],
    ["Go'sht mahsulotlari", '🥩'],
    ['Pishloq', '🧀'],
    ['Sigaretlar', '🚬'],
    ['Sosiska', '🌭'],
    ['Tagaklar (Pampers)', '👶'],
  ]
  it.each(cases)('%s -> %s', (name, emoji) => {
    expect(resolveCategoryIcon(name)).toBe(emoji)
  })
})

describe('ordering: more specific keyword wins', () => {
  it('energetik beats the package keyword (banka/baklashka)', () => {
    expect(resolveCategoryIcon('Energetik — Banka')).toBe('⚡')
    expect(resolveCategoryIcon('Energetik — Baklashka')).toBe('⚡')
  })
  it('package keyword beats generic "ichimlik"', () => {
    expect(resolveCategoryIcon('Ichimliklar — Banka')).toBe('🥫')
    expect(resolveCategoryIcon('Ichimliklar — Butulka')).toBe('🍾')
  })
  it('plain Ichimliklar falls to the drink/water icon', () => {
    expect(resolveCategoryIcon('Ichimliklar')).toBe('💧')
  })
})

describe('case- and apostrophe-insensitive, Latin + Cyrillic', () => {
  it('is case-insensitive', () => {
    expect(resolveCategoryIcon('SIGARETLAR')).toBe('🚬')
    expect(resolveCategoryIcon('pishloq')).toBe('🧀')
  })
  it("handles different apostrophes in go'sht", () => {
    expect(resolveCategoryIcon("Go'sht mahsulotlari")).toBe('🥩')
    expect(resolveCategoryIcon('Goʻsht')).toBe('🥩')
    expect(resolveCategoryIcon('Gosht')).toBe('🥩')
  })
  it('matches Cyrillic names', () => {
    expect(resolveCategoryIcon('Мясо')).toBe('🥩')
    expect(resolveCategoryIcon('Сыр')).toBe('🧀')
    expect(resolveCategoryIcon('Сигареты')).toBe('🚬')
    expect(resolveCategoryIcon('Подгузники')).toBe('👶')
    expect(resolveCategoryIcon('Шампунь')).toBe('🧴')
  })
})

describe('future categories auto-resolve', () => {
  it('the required verify cases', () => {
    expect(resolveCategoryIcon('Sabzavotlar')).toBe('🥕')
    expect(resolveCategoryIcon('Parfyumeriya')).toBe('🧴')
    expect(resolveCategoryIcon('Sovunlar')).toBe('🧼')
  })

  it('personal-care members resolve sensibly', () => {
    expect(resolveCategoryIcon('Shampun')).toBe('🧴')
    expect(resolveCategoryIcon('Dezodorant')).toBe('🧴')
    expect(resolveCategoryIcon('Atir')).toBe('🧴')
    expect(resolveCategoryIcon('Krem')).toBe('🧴')
    expect(resolveCategoryIcon('Sovun')).toBe('🧼')
    expect(resolveCategoryIcon("Soch bo'yog'i")).toBe('🎨')
    expect(resolveCategoryIcon('Tish pastasi')).toBe('🪥')
    expect(resolveCategoryIcon('Kosmetika')).toBe('💄')
  })

  it('produce / pantry resolve', () => {
    expect(resolveCategoryIcon('Mevalar')).toBe('🍎')
    expect(resolveCategoryIcon('Non mahsulotlari')).toBe('🍞')
    expect(resolveCategoryIcon('Sut mahsulotlari')).toBe('🥛')
    expect(resolveCategoryIcon('Shirinliklar')).toBe('🍬')
    expect(resolveCategoryIcon('Choy')).toBe('🍵')
  })
})

describe('extra catalogue (products_extra.json) categories auto-resolve', () => {
  const cases = [
    // snacks & sweets
    ['Shokolad', '🍫'],
    ['Шоколад', '🍫'],
    ['Chips va sneklar', '🍟'],
    ['Чипсы', '🍟'],
    ['Saqich (jvachka)', '🍬'],
    ['Жвачка', '🍬'],
    ['Pechenye va vafli', '🍪'],
    ['Печенье', '🍪'],
    ['Konfetlar', '🍬'],
    ['Shakar', '🍬'],
    ['Сахар', '🍬'],
    ['Popcorn', '🍿'],
    ["Makkajo'xori", '🍿'],
    // hot drinks
    ['Kofe', '☕'],
    ['Кофе', '☕'],
    ['Choy', '🍵'],
    // pantry
    ['Makaron', '🍝'],
    ['Макароны', '🍝'],
    ['Lapsha (doshirak)', '🍜'],
    ['Лапша', '🍜'],
    ['Konservalar', '🥫'],
    ['Консервы', '🥫'],
    ['Mayonez va sous', '🥫'],
    ['Ketchup', '🥫'],
    ['Соус', '🥫'],
    ['Don mahsulotlari', '🌾'],
    ['Dukkaklilar', '🌾'],
    ['Yormalar', '🌾'],
    ['Крупа', '🌾'],
    // oils / dairy
    ["Yog'lar", '🧈'],
    ['Масло', '🧈'],
    ["Sariyog' va margarin", '🧈'],
    ['Quyultirilgan sut', '🥛'],
    // personal care
    ['Shampun', '🧴'],
    ['Шампунь', '🧴'],
    ['Dezodorant', '🧴'],
    ['Дезодорант', '🧴'],
    ['Tana parvarishi (krem)', '🧴'],
    ["Soch bo'yog'i", '🎨'],
    ['Краска для волос', '🎨'],
    ['Soqol olish (britva)', '🪒'],
    ['Ustara', '🪒'],
    ['Бритвы', '🪒'],
    ['Sovun', '🧼'],
    ['Мыло', '🧼'],
    ['Tish pastasi', '🪥'],
    ['Зубная паста', '🪥'],
    // household
    ['Kir yuvish kukuni', '🧴'],
    ['Стиральный порошок', '🧴'],
    ['Idish yuvish vositasi', '🧽'],
    ['Средство для посуды', '🧽'],
    ["Salfetka va qog'oz", '🧻'],
    ['Бумага', '🧻'],
    ['Hasharotlarga qarshi (dixlofos)', '🦟'],
  ]
  it.each(cases)('%s -> %s', (name, emoji) => {
    expect(resolveCategoryIcon(name)).toBe(emoji)
  })

  it('none of the extra categories fall back to the default icon', () => {
    for (const [name] of cases) {
      expect(resolveCategoryIcon(name)).not.toBe(DEFAULT_CATEGORY_ICON)
    }
  })
})

describe('ordering traps in the extra catalogue', () => {
  it('razor (ustara/britva/soqol) wins over the "yog\'" oil substring', () => {
    // "Soqol olish vositalari" etc. must hit 🪒, never the butter/oil 🧈.
    expect(resolveCategoryIcon('Soqol olish vositasi')).toBe('🪒')
    expect(resolveCategoryIcon('Ustara va britvalar')).toBe('🪒')
  })
  it('hair dye still wins over "yog\'" (regression)', () => {
    expect(resolveCategoryIcon("Soch bo'yog'i")).toBe('🎨')
  })
  it('dish-washing wins over the generic cleaning rule', () => {
    expect(resolveCategoryIcon('Idish yuvish vositasi')).toBe('🧽')
  })
  it('popcorn (makka) and pasta (makaron) do not collide', () => {
    expect(resolveCategoryIcon("Makkajo'xori (popcorn)")).toBe('🍿')
    expect(resolveCategoryIcon('Makaron mahsulotlari')).toBe('🍝')
  })
})

describe('default fallback (never a wrong icon)', () => {
  it('unknown names get the neutral default', () => {
    expect(resolveCategoryIcon('Nimadir tushunarsiz')).toBe(DEFAULT_CATEGORY_ICON)
    expect(resolveCategoryIcon('Xyz 123')).toBe(DEFAULT_CATEGORY_ICON)
  })
  it('empty / nullish names get the default', () => {
    expect(resolveCategoryIcon('')).toBe(DEFAULT_CATEGORY_ICON)
    expect(resolveCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON)
    expect(resolveCategoryIcon(undefined)).toBe(DEFAULT_CATEGORY_ICON)
  })
  it('default is 🛒 (cart), not 📦/wrong', () => {
    expect(DEFAULT_CATEGORY_ICON).toBe('🛒')
  })
})

describe('explicit override (optional)', () => {
  it('a non-empty override wins over auto-resolution', () => {
    expect(resolveCategoryIcon('Sigaretlar', '🎯')).toBe('🎯')
  })
  it('a blank override falls back to auto', () => {
    expect(resolveCategoryIcon('Sigaretlar', '   ')).toBe('🚬')
  })
})
