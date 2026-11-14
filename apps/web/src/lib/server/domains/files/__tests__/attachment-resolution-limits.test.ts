import { beforeEach, describe, expect, it, vi } from 'vitest'

interface TestFileRow {
  id: string
  uploadedById: string | null
  size: number
  name: string
  contentType: string
  storageKey: string
  family: string
  deletedAt: null
  meta: Record<string, never>
}
const f = vi.hoisted(() => ({ rows: [] as TestFileRow[], role: 'user' }))
vi.mock('@/lib/server/db', () => ({
  db: {
    query: { principal: { findFirst: vi.fn(async () => ({ role: f.role })) } },
    select: () => ({ from: () => ({ where: async () => f.rows }) }),
  },
  principal: { id: 'id' }, files: { id: 'id' }, conversationMessages: {},
  eq: vi.fn(), and: vi.fn(), inArray: vi.fn(), isNull: vi.fn(), sql: vi.fn(),
}))
vi.mock('@/lib/server/storage/s3', () => ({
  generateStorageKey: vi.fn(), uploadObject: vi.fn(), getPublicUrlOrNull: (key: string) => `/api/storage/${key}`,
}))
vi.mock('@/lib/server/storage/trusted-url', () => ({
  isTrustedAttachmentUrl: () => true, namesPipelineFile: () => false,
}))

import { resolveAttachments } from '../files.service'

const id = 'file_01h455vb4pex5vsknk084sn02q'
const ref = { fileId: id, url: '', name: '', contentType: '', size: 1 }
const owner = 'prn_owner' as never
beforeEach(() => {
  f.role = 'user'
  f.rows = [{ id, uploadedById: owner, size: 10 * 1024 * 1024, name: 'a.pdf', contentType: 'application/pdf', storageKey: 'files/a.pdf', family: 'pdf', deletedAt: null, meta: {} }]
})

describe('attachment resolution limits', () => {
  it('uses stored size instead of the size claimed by the sender', async () => {
    f.rows[0].size++
    await expect(resolveAttachments([ref], { principalId: owner, canAttachAnyFile: false })).rejects.toThrow('Attachment too large')
  })
  it('counts each occurrence toward the per-message limit', async () => {
    await expect(resolveAttachments(Array(5).fill(ref), { principalId: owner, canAttachAnyFile: false })).rejects.toThrow('40 MB')
  })
  it('uses the database role for the team allowance', async () => {
    f.role = 'member'
    await expect(resolveAttachments(Array(5).fill(ref), { principalId: owner, canAttachAnyFile: false })).resolves.toHaveLength(5)
  })
  it('does not let a null sender attach a file with no owner', async () => {
    f.rows[0].uploadedById = null
    await expect(resolveAttachments([ref], { principalId: null, canAttachAnyFile: false })).rejects.toThrow('Invalid attachment')
  })
})
