import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import QtyInput from './QtyInput'

// Regression: clearing the cart quantity field used to fire setQty(0), which
// DROPPED the line; on an order line it bounced the value back to 1 and fired
// a server write on every keystroke.

describe('QtyInput', () => {
  it('does not commit while the field is empty (live mode)', () => {
    const onCommit = vi.fn()
    render(<QtyInput live value={3} onCommit={onCommit} aria-label="Soni" />)
    const input = screen.getByLabelText('Soni')
    fireEvent.change(input, { target: { value: '' } })
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('')
  })

  it('commits a valid number as you type in live mode', () => {
    const onCommit = vi.fn()
    render(<QtyInput live value={1} onCommit={onCommit} aria-label="Soni" />)
    const input = screen.getByLabelText('Soni')
    fireEvent.change(input, { target: { value: '12' } })
    expect(onCommit).toHaveBeenCalledWith(12)
  })

  it('snaps an empty / invalid draft back to the last value on blur', () => {
    const onCommit = vi.fn()
    render(<QtyInput live value={4} onCommit={onCommit} aria-label="Soni" />)
    const input = screen.getByLabelText('Soni')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('4')

    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
    expect(input.value).toBe('4')
  })

  it('non-live mode commits only on blur / Enter, once, and not for the same value', () => {
    const onCommit = vi.fn()
    render(<QtyInput value={2} onCommit={onCommit} aria-label="Soni" />)
    const input = screen.getByLabelText('Soni')
    fireEvent.change(input, { target: { value: '5' } })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(5)

    onCommit.mockClear()
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('follows an external value change (realtime refetch / +- buttons)', () => {
    const onCommit = vi.fn()
    const { rerender } = render(<QtyInput value={1} onCommit={onCommit} aria-label="Soni" />)
    rerender(<QtyInput value={7} onCommit={onCommit} aria-label="Soni" />)
    expect(screen.getByLabelText('Soni').value).toBe('7')
  })

  it('floors decimals and respects min', () => {
    const onCommit = vi.fn()
    render(<QtyInput live value={1} onCommit={onCommit} aria-label="Soni" />)
    fireEvent.change(screen.getByLabelText('Soni'), { target: { value: '3.9' } })
    expect(onCommit).toHaveBeenCalledWith(3)
  })
})
