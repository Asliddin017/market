import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContacts, saveContact, deleteContact } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/roles'
import { isValidUzPhone, formatPhone, telHref } from '../lib/phone'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'

const EMPTY = []

// One contact row: name + label + a tap-to-call phone link.
function ContactCard({ contact, canManage, onEdit, onDelete, primary }) {
  return (
    <div className={`glass flex flex-col gap-1 rounded-2xl p-5 ${primary ? 'ring-1 ring-brand-400/40' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{primary ? '⭐' : '🤝'}</span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">{contact.name}</h3>
          {contact.label && <p className="text-xs text-slate-400">{contact.label}</p>}
        </div>
      </div>
      <a
        href={`tel:${telHref(contact.phone)}`}
        className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-brand-300 hover:underline"
      >
        📞 {formatPhone(contact.phone)}
      </a>
      {canManage && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => onEdit(contact)} className="btn-ghost px-2.5 py-1 text-xs">✏️ Tahrirlash</button>
          {!contact.isPrimary && (
            <button onClick={() => onDelete(contact)} className="btn-danger px-2.5 py-1 text-xs">🗑️</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Contact() {
  const { data, loading, error, refetch } = useContacts()
  const contacts = data ?? EMPTY
  const role = useAuthStore((s) => s.role)
  const canManage = can(role, 'manageContacts')

  const [editing, setEditing] = useState(null) // contact | {} (new) | null
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [warn, setWarn] = useState('')
  const [toDelete, setToDelete] = useState(null)

  const primary = contacts.find((c) => c.isPrimary) ?? null
  const others = contacts.filter((c) => !c.isPrimary)

  function startNew() {
    setEditing({})
    setName('')
    setLabel('')
    setPhone('')
    setWarn('')
  }
  function startEdit(c) {
    setEditing(c)
    setName(c.name ?? '')
    setLabel(c.label ?? '')
    setPhone(c.phone ?? '')
    setWarn('')
  }
  function cancel() {
    setEditing(null)
    setWarn('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setWarn('Ismni kiriting.')
      return
    }
    if (!isValidUzPhone(phone)) {
      setWarn("Telefon raqamini to'g'ri kiriting (masalan +998 90 123 45 67).")
      return
    }
    try {
      const nextSort =
        editing?.id != null
          ? editing.sortOrder
          : (others.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0) + 1)
      await saveContact({
        id: editing?.id,
        name,
        label,
        phone,
        isPrimary: editing?.isPrimary ?? false,
        sortOrder: nextSort,
      })
      cancel()
    } catch (err) {
      console.error('[contact] save failed:', err)
      setWarn('Saqlashda xatolik yuz berdi.')
    }
  }

  async function confirmDelete() {
    const target = toDelete
    setToDelete(null)
    try {
      await deleteContact(target.id)
    } catch (err) {
      console.error('[contact] delete failed:', err)
      setWarn("O'chirishda xatolik yuz berdi.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">📞 Aloqa</h1>
          <p className="text-sm text-slate-400">Do'kon bilan bog'lanish uchun raqamlar</p>
        </div>
        {canManage && !editing && (
          <button onClick={startNew} className="btn-primary">➕ Ishonch raqami</button>
        )}
      </div>

      {warn && !editing && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">⚠️ {warn}</p>
      )}

      {/* Inline editor (admin) */}
      <AnimatePresence>
        {editing && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong overflow-hidden rounded-2xl p-5"
          >
            <h3 className="mb-3 font-semibold">
              {editing.id ? 'Tahrirlash' : 'Yangi ishonch raqami'}
              {editing.isPrimary && ' (asosiy)'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Ism *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism" autoFocus />
              </div>
              <div>
                <label className="label">Telefon *</label>
                <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
              </div>
              <div>
                <label className="label">Belgi (ixtiyoriy)</label>
                <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Masalan: Ishonch" />
              </div>
            </div>
            {warn && <p className="mt-2 text-xs text-rose-300">{warn}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={cancel} className="btn-ghost">Bekor qilish</button>
              <button type="submit" className="btn-primary">Saqlash</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {error ? (
        <ErrorState onRetry={refetch} message="Aloqa ma'lumotlarini yuklab bo'lmadi" />
      ) : loading ? (
        <LoadingState label="Yuklanmoqda…" />
      ) : contacts.length === 0 ? (
        <EmptyState icon="📞" title="Aloqa ma'lumotlari yo'q" hint="Hozircha raqamlar qo'shilmagan." />
      ) : (
        <div className="space-y-5">
          {primary && (
            <ContactCard contact={primary} canManage={canManage} onEdit={startEdit} onDelete={setToDelete} primary />
          )}
          {others.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold">Ishonch raqamlari</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((c) => (
                  <ContactCard key={c.id} contact={c} canManage={canManage} onEdit={startEdit} onDelete={setToDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Raqamni o'chirish"
        message={`"${toDelete?.name}" o'chirilsinmi?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
