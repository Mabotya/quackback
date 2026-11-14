import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { authClient } from '@/lib/client/auth-client'
import { Button } from '@/components/ui/button'

const PROVIDERS = [
  { id: 'google', name: 'Google' },
  { id: 'discord', name: 'Discord' },
  { id: 'github', name: 'GitHub' },
] as const

/** Only a signed-in user can reach this page or Better Auth's link endpoint. */
export function LinkedSignInMethods({
  enabled,
  linked,
}: {
  enabled: readonly string[]
  linked: readonly string[]
}) {
  const intl = useIntl()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('linkError')) setError(true)
  }, [])
  const available = PROVIDERS.filter((provider) => enabled.includes(provider.id))
  if (available.length === 0) return null

  const link = async (provider: (typeof PROVIDERS)[number]['id']) => {
    setPending(provider)
    setError(false)
    try {
      const result = await authClient.linkSocial({
        provider,
        callbackURL: '/settings/profile',
        errorCallbackURL: '/settings/profile?linkError=1',
        disableRedirect: true,
      })
      if (result.error || !result.data?.url) throw new Error('Could not start linking')
      window.location.assign(result.data.url)
    } catch {
      setError(true)
      setPending(null)
    }
  }

  return (
    <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <h2 className="font-medium">{intl.formatMessage({ id: 'portal.settings.linked.title', defaultMessage: 'Connected sign-in methods' })}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {intl.formatMessage({ id: 'portal.settings.linked.description', defaultMessage: 'Connect another account to sign in to this profile.' })}
      </p>
      <div className="mt-4 space-y-2">
        {available.map((provider) => (
          <div key={provider.id} className="flex items-center justify-between gap-3">
            <span className="text-sm">{provider.name}</span>
            {linked.includes(provider.id) ? (
              <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'portal.settings.linked.connected', defaultMessage: 'Connected' })}</span>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={pending !== null} aria-label={`${provider.name} ${intl.formatMessage({ id: 'portal.settings.linked.connect', defaultMessage: 'Connect' })}`} onClick={() => void link(provider.id)}>
                {pending === provider.id
                  ? intl.formatMessage({ id: 'portal.settings.linked.connecting', defaultMessage: 'Connecting…' })
                  : intl.formatMessage({ id: 'portal.settings.linked.connect', defaultMessage: 'Connect' })}
              </Button>
            )}
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{intl.formatMessage({ id: 'portal.settings.linked.error', defaultMessage: 'Could not start connecting. Please try again.' })}</p>}
    </section>
  )
}
