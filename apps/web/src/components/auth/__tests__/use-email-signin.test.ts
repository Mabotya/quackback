// @vitest-environment happy-dom
/**
 * The code step's spinner is `emailSignin.loading`, and nothing else clears it.
 *
 * `verify` set it on entry and cleared it only in `catch`, so a SUCCESSFUL
 * verification left it on forever. Inside a dialog that closes on success that
 * was invisible; on a page that stays mounted it is a screen that has signed
 * you in and still says it is working.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const hoisted = vi.hoisted(() => ({ emailOtp: vi.fn() }))
vi.mock('@/lib/client/auth-client', () => ({
  authClient: { signIn: { emailOtp: hoisted.emailOtp } },
}))

import { createElement, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { useEmailSignin } from '../use-email-signin'

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(IntlProvider, { locale: 'en' }, children)

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('useEmailSignin.requestEmail delivery failures', () => {
  it.each([429, 500, 503])('reports a temporary failure for HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'private provider details' }), { status })
        )
    )
    const { result } = renderHook(() => useEmailSignin({ callbackUrl: '/', onSuccess: vi.fn() }), {
      wrapper,
    })
    let answer: { ok: boolean; error?: string } | undefined
    await act(async () => {
      answer = await result.current.requestEmail('someone@example.com')
    })
    expect(answer).toEqual({
      ok: false,
      error: 'Email is temporarily unavailable. Please try again later.',
    })
    expect(result.current.resendCooldown).toBe(0)
  })
  it('reports a temporary failure when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network failure')))
    const { result } = renderHook(() => useEmailSignin({ callbackUrl: '/', onSuccess: vi.fn() }), {
      wrapper,
    })
    await act(async () => {
      await result.current.requestEmail('someone@example.com')
    })
    expect(result.current.error).toBe('Email is temporarily unavailable. Please try again later.')
  })
})

describe('useEmailSignin.verify', () => {
  it('stops loading once the code is accepted', async () => {
    hoisted.emailOtp.mockResolvedValue({ data: {}, error: null })
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useEmailSignin({ callbackUrl: '/onboarding', onSuccess }), {
      wrapper,
    })

    await act(async () => {
      await result.current.verify('someone@example.com', '123456')
    })

    expect(onSuccess).toHaveBeenCalledOnce()
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('stops loading and reports the failure when the code is rejected', async () => {
    hoisted.emailOtp.mockResolvedValue({
      data: null,
      error: { code: 'INVALID_OTP', message: 'Invalid OTP' },
    })
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useEmailSignin({ callbackUrl: '/onboarding', onSuccess }), {
      wrapper,
    })

    await act(async () => {
      await result.current.verify('someone@example.com', '123456')
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(result.current.error).toBe(
      "That code isn't right. Check the email and try again, or send a new code."
    )
    expect(result.current.loading).toBe(false)
  })

  // The guard that makes a stuck spinner permanent rather than merely wrong:
  // `verify` refuses to run while `loading` is true, so a second attempt after
  // a success that never cleared it does nothing at all.
  it('can verify again after a success', async () => {
    hoisted.emailOtp.mockResolvedValue({ data: {}, error: null })
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useEmailSignin({ callbackUrl: '/onboarding', onSuccess }), {
      wrapper,
    })

    await act(async () => {
      await result.current.verify('someone@example.com', '123456')
    })
    await act(async () => {
      await result.current.verify('someone@example.com', '123456')
    })

    expect(hoisted.emailOtp).toHaveBeenCalledTimes(2)
  })
})

describe('useEmailSignin.verify wording', () => {
  it.each([
    ['OTP_EXPIRED', 'That code expired. Send a new one.'],
    ['TOO_MANY_ATTEMPTS', 'Too many tries. Send a new code.'],
  ])('says what went wrong for %s, never the raw error', async (code, copy) => {
    hoisted.emailOtp.mockResolvedValue({ data: null, error: { code, message: 'raw' } })
    const { result } = renderHook(
      () => useEmailSignin({ callbackUrl: '/onboarding', onSuccess: vi.fn() }),
      { wrapper }
    )
    await act(async () => {
      await result.current.verify('someone@example.com', '123456')
    })
    expect(result.current.error).toBe(copy)
  })
})
