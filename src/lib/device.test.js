import { describe, it, expect } from 'vitest'
import { parseUserAgent, currentDeviceInfo, deviceLabel } from './device'

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.6533.77 Mobile/15E148 Safari/604.1',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.2651.74',
  windowsYandex:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 YaBrowser/24.7.0.0 Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  ipad:
    'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
  samsung:
    'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
}

describe('parseUserAgent', () => {
  it('Android phone + Chrome', () => {
    expect(parseUserAgent(UA.androidChrome)).toEqual({
      deviceType: 'Telefon',
      os: 'Android 14',
      browser: 'Chrome 128',
    })
  })
  it('iPhone + Safari / Chrome', () => {
    expect(parseUserAgent(UA.iphoneSafari)).toEqual({ deviceType: 'Telefon', os: 'iOS 17', browser: 'Safari 17' })
    expect(parseUserAgent(UA.iphoneChrome)).toEqual({ deviceType: 'Telefon', os: 'iOS 17', browser: 'Chrome 127' })
  })
  it('Windows desktop: Edge and Yandex are not mistaken for Chrome', () => {
    expect(parseUserAgent(UA.windowsEdge)).toEqual({ deviceType: 'Kompyuter', os: 'Windows', browser: 'Edge 127' })
    expect(parseUserAgent(UA.windowsYandex)).toEqual({ deviceType: 'Kompyuter', os: 'Windows', browser: 'Yandex 24' })
  })
  it('tablets', () => {
    expect(parseUserAgent(UA.androidTablet).deviceType).toBe('Planshet')
    expect(parseUserAgent(UA.ipad)).toEqual({ deviceType: 'Planshet', os: 'iOS 16', browser: 'Safari 16' })
  })
  it('macOS Firefox, Samsung browser', () => {
    expect(parseUserAgent(UA.macFirefox)).toEqual({ deviceType: 'Kompyuter', os: 'macOS', browser: 'Firefox 128' })
    expect(parseUserAgent(UA.samsung).browser).toBe('Samsung 25')
  })
  it('unknown / empty input never throws', () => {
    expect(parseUserAgent('')).toEqual({ deviceType: 'Kompyuter', os: "Noma'lum", browser: "Noma'lum" })
    expect(parseUserAgent(undefined).os).toBe("Noma'lum")
  })
})

describe('currentDeviceInfo / deviceLabel', () => {
  it('snapshots navigator + screen', () => {
    const info = currentDeviceInfo(
      { userAgent: UA.androidChrome, language: 'uz-UZ' },
      { width: 412, height: 915 },
    )
    expect(info).toEqual({
      deviceType: 'Telefon',
      os: 'Android 14',
      browser: 'Chrome 128',
      screen: '412x915',
      language: 'uz-UZ',
      userAgent: UA.androidChrome,
    })
  })
  it('deviceLabel joins the parts with an icon', () => {
    expect(deviceLabel({ deviceType: 'Telefon', os: 'Android 14', browser: 'Chrome 128' })).toBe(
      '📱 Telefon · Android 14 · Chrome 128',
    )
    expect(deviceLabel({ deviceType: 'Kompyuter', os: 'Windows', browser: 'Edge 127' })).toBe(
      '💻 Kompyuter · Windows · Edge 127',
    )
  })
})
