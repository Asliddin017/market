import { useState } from 'react'

/**
 * Quantity <input> that never commits a bad value while the user is typing.
 *
 * The visible text is a local draft, so clearing the field to type a new number
 * does NOT fire `onCommit(0)` (which used to drop the line from the cart or
 * bounce an order line back to 1). A valid whole number >= `min` is committed
 * on every keystroke when `live` is true (cart: total updates as you type), or
 * only on blur / Enter when `live` is false (order lines: one server write).
 * An invalid/empty draft snaps back to the last committed value on blur.
 */
export default function QtyInput({
  value,
  onCommit,
  min = 1,
  live = false,
  disabled = false,
  className = '',
  ...rest
}) {
  // The draft remembers which committed value it was typed over; when the
  // value changes externally (realtime refetch, +/- buttons) the field simply
  // shows the new value — no effect needed.
  const [draftState, setDraftState] = useState({ for: value, text: String(value) })
  const draft = draftState.for === value ? draftState.text : String(value)
  const setDraft = (text) => setDraftState({ for: value, text })

  function parse(s) {
    if (String(s).trim() === '') return null
    const n = Math.floor(Number(s))
    return Number.isFinite(n) && n >= min ? n : null
  }

  function commit(s) {
    const n = parse(s)
    if (n == null) {
      setDraft(String(value))
      return
    }
    if (n !== value) onCommit(n)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      value={draft}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        if (live) {
          const n = parse(next)
          if (n != null && n !== value) onCommit(n)
        }
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      {...rest}
    />
  )
}
