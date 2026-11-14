// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { LinkedSignInMethods } from '../linked-sign-in-methods'

const linkSocial = vi.hoisted(() => vi.fn())
vi.mock('@/lib/client/auth-client', () => ({ authClient: { linkSocial } }))

beforeEach(() => linkSocial.mockReset())

function renderMethods(enabled: string[], linked: string[] = []) {
  return render(
    <IntlProvider locale="en">
      <LinkedSignInMethods enabled={enabled} linked={linked} />
    </IntlProvider>
  )
}

describe('linked sign-in methods', () => {
  it('only exposes enabled providers and identifies already linked accounts', () => {
    renderMethods(['google', 'github'], ['google'])
    expect(screen.getByText('Google')).toBeTruthy()
    expect(screen.getByText('Connected')).toBeTruthy()
    expect(screen.getByText('GitHub')).toBeTruthy()
    expect(screen.queryByText('Discord')).toBeNull()
    expect(screen.getByRole('button', { name: 'GitHub Connect' })).toBeTruthy()
  })

  it('starts a session-bound link and shows a useful failure when refused', async () => {
    linkSocial.mockResolvedValue({ error: { message: 'denied' }, data: null })
    renderMethods(['discord'])
    fireEvent.click(screen.getByRole('button', { name: 'Discord Connect' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not start connecting'))
    expect(linkSocial).toHaveBeenCalledWith({
      provider: 'discord',
      callbackURL: '/settings/profile',
      errorCallbackURL: '/settings/profile?linkError=1',
      disableRedirect: true,
    })
  })
})
