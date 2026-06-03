import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Shared mock state so the test can drive the realtime callback + assert cleanup.
const mocks = vi.hoisted(() => ({ changeCb: null, removeChannel: vi.fn() }))

vi.mock('../lib/supabase', () => {
  const channel = {
    on: (_evt, _filter, cb) => {
      mocks.changeCb = cb
      return channel
    },
    subscribe: () => channel,
  }
  return {
    supabase: {
      channel: () => channel,
      removeChannel: (...a) => mocks.removeChannel(...a),
    },
    isSupabaseConfigured: true,
  }
})

import { useLiveTable } from './useData'
import { useAuthStore } from '../store/authStore'

beforeEach(() => {
  mocks.changeCb = null
  mocks.removeChannel.mockClear()
  useAuthStore.setState({ ready: true })
})

describe('useLiveTable robustness (no blank pages)', () => {
  it('starts in a loading state (data undefined) and resolves to data', async () => {
    const loader = vi.fn().mockResolvedValue([{ id: 1 }])
    const { result } = renderHook(() => useLiveTable('products', loader))

    // loading must be distinguishable from "loaded + empty".
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(result.current.error).toBeNull()
  })

  it('does NOT fetch until auth is ready (#3)', async () => {
    useAuthStore.setState({ ready: false })
    const loader = vi.fn().mockResolvedValue([{ id: 1 }])
    const { result } = renderHook(() => useLiveTable('products', loader))

    await Promise.resolve()
    expect(loader).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true) // stays loading, never blanks

    act(() => useAuthStore.setState({ ready: true }))
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))
  })

  it('keeps the data already on screen when a realtime refetch fails (#5)', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1 }]) // initial load
      .mockRejectedValueOnce(new Error('reconnect blip')) // realtime refetch
    const { result } = renderHook(() => useLiveTable('products', loader))

    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))

    // Fire a realtime change -> background refetch rejects.
    await act(async () => {
      mocks.changeCb()
    })
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))

    // Data is preserved (NOT wiped to undefined) and no error surfaced.
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(result.current.error).toBeNull()
  })

  it('retries once on a transient first-load error, then surfaces the error (#4)', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
    const { result } = renderHook(() => useLiveTable('products', loader))

    await waitFor(() => expect(result.current.error).toBeTruthy(), { timeout: 2000 })
    expect(loader).toHaveBeenCalledTimes(2) // one retry
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('recovers if the single retry succeeds', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockResolvedValueOnce([{ id: 9 }])
    const { result } = renderHook(() => useLiveTable('products', loader))

    await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]), { timeout: 2000 })
    expect(result.current.error).toBeNull()
  })

  it('refetch() goes back to loading then loads fresh data', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2 }])
    const { result } = renderHook(() => useLiveTable('products', loader))

    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]))

    act(() => result.current.refetch())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeUndefined()

    await waitFor(() => expect(result.current.data).toEqual([{ id: 2 }]))
  })

  it('fetches AGAIN on remount — navigation away and back (#1)', async () => {
    const loader = vi.fn().mockResolvedValue([{ id: 1 }])

    const first = renderHook(() => useLiveTable('products', loader))
    await waitFor(() => expect(first.result.current.data).toEqual([{ id: 1 }]))
    expect(loader).toHaveBeenCalledTimes(1)
    first.unmount()

    // Remount (as when navigating back to the page): a brand-new fetch starting
    // from a fresh loading state — never reuses stale empty/undefined state.
    const second = renderHook(() => useLiveTable('products', loader))
    expect(second.result.current.loading).toBe(true)
    expect(second.result.current.data).toBeUndefined()
    await waitFor(() => expect(second.result.current.data).toEqual([{ id: 1 }]))
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('still fetches on a later mount when auth was already ready (#3)', async () => {
    useAuthStore.setState({ ready: true }) // ready from a previous page
    const loader = vi.fn().mockResolvedValue([{ id: 7 }])
    const { result } = renderHook(() => useLiveTable('categories', loader))
    await waitFor(() => expect(result.current.data).toEqual([{ id: 7 }]))
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('removes the realtime channel on unmount (no leak)', async () => {
    const loader = vi.fn().mockResolvedValue([])
    const { unmount } = renderHook(() => useLiveTable('products', loader))
    await waitFor(() => expect(loader).toHaveBeenCalled())
    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
  })
})
