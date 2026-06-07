// ---------------------------------------------------------------------------
// Price-list PDF generator (jsPDF). Draws the grouped/sorted data from
// priceList.js into a clean, print-ready A4 portrait document and downloads it.
//
// Cyrillic + Uzbek-Latin: jsPDF's built-in fonts are Latin-1 only and would
// render "Докторская" as boxes, so we embed DejaVuSans (regular + bold), which
// covers full Cyrillic, Latin Extended and the Uzbek okina (ʻ). The .ttf files
// live in /public/fonts and are fetched + registered ON DEMAND (only when a PDF
// is actually generated) so they never weigh down the main bundle.
//
// Layout per page:
//   • header   — "ASL ZIYO" / "Narxlar ro'yxati" / generated date-time
//   • body     — for each selected category: a bold heading + "(X ta mahsulot)",
//                then each product as  NAME ........... PRICE  (dotted leader,
//                name left, price right), products already price-sorted.
//   • footer   — "Sahifa N / M" page numbers.
// ---------------------------------------------------------------------------

import { jsPDF } from 'jspdf'
import { formatDateTime } from './utils'
import { buildPriceListGroups, formatPriceListRow, PRICE_SORT } from './priceList'

const FONT = {
  regular: { file: 'DejaVuSans.ttf', vfs: 'DejaVuSans.ttf', name: 'DejaVuSans', style: 'normal' },
  bold: { file: 'DejaVuSans-Bold.ttf', vfs: 'DejaVuSans-Bold.ttf', name: 'DejaVuSans', style: 'bold' },
}

// Cache the base64 font payloads across exports in one session.
let fontCache = null

/** Read an ArrayBuffer as a base64 string (chunked to avoid call-stack limits). */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Fetch + base64-encode the two DejaVu fonts (once per session). */
async function loadFonts() {
  if (fontCache) return fontCache
  const base = `${import.meta.env.BASE_URL ?? '/'}fonts/`
  const grab = async (file) => {
    const res = await fetch(`${base}${file}`)
    if (!res.ok) throw new Error(`Font yuklanmadi: ${file} (${res.status})`)
    return arrayBufferToBase64(await res.arrayBuffer())
  }
  const [regular, bold] = await Promise.all([grab(FONT.regular.file), grab(FONT.bold.file)])
  fontCache = { regular, bold }
  return fontCache
}

/** Register the embedded fonts on a jsPDF document instance. */
function registerFonts(doc, fonts) {
  doc.addFileToVFS(FONT.regular.vfs, fonts.regular)
  doc.addFont(FONT.regular.vfs, FONT.regular.name, FONT.regular.style)
  doc.addFileToVFS(FONT.bold.vfs, fonts.bold)
  doc.addFont(FONT.bold.vfs, FONT.bold.name, FONT.bold.style)
}

const A4 = { w: 210, h: 297 } // mm
const MARGIN = { x: 16, top: 18, bottom: 16 }
const COLORS = {
  brand: [16, 130, 90],
  ink: [30, 41, 59],
  muted: [120, 130, 145],
  rule: [210, 215, 222],
  leader: [170, 178, 188],
}

/** Build the download filename: asl-ziyo-narxlar-YYYY-MM-DD.pdf */
export function priceListFileName(date = new Date()) {
  const iso = new Date(date).toISOString().slice(0, 10)
  return `asl-ziyo-narxlar-${iso}.pdf`
}

/**
 * Generate (and download) the price-list PDF.
 *
 * @param {object}   opts
 * @param {Array}    opts.products      role-visible products
 * @param {Array}    opts.categories    role-visible categories (defines order)
 * @param {Iterable} opts.selectedIds   category ids to include
 * @param {string}   opts.sortOrder     PRICE_SORT.ASC | PRICE_SORT.DESC
 * @param {Date}     [opts.generatedAt] timestamp shown in the header
 * @returns {Promise<{ fileName, categories, products }>} summary for a toast
 */
