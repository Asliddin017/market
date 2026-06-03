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

  // --- frozen --------------------------------------------------------------
  { emoji: '🍦', keys: ['muzqaymoq', 'morojen', 'morojniy', 'морож'] },
  { emoji: '🧊', keys: ['muzlat', 'frozen', 'замор'] },

  // --- meat & deli ---------------------------------------------------------
  { emoji: '🌭', keys: ['kolbasa', 'sosiska', 'колбас', 'сосиск'] },
  { emoji: '🥩', keys: ["go'sht", 'gosht', 'мясо', 'мяс'] },

  // --- dairy & eggs --------------------------------------------------------
  { emoji: '🧀', keys: ['pishloq', 'сыр'] },
  { emoji: '🥛', keys: ['sut', 'молоч', 'молоко'] },
  { emoji: '🥚', keys: ['tuxum', 'яйцо', 'яйц'] },

  // --- non-food staples ----------------------------------------------------
  { emoji: '🚬', keys: ['sigaret', 'tamaki', 'сигарет', 'табак'] },
  { emoji: '👶', keys: ['tagak', 'taglik', 'pampers', 'подгуз', 'памперс'] },

  // --- produce / bakery / pantry ------------------------------------------
  { emoji: '🥕', keys: ['sabzavot', 'овощ'] },
  { emoji: '🍎', keys: ['meva', 'фрукт'] },
  { emoji: '🍞', keys: ['non', 'bulochka', 'хлеб'] },
  { emoji: '🍬', keys: ['shirinlik', 'konfet', 'конфет', 'сладк'] },
  { emoji: '🥫', keys: ['konserva', 'консерв'] },

  // --- parfyumeriya / personal care (a category added later) ---------------
  // Hair dye BEFORE the generic "yog'" (oil) rule: "Soch bo'yog'i" normalises
  // to "soch boyogi", which contains "yog" — so 🎨 must win first, else it
  // would fall to the butter/oil icon 🧈.
  { emoji: '🎨', keys: ["soch bo'yog", 'soch boyog', "bo'yoq", 'boyoq', 'краска для волос'] },

  // Generic edible oil/butter — kept AFTER hair-dye so it can't steal "boyog".
  { emoji: '🧈', keys: ["yog'", 'yog', 'масло'] },
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
      'krem', 'крем',
    ],
  },
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
