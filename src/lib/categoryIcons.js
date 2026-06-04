// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for category emojis.
//
// Framework-free + pure (imported by both the browser app and the Node seed
// script). Maps a category NAME -> emoji by KEYWORD matching (case-insensitive,
// Latin + Cyrillic, apostrophe-insensitive), so any NEW category an admin adds
// later automatically gets a sensible icon. If nothing matches we return a
// neutral default (🛒) — never a wrong/misleading icon.
//
// Used by: mapCategory (data layer) -> category cards, product-card badges,
// filters, quick-add, etc. all read category.icon, which comes from here.
// ---------------------------------------------------------------------------

export const DEFAULT_CATEGORY_ICON = '🛒'

// Normalise for matching: lowercase + strip the various apostrophes so
// "Go'sht" / "Goʻsht" / "Gosht" all compare equal.
const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/['ʻʼ`’]/g, '')

// Ordered rules — FIRST match wins, so put the more specific keyword first.
// e.g. "Energetik — Banka" must hit `energetik` (⚡) before `banka` (🥫), and
// package keywords (banka/butulka) must beat the generic `ichimlik`.
const RULES = [
  // --- drinks & their packaging --------------------------------------------
  { emoji: '⚡', keys: ['energetik', 'энергет'] },
  { emoji: '🍾', keys: ['butulka', 'butilka', 'бутыл'] },
  { emoji: '🥫', keys: ['banka', 'банк'] },
  { emoji: '💧', keys: ['baklashka', 'baklajka', 'ichimlik', 'suv', 'напит', 'вода'] },
  { emoji: '🍵', keys: ['choy', 'чай'] },
  { emoji: '☕', keys: ['kofe', 'кофе', 'кофей'] },

  // --- frozen --------------------------------------------------------------
  { emoji: '🍦', keys: ['muzqaymoq', 'morojen', 'morojniy', 'морож'] },
  { emoji: '🧊', keys: ['muzlat', 'frozen', 'замор'] },

  // --- meat & deli ---------------------------------------------------------
  { emoji: '🌭', keys: ['kolbasa', 'sosiska', 'колбас', 'сосиск'] },
  { emoji: '🥩', keys: ["go'sht", 'gosht', 'мясо', 'мяс'] },

  // --- dairy & eggs --------------------------------------------------------
  { emoji: '🧀', keys: ['pishloq', 'сыр'] },
  // "quyultirilgan sut" (condensed milk) also lands here via the `sut` key.
  { emoji: '🥛', keys: ['sut', 'молоч', 'молоко'] },
  { emoji: '🥚', keys: ['tuxum', 'яйцо', 'яйц'] },

  // --- non-food staples ----------------------------------------------------
  { emoji: '🚬', keys: ['sigaret', 'tamaki', 'сигарет', 'табак'] },
  { emoji: '👶', keys: ['tagak', 'taglik', 'pampers', 'подгуз', 'памперс'] },

  // --- snacks & sweets -----------------------------------------------------
  { emoji: '🍫', keys: ['shokolad', 'шоколад'] },
  // popcorn / corn BEFORE the generic snack rule (neither shares a substring
  // with the others, but keep the edible-corn intent explicit).
  { emoji: '🍿', keys: ['popcorn', "makkajo'xori", 'makkajoxori', 'кукуруз'] },
  { emoji: '🍟', keys: ['chips', 'snek', 'snack', 'чипс'] },
  { emoji: '🍪', keys: ['pechenye', 'pechene', 'vafli', 'vafel', 'печенье', 'вафл'] },
  // Sweets & gum & sugar.
  {
    emoji: '🍬',
    keys: [
      'shirinlik', 'konfet', 'конфет', 'сладк',
      'saqich', 'jvachka', 'jevachka', 'жвачк',
      'shakar', 'сахар',
    ],
  },

  // --- pantry: pasta / noodles / canned / sauces / grains ------------------
  { emoji: '🍝', keys: ['makaron', 'макарон', 'spagetti', 'спагетти'] },
  { emoji: '🍜', keys: ['lapsha', 'лапша', 'doshirak', 'доширак'] },
  { emoji: '🥫', keys: ['konserva', 'консерв', 'tushonka', 'тушен'] },
  { emoji: '🥫', keys: ['mayonez', 'майонез', 'ketchup', 'kechup', 'кетчуп', 'sous', 'соус'] },
  // Grains / cereals / legumes. `dukkak` + `yorma` + `крупа` cover the usual
  // names ("Don va dukkaklilar", "Yormalar (krupa)"); `don mahsulot` covers
  // "Don mahsulotlari" without a bare "don" that could over-match.
  {
    emoji: '🌾',
    keys: ['don mahsulot', 'donli', 'dukkak', 'yorma', "yormalar", 'крупа', 'крупы', "g'alla", 'galla'],
  },

  // --- produce / bakery ----------------------------------------------------
  { emoji: '🥕', keys: ['sabzavot', 'овощ'] },
  { emoji: '🍎', keys: ['meva', 'фрукт'] },
  { emoji: '🍞', keys: ['non', 'bulochka', 'хлеб'] },

  // --- parfyumeriya / personal care ----------------------------------------
  // Hair dye BEFORE the generic "yog'" (oil) rule: "Soch bo'yog'i" normalises
  // to "soch boyogi", which contains "yog" — so 🎨 must win first, else it
  // would fall to the butter/oil icon 🧈.
  { emoji: '🎨', keys: ["soch bo'yog", 'soch boyog', "bo'yoq", 'boyoq', 'краска для волос'] },

  // Razor / shaving — ALSO before "yog'" for the same substring-trap reason
  // (and so it can never fall to the oil icon). "soqol"/"ustara"/"britva".
  { emoji: '🪒', keys: ['soqol', 'ustara', 'britva', 'бритв', 'станок для брит'] },

  // Generic edible oil/butter — kept AFTER hair-dye & razor so neither can be
  // stolen by the "yog"/"масло" substring. "sariyog'"/"margarin" land here too.
  { emoji: '🧈', keys: ["yog'", 'yog', 'масло', 'margarin', 'маргарин', 'сливочн'] },
  { emoji: '🪥', keys: ['tish pasta', 'tish', 'зубн'] },
  { emoji: '🧼', keys: ['sovun', 'мыло', 'gigiyena', 'гигиен'] },
  { emoji: '💄', keys: ['kosmetik', 'косметик', 'upa', 'pardoz', 'помад'] },
  // Generic care -> lotion bottle (shampoo, deodorant, cream, perfume, atir).
  {
    emoji: '🧴',
    keys: [
      'parfyum', 'parfumer', 'atir', 'духи', 'парфюм',
      'shampun', 'шампун',
      'dezodorant', 'dezadarant', 'дезодор',
      'krem', 'крем', 'tana parvarish',
    ],
  },

  // --- household cleaning --------------------------------------------------
  // Dish-washing BEFORE the generic laundry/cleaning rule.
  { emoji: '🧽', keys: ['idish yuvish', 'idish-yuvish', 'средство для посуд', 'для посуд'] },
  { emoji: '🧴', keys: ['kir yuvish', 'tozalash', 'стирк', 'порош', 'стиральн'] },
  { emoji: '🧻', keys: ['salfetka', "qog'oz", 'qogoz', 'салфет', 'бумаг'] },

  // --- pest control --------------------------------------------------------
  { emoji: '🦟', keys: ['hasharot', 'dixlofos', 'дихлофос', 'от насеком'] },
]

/**
 * Resolve a category name to an emoji.
 * @param {string} name - category name (any language/case).
 * @param {string} [override] - optional explicit emoji; if a non-empty string,
 *   it wins (lets an admin force an icon). Auto-resolution is the default.
 * @returns {string} the matched emoji, the override, or the neutral default.
 */
export function resolveCategoryIcon(name, override) {
  if (typeof override === 'string' && override.trim() !== '') return override.trim()
  const n = normalize(name)
  if (!n) return DEFAULT_CATEGORY_ICON
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.emoji
  }
  return DEFAULT_CATEGORY_ICON
}
