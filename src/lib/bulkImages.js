// ---------------------------------------------------------------------------
// Pure helper for the bulk image-capture mode (src/pages/BulkImages.jsx).
// Framework-free + unit-tested.
// ---------------------------------------------------------------------------

/**
 * From the (already search/category-filtered) product list and the map of ids
 * completed THIS session, return the rows to display and progress counts.
 *
 * A row is shown while it still has no image, and KEPT visible (with its new
 * thumbnail) once completed this session — even after the live refetch flips
 * its image on — so the running counter and thumbnails don't flicker away.
 *
 * @param {Array} products  products already narrowed by search + category
 * @param {Object} doneMap   { [productId]: uploadedUrl } for this session
 * @returns {{ rows: Array, completed: number, total: number }}
 */
export function selectBulkRows(products = [], doneMap = {}) {
  const rows = products.filter((p) => !p.image || doneMap[p.id])
  const completed = rows.filter((p) => doneMap[p.id] || p.image).length
  return { rows, completed, total: rows.length }
}
