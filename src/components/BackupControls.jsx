import { useRef, useState } from 'react'
import { exportData, importData } from '../hooks/useData'

// ---------------------------------------------------------------------------
// Admin backup tools: export all categories + products to a JSON file, and
// import (idempotent upsert) from a JSON file to restore / bulk-add. The
// import confirms counts before writing.
// ---------------------------------------------------------------------------
export default function BackupControls() {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  async function handleExport() {
    setBusy(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asl-ziyo-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      flash(`✓ ${data.products.length} mahsulot, ${data.categories.length} kategoriya yuklandi`)
    } catch (err) {
      console.error('[backup] export failed:', err)
      flash('Eksport xatosi')
    } finally {
      setBusy(false)
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file later
    if (!file) return
    setBusy(true)
    try {
      const payload = JSON.parse(await file.text())
      const nCats = (payload.categories ?? []).length
      const nProds = (payload.products ?? []).length
      const ok = window.confirm(
        `Import qilinsinmi?\n\n${nCats} kategoriya, ${nProds} mahsulot qo'shiladi/yangilanadi ` +
          `(mavjudlari nom bo'yicha ustiga yoziladi).`,
      )
      if (!ok) return
      const res = await importData(payload)
      flash(`✓ Import: ${res.products} mahsulot, ${res.categories} kategoriya`)
    } catch (err) {
      console.error('[backup] import failed:', err)
      flash('Import xatosi — JSON faylni tekshiring')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} disabled={busy} className="btn-ghost text-xs">
        ⬇️ Eksport
      </button>
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost text-xs">
        ⬆️ Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
      />
      {msg && <span className="text-xs text-brand-300">{msg}</span>}
    </div>
  )
}
