/**
 * A cold auth instance is built once, however many requests ask for it.
 *
 * The first page after a boot (or after an auth config change) fans out into
 * several server-function requests at once, and every one of them needs the
 * auth instance. Each used to build its own: load every provider's platform
 * credentials, list the identity providers and register the plugins.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { betterAuth } from 'better-auth'
import { handleOAuthUserInfo, linkOAuthAccount } from 'better-auth/oauth2'

if (!process.env.BASE_URL?.startsWith('http')) process.env.BASE_URL = 'http://localhost:3000'
process.env.SECRET_KEY ??= 'test-secret-key-with-at-least-32-characters'

let builds = 0
let enableSocialProviders = false
vi.mock('better-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('better-auth')>()),
  betterAuth: vi.fn(() => ({ id: ++builds, api: {}, handler: vi.fn() })),
}))

const mockGetPlatformCredentials = vi.fn(async (_type: string) => {
  // Long enough for every concurrent caller to arrive while the build runs.
  await new Promise((resolve) => setTimeout(resolve, 20))
  return enableSocialProviders && ['auth_google', 'auth_discord', 'auth_github'].includes(_type)
    ? { clientId: 'test-client', clientSecret: 'test-secret' }
    : null
})
vi.mock('@/lib/server/domains/platform-credentials/platform-credential.service', () => ({
  getPlatformCredentials: (type: string) => mockGetPlatformCredentials(type),
  getConfiguredIntegrationTypes: vi.fn(async () => new Set()),
}))

let authConfigVersion = 1
// The next `gatedReads` settings reads wait until the test releases them, which
// is how a test holds callers at the version check.
let gatedReads = 0
const heldReads: Array<() => void> = []
vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  getWorkspaceSettings: vi.fn(async () => {
    if (gatedReads > 0) {
      gatedReads -= 1
      await new Promise<void>((resolve) => heldReads.push(resolve))
    }
    return {
      settings: { authConfigVersion },
      authConfig: { oauth: enableSocialProviders ? { google: true, discord: true, github: true } : {} },
      developerConfig: {},
    }
  }),
}))
vi.mock('@/lib/server/domains/settings/tier-limits.service', () => ({
  getTierLimits: vi.fn(async () => ({ features: {} })),
}))
vi.mock('@/lib/server/domains/settings/identity-providers.service', () => ({
  listIdentityProviders: vi.fn(async () => []),
  getIdentityProviderCredentials: vi.fn(async () => null),
}))
vi.mock('../ensure-mcp-oauth-resource', () => ({
  ensureMcpOauthResource: vi.fn(async () => undefined),
}))
vi.mock('../hooks', () => ({
  hooksBefore: vi.fn(),
  hooksAfter: vi.fn(),
}))

const { getAuth, resetAuth } = await import('../index')
const { getAllAuthProviders } = await import('../auth-providers')
const socialProviders = getAllAuthProviders().filter((p) => p.type !== 'generic-oauth').length

beforeEach(() => {
  resetAuth()
  builds = 0
  authConfigVersion = 1
  gatedReads = 0
  heldReads.length = 0
  enableSocialProviders = false
  mockGetPlatformCredentials.mockClear()
  vi.mocked(betterAuth).mockClear()
})

describe('getAuth', () => {
  it('builds a cold instance once for concurrent callers', async () => {
    const instances = await Promise.all(Array.from({ length: 6 }, () => getAuth()))

    expect(new Set(instances).size).toBe(1)
    expect(builds).toBe(1)
    expect(mockGetPlatformCredentials).toHaveBeenCalledTimes(socialProviders)
  })

  it('reuses the built instance until the auth config changes', async () => {
    const first = await getAuth()
    expect(await getAuth()).toBe(first)

    authConfigVersion = 2
    const rebuilt = await getAuth()

    expect(rebuilt).not.toBe(first)
    expect(await getAuth()).toBe(rebuilt)
    expect(builds).toBe(2)
  })

  it('hands a caller that saw the stale version the rebuild another caller installed', async () => {
    await getAuth()
    authConfigVersion = 2
    gatedReads = 2
    // Both callers are held at the version check holding the stale instance.
    // They start one after the other: vitest resolves two concurrent dynamic
    // imports of the mocked settings module inconsistently.
    const first = getAuth()
    await vi.waitFor(() => expect(heldReads).toHaveLength(1))
    const late = getAuth()
    await vi.waitFor(() => expect(heldReads).toHaveLength(2))

    heldReads.shift()!()
    const rebuilt = await first
    // The late caller resumes only after the rebuild is installed.
    heldReads.shift()!()

    expect(await late).toBe(rebuilt)
    expect(builds).toBe(2)
  })

  it('starts afresh after a reset, even with a build still in flight', async () => {
    const stale = getAuth()
    // Wait until the first build is inside the deliberately delayed read, so
    // the reset really races an active build without racing Vite's mock loader.
    await vi.waitFor(() => expect(mockGetPlatformCredentials).toHaveBeenCalled())
    resetAuth()
    const fresh = await getAuth()
    await stale

    expect(builds).toBe(2)
    expect(await getAuth()).toBe(fresh)
  })

  it('does not keep a failed build', async () => {
    mockGetPlatformCredentials.mockRejectedValueOnce(new Error('credential store down'))

    await expect(getAuth()).rejects.toThrow('credential store down')
    await expect(getAuth()).resolves.toBeDefined()
  })

  it('requires verified provider and local email for implicit social linking, while retaining session-based explicit linking', async () => {
    enableSocialProviders = true
    await getAuth()
    const config = vi.mocked(betterAuth).mock.calls.at(-1)![0]!
    const linking = config.account!.accountLinking!
    expect(linking.requireLocalEmailVerified).toBe(true)
    expect(linking.allowDifferentEmails).toBe(true)

    for (const providerId of ['google', 'discord', 'github']) {
      expect(config.socialProviders).toHaveProperty(providerId)
      expect(linking.trustedProviders).not.toContain(providerId)

      for (const [localVerified, providerVerified, allowed] of [
        [false, false, false], [false, true, false],
        [true, false, false], [true, true, true],
      ] as const) {
        const user = { id: 'local-user', email: 'person@example.com', emailVerified: localVerified }
        const linkAccount = vi.fn(async () => ({ id: 'link', userId: user.id, providerId, accountId: 'provider-id' }))
        const ctx = {
          context: {
            options: { account: { accountLinking: linking } },
            trustedProviders: linking.trustedProviders,
            socialProviders: [{ id: providerId, options: {} }],
            logger: { error: vi.fn(), warn: vi.fn() },
            internalAdapter: {
              findAccountOwnerByKey: vi.fn(async () => null),
              findUserByEmail: vi.fn(async () => ({ user, accounts: [] })),
              linkAccount,
              createSession: vi.fn(async () => ({ userId: user.id })),
            },
          },
        }
        const result = await handleOAuthUserInfo(ctx as never, {
          userInfo: { id: 'provider-id', name: 'Person', email: user.email, emailVerified: providerVerified },
          account: { providerId, accountId: 'provider-id' }, callbackURL: '/',
        } as never)
        expect(linkAccount).toHaveBeenCalledTimes(allowed ? 1 : 0)
        expect(result.error).toBe(allowed ? null : 'account not linked')
      }

      const createAccount = vi.fn(async (value: unknown) => value)
      const explicitCtx = {
        context: {
          options: { account: { accountLinking: linking } },
          trustedProviders: linking.trustedProviders,
          logger: { error: vi.fn(), warn: vi.fn() },
          internalAdapter: { findAccountByKey: vi.fn(async () => null), createAccount },
        },
      }
      const explicit = await linkOAuthAccount(explicitCtx as never, {
        link: { userId: 'local-user', email: 'local@example.com' },
        account: { providerId, accountId: 'provider-id' },
        userInfo: { id: 'provider-id', email: 'different@example.com', emailVerified: true },
      } as never)
      expect(explicit.linked).toBe(true)
      expect(createAccount).toHaveBeenCalledTimes(1)

      createAccount.mockClear()
      const unverified = await linkOAuthAccount(explicitCtx as never, {
        link: { userId: 'local-user', email: 'local@example.com' },
        account: { providerId, accountId: 'provider-id' },
        userInfo: { id: 'provider-id', email: 'different@example.com', emailVerified: false },
      } as never)
      expect(unverified.linked).toBe(false)
      expect(createAccount).not.toHaveBeenCalled()
    }
  })
})
