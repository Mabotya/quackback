import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ role: 'user', store: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/server/db', () => ({
  db: { query: { principal: { findFirst: mocks.find } } },
  eq: vi.fn(), principal: { id: 'id' },
}))
vi.mock('@/lib/server/storage/s3', () => ({ isS3Usable: () => true }))
vi.mock('../files.service', () => ({
  storeFile: mocks.store,
  toUploadedFile: () => ({ fileId: 'file_test' }),
  FileRejectedError: class FileRejectedError extends Error {},
}))

import { handleFileUploadRequest } from '../files.upload'

function request(size: number, declaredLength?: number) {
  const headers: Record<string, string> = { 'content-type': 'application/pdf' }
  const req = new Request('https://example.test/api/portal/files?name=test.pdf', {
    method: 'POST', headers, body: new Uint8Array(size),
  })
  if (declaredLength !== undefined) req.headers.set('content-length', String(declaredLength))
  return req
}

const sender = { source: 'portal' as const, uploadedById: 'prn_test' as never, unverifiedSender: false }
beforeEach(() => {
  mocks.find.mockReset().mockImplementation(async () => ({ role: mocks.role }))
  mocks.store.mockReset().mockResolvedValue({})
})

describe('server upload limits', () => {
  it('rejects a user file over 10 MiB even with a false Content-Length', async () => {
    mocks.role = 'user'
    const res = await handleFileUploadRequest(request(10 * 1024 * 1024 + 1, 1), sender)
    expect(res.status).toBe(413)
    expect(mocks.store).not.toHaveBeenCalled()
  })
  it('allows team members to upload non-video files over 10 MiB', async () => {
    mocks.role = 'member'
    const res = await handleFileUploadRequest(request(10 * 1024 * 1024 + 1), sender)
    expect(res.status).toBe(201)
    expect(mocks.store.mock.calls[0]![0].maxBytes).toBe(100 * 1024 * 1024)
  })
  it('rejects a team request declaring more than 100 MiB', async () => {
    mocks.role = 'admin'
    const res = await handleFileUploadRequest(request(1, 100 * 1024 * 1024 + 1), sender)
    expect(res.status).toBe(413)
    expect(mocks.store).not.toHaveBeenCalled()
  })
})