export async function generatePriceListPdf({
  products = [],
  categories = [],
  selectedIds,
  sortOrder = PRICE_SORT.ASC,
  generatedAt = new Date(),
} = {}) {
  const groups = buildPriceListGroups(products, categories, selectedIds, sortOrder)
  if (groups.length === 0) throw new Error('Kamida bitta bo\'lim tanlang')

  const fonts = await loadFonts()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  registerFonts(doc, fonts)

  const right = A4.w - MARGIN.x
  const contentBottom = A4.h - MARGIN.bottom
  let y = 0

  // ---- header (drawn at the top of every page) ----------------------------
  const drawHeader = () => {
    doc.setFont(FONT.bold.name, 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...COLORS.brand)
    doc.text('ASL ZIYO', MARGIN.x, MARGIN.top)

    doc.setFont(FONT.regular.name, 'normal')
    doc.setFontSize(12)
    doc.setTextColor(...COLORS.ink)
    doc.text("Narxlar ro'yxati", MARGIN.x, MARGIN.top + 7)

    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    const order = sortOrder === PRICE_SORT.DESC ? 'qimmatdan arzonga' : 'arzondan qimmatga'
    doc.text(`Narx bo'yicha: ${order}`, MARGIN.x, MARGIN.top + 12.5)
    doc.text(formatDateTime(generatedAt), right, MARGIN.top, { align: 'right' })

    // divider
    doc.setDrawColor(...COLORS.rule)
    doc.setLineWidth(0.4)
    doc.line(MARGIN.x, MARGIN.top + 16, right, MARGIN.top + 16)

    y = MARGIN.top + 24
  }

  // Move down by `needed` mm, starting a new page (with header) if it won't fit.
  const ensureSpace = (needed) => {
    if (y + needed > contentBottom) {
      doc.addPage()
      drawHeader()
    }
  }

  drawHeader()

  for (const group of groups) {
    // Category heading — keep it with at least one row beneath it.
    ensureSpace(16)
    doc.setFont(FONT.bold.name, 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...COLORS.brand)
    const icon = group.category.icon ? `${group.category.icon} ` : ''
    doc.text(`${icon}${group.category.name}`, MARGIN.x, y)
    doc.setFont(FONT.regular.name, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.muted)
    doc.text(`(${group.count} ta mahsulot)`, right, y, { align: 'right' })
    y += 3
    doc.setDrawColor(...COLORS.rule)
    doc.setLineWidth(0.3)
    doc.line(MARGIN.x, y, right, y)
    y += 6

    if (group.count === 0) {
      doc.setFont(FONT.regular.name, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...COLORS.muted)
      doc.text("— bu bo'limda mahsulot yo'q —", MARGIN.x, y)
      y += 10
      continue
    }

    doc.setFontSize(11)
    const lineH = 6.6
    for (const product of group.products) {
      ensureSpace(lineH)
      const { name, price } = formatPriceListRow(product)

      doc.setTextColor(...COLORS.ink)
      const nameW = doc.getTextWidth(name)
      const priceW = doc.getTextWidth(price)
      doc.text(name, MARGIN.x, y)
      doc.text(price, right, y, { align: 'right' })

      // Dotted leader filling the gap between name and price.
      const gapStart = MARGIN.x + nameW + 1.5
      const gapEnd = right - priceW - 1.5
      if (gapEnd > gapStart) {
        const dot = '.'
        const dotW = doc.getTextWidth(dot) || 1
        const count = Math.floor((gapEnd - gapStart) / dotW)
        if (count > 0) {
          doc.setTextColor(...COLORS.leader)
          doc.text(dot.repeat(count), gapStart, y)
        }
      }
      y += lineH
    }
    y += 5 // space between categories
  }

  // ---- footers: "Sahifa N / M" (added last, once page count is known) -----
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont(FONT.regular.name, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.text(`Sahifa ${p} / ${pageCount}`, A4.w / 2, A4.h - 8, { align: 'center' })
  }

  const fileName = priceListFileName(generatedAt)
  doc.save(fileName)

  return {
    fileName,
    categories: groups.length,
    products: groups.reduce((n, g) => n + g.count, 0),
  }
}
