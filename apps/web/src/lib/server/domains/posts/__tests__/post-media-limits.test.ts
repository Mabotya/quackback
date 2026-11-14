import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getObject } = vi.hoisted(() => ({ getObject: vi.fn() }))
vi.mock('@/lib/server/storage/s3', () => ({ getS3Object: getObject }))
vi.mock('@/lib/server/storage/asset-url', () => ({
  trustedStorageHosts: () => new Set(['example.test']),
  storedAssetKeyFromSrc: (src: string) => new URL(src, 'https://example.test').pathname.replace('/api/storage/', ''),
}))
import { storedMediaKeys, validatePublicPostMedia } from '../post-media-limits'

const doc = (...keys: string[]) => ({ type: 'doc', content: keys.map((key) => ({ type: 'image', attrs: { src: `/api/storage/${key}` } })) })
const reply = (bytes: number) => ({ contentRange: `bytes 0-0/${bytes}`, body: { cancel: vi.fn() } })
beforeEach(() => getObject.mockReset())

describe('public post media limits', () => {
  it('deduplicates the same actual storage object', () => {
    expect([...storedMediaKeys(doc('a', 'a', 'b'))]).toEqual(['b', 'a'])
  })
  it('accepts the exact combined limit', async () => {
    getObject.mockResolvedValue(reply(10 * 1024 * 1024))
    await expect(validatePublicPostMedia(doc('a', 'b', 'c', 'd'))).resolves.toBeUndefined()
  })
  it('rejects a combined total beyond 40 MiB', async () => {
    getObject.mockResolvedValue(reply(10 * 1024 * 1024))
    await expect(validatePublicPostMedia(doc('a', 'b', 'c', 'd', 'e'))).rejects.toMatchObject({ code: 'MEDIA_TOTAL_TOO_LARGE' })
  })
  it('rejects an individual stored object beyond 10 MiB', async () => {
    getObject.mockResolvedValue(reply(10 * 1024 * 1024 + 1))
    await expect(validatePublicPostMedia(doc('a'))).rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' })
  })
  it('allows edits that leave legacy attachments unchanged without reading storage', async () => {
    await expect(validatePublicPostMedia(doc('a'), doc('a'))).resolves.toBeUndefined()
    expect(getObject).not.toHaveBeenCalled()
  })
  it('fails closed if object size is unavailable for a newly changed attachment set', async () => {
    getObject.mockResolvedValue({ contentRange: undefined, body: { cancel: vi.fn() } })
    await expect(validatePublicPostMedia(doc('a', 'b'), doc('a'))).rejects.toMatchObject({ code: 'MEDIA_SIZE_UNAVAILABLE' })
  })
})
