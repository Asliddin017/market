// ---------------------------------------------------------------------------
// Lightweight, performance-first category background themes.
//
// Each theme is pure CSS: a flat `base` gradient + a few soft "glow" blobs that
// use radial-gradient backgrounds (NOT the expensive `filter: blur`). Blobs are
// animated only with GPU-friendly transforms (see the `blob` keyframes in
// tailwind.config.js), so this stays smooth on weak phones.
//
// HOW TO ADD A NEW CATEGORY BACKGROUND:
//   add an entry keyed by the category SLUG (see db.js / saveCategory()).
//   If a category has no entry here, `resolveThemeKey` falls back to 'default',
//   so the app never breaks.
// ---------------------------------------------------------------------------

/** Build a soft circular glow as a radial-gradient (cheap to composite). */
const glow = (color, x, y, size, delay = '0s') => ({
  background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
  left: x,
  top: y,
  width: size,
  height: size,
  delay,
})

export const CATEGORY_THEMES = {
  // Neutral brand background used across most of the app.
  default: {
    base: 'radial-gradient(120% 120% at 80% -10%, #0b2a22 0%, #060912 55%)',
    blobs: [
      glow('rgba(16,185,129,0.35)', '70%', '-10%', '42rem'),
      glow('rgba(245,158,11,0.14)', '-10%', '80%', '36rem', '6s'),
    ],
  },

  // Login / hero — vivid, branded, energetic.
  login: {
    base: 'radial-gradient(120% 120% at 50% 0%, #0d3b2e 0%, #061018 60%)',
    blobs: [
      glow('rgba(16,185,129,0.45)', '55%', '-15%', '46rem'),
      glow('rgba(20,184,166,0.30)', '-10%', '40%', '40rem', '4s'),
      glow('rgba(245,158,11,0.18)', '75%', '70%', '34rem', '9s'),
    ],
  },

  // Energy drinks — vivid, high-energy (electric violet + lime + amber).
  'energetik-ichimliklar': {
    base: 'radial-gradient(120% 120% at 75% -10%, #2a1147 0%, #0a0614 60%)',
    blobs: [
      glow('rgba(168,85,247,0.45)', '65%', '-15%', '44rem'),
      glow('rgba(132,204,22,0.32)', '-12%', '55%', '40rem', '5s'),
      glow('rgba(245,158,11,0.30)', '80%', '75%', '32rem', '10s'),
    ],
  },

  // Drinks — fresh, cool, refreshing blues & cyans.
  ichimliklar: {
    base: 'radial-gradient(120% 120% at 70% -10%, #06314a 0%, #04101c 60%)',
    blobs: [
      glow('rgba(56,189,248,0.42)', '68%', '-12%', '44rem'),
      glow('rgba(34,211,238,0.32)', '-12%', '60%', '40rem', '5s'),
      glow('rgba(96,165,250,0.24)', '85%', '80%', '30rem', '11s'),
    ],
  },

  // Dairy — soft, fresh, creamy light blues.
  'sut-mahsulotlari': {
    base: 'radial-gradient(120% 120% at 70% -10%, #1e3356 0%, #070d1a 60%)',
    blobs: [
      glow('rgba(147,197,253,0.38)', '68%', '-10%', '42rem'),
      glow('rgba(226,232,240,0.16)', '-10%', '60%', '38rem', '6s'),
    ],
  },

  // Bread & bakery — warm, appetizing golden tones.
  'non-va-bulochka': {
    base: 'radial-gradient(120% 120% at 75% -10%, #45260a 0%, #140a04 60%)',
    blobs: [
      glow('rgba(245,158,11,0.42)', '70%', '-12%', '44rem'),
      glow('rgba(217,119,6,0.30)', '-10%', '60%', '38rem', '5s'),
      glow('rgba(252,211,77,0.22)', '85%', '80%', '30rem', '10s'),
    ],
  },

  // Fruits — bright, fresh, fruity.
  mevalar: {
    base: 'radial-gradient(120% 120% at 72% -10%, #3a1230 0%, #100612 60%)',
    blobs: [
      glow('rgba(244,63,94,0.38)', '68%', '-12%', '42rem'),
      glow('rgba(251,146,60,0.30)', '-10%', '58%', '38rem', '5s'),
      glow('rgba(132,204,22,0.22)', '85%', '78%', '30rem', '10s'),
    ],
  },

  // Vegetables — fresh, garden greens.
  sabzavotlar: {
    base: 'radial-gradient(120% 120% at 72% -10%, #123a1c 0%, #06140a 60%)',
    blobs: [
      glow('rgba(74,222,128,0.40)', '68%', '-12%', '42rem'),
      glow('rgba(132,204,22,0.30)', '-10%', '58%', '38rem', '5s'),
      glow('rgba(250,204,21,0.18)', '85%', '80%', '28rem', '10s'),
    ],
  },

  // Sweets — sweet, playful pinks & chocolate.
  shirinliklar: {
    base: 'radial-gradient(120% 120% at 72% -10%, #45122e 0%, #140710 60%)',
    blobs: [
      glow('rgba(244,114,182,0.40)', '68%', '-12%', '42rem'),
      glow('rgba(192,132,252,0.28)', '-10%', '58%', '38rem', '5s'),
      glow('rgba(180,83,9,0.24)', '85%', '80%', '30rem', '10s'),
    ],
  },
}

/** All known theme keys (used to pre-render crossfade layers). */
export const THEME_KEYS = Object.keys(CATEGORY_THEMES)

/**
 * Resolve a category (by slug) to a valid theme key. Unknown / new categories
 * safely fall back to 'default' so the app never breaks.
 */
export function resolveThemeKey(slug) {
  if (slug && CATEGORY_THEMES[slug]) return slug
  return 'default'
}
