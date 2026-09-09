// ---------------------------------------------------------------------------
// Device / browser detection for the login log (framework-free, pure).
//
// Parses a user-agent string into human-readable fields shown to the admin:
//   { deviceType: 'Telefon' | 'Planshet' | 'Kompyuter', os, browser }
// Deliberately simple substring rules — good enough to tell "Android Chrome
// phone" from "Windows Edge laptop", which is what the shop owner needs.
// ---------------------------------------------------------------------------

const ver = (ua, re) => {
  const m = ua.match(re)
  return m ? m[1].split(/[._]/)[0] : ''
}

/** Parse a user-agent string. Returns friendly Uzbek labels. */
export function parseUserAgent(ua = '') {
  const s = String(ua)

  // ---- OS -----------------------------------------------------------------
  let os = "Noma'lum"
  if (/iPhone|iPad|iPod/.test(s)) {
    const v = ver(s, /OS (\d+[_\d]*)/)
    os = v ? `iOS ${v}` : 'iOS'
  } else if (/Android/.test(s)) {
    const v = ver(s, /Android (\d+[.\d]*)/)
    os = v ? `Android ${v}` : 'Android'
  } else if (/Windows/.test(s)) os = 'Windows'
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS'
  else if (/CrOS/.test(s)) os = 'ChromeOS'
  else if (/Linux/.test(s)) os = 'Linux'

  // ---- Browser (order matters: many browsers also say "Chrome"/"Safari") ---
  let browser = "Noma'lum"
  if (/YaBrowser\//.test(s)) browser = `Yandex ${ver(s, /YaBrowser\/(\d+)/)}`
  else if (/Edg(?:e|A|iOS)?\//.test(s)) browser = `Edge ${ver(s, /Edg(?:e|A|iOS)?\/(\d+)/)}`
  else if (/OPR\/|Opera/.test(s)) browser = `Opera ${ver(s, /(?:OPR|Opera)\/(\d+)/)}`
  else if (/SamsungBrowser\//.test(s)) browser = `Samsung ${ver(s, /SamsungBrowser\/(\d+)/)}`
  else if (/Firefox\/|FxiOS\//.test(s)) browser = `Firefox ${ver(s, /(?:Firefox|FxiOS)\/(\d+)/)}`
  else if (/CriOS\//.test(s)) browser = `Chrome ${ver(s, /CriOS\/(\d+)/)}`
  else if (/Chrome\//.test(s)) browser = `Chrome ${ver(s, /Chrome\/(\d+)/)}`
  else if (/Safari\//.test(s)) browser = `Safari ${ver(s, /Version\/(\d+)/)}`
  browser = browser.trim()

  // ---- Device type --------------------------------------------------------
  let deviceType = 'Kompyuter'
  if (/iPad|Tablet|Tab\b/.test(s) || (/Android/.test(s) && !/Mobile/.test(s))) deviceType = 'Planshet'
  else if (/Mobi|iPhone|iPod|Android/.test(s)) deviceType = 'Telefon'

  return { deviceType, os, browser }
}

/** Snapshot of the CURRENT browser for a login event row (browser only). */
export function currentDeviceInfo(nav = globalThis.navigator, scr = globalThis.screen) {
  const ua = nav?.userAgent ?? ''
  const parsed = parseUserAgent(ua)
  return {
    ...parsed,
    screen: scr?.width && scr?.height ? `${scr.width}x${scr.height}` : null,
    language: nav?.language ?? null,
    userAgent: ua || null,
  }
}

/** Short one-line label for the UI, e.g. "📱 Telefon · Android 14 · Chrome 128". */
export function deviceLabel(ev) {
  const icon = ev?.deviceType === 'Telefon' ? '📱' : ev?.deviceType === 'Planshet' ? '📟' : '💻'
  return [ev?.deviceType, ev?.os, ev?.browser].filter(Boolean).join(' · ').replace(/^/, `${icon} `)
}
