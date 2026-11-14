import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  access: vi.fn(), auth: vi.fn(), actor: vi.fn(), detail: vi.fn(),
  comment: vi.fn(), translate: vi.fn(), bucket: vi.fn(),
}))
vi.mock('@/lib/server/functions/portal-access', () => ({ resolvePortalAccessForRequest: mocks.access }))
vi.mock('@/lib/server/functions/auth-helpers', () => ({ getOptionalAuth: mocks.auth, policyActorFromAuth: mocks.actor }))
vi.mock('@/lib/server/domains/posts/post.public.detail', () => ({ getPublicPostDetail: mocks.detail }))
vi.mock('@/lib/server/db', () => ({
  db: { query: { postComments: { findFirst: mocks.comment } } },
  postComments: { id: 'id' }, eq: vi.fn(),
}))
vi.mock('@/lib/server/content/portal-translation', () => ({ translateDocument: mocks.translate }))
vi.mock('@/lib/server/markdown-tiptap', () => ({
  markdownToTiptapJson: (s: string) => ({ type: 'doc', content: [{ type: 'text', text: s }] }),
  tiptapJsonToMarkdown: () => 'translated',
}))
vi.mock('@/lib/server/domains/api/rate-limit', () => ({ getClientIp: () => '127.0.0.1' }))
vi.mock('@/lib/server/utils/rate-bucket', () => ({ incrementBucket: mocks.bucket, bucketRetryAfter: () => 60 }))

import { handlePortalTranslate } from '../translate'

const postId = 'post_01h455vb4pex5vsknk084sn02q'
const commentId = 'post_comment_01h455vb4pex5vsknk084sn02q'
const actor = { principalType: 'user', principalId: 'test-user' }
const document = { type: 'doc', content: [{ type: 'text', text: 'hello' }] }
const comment = { id: commentId, content: 'hello', contentJson: document, isPrivate: false, moderationState: 'published', deletedAt: null, replies: [] }
function page(comments: object[] = []) {
  return { title: 'Title', content: 'hello', contentJson: document, comments, commentsNextCursor: null }
}
function request(kind: 'post' | 'comment', id: string) {
  return new Request('http://localhost/api/portal/translate', { method: 'POST', body: JSON.stringify({ kind, id, target: 'ja' }) })
}

describe('portal translation authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.access.mockResolvedValue({ granted: true, reason: 'domain' })
    mocks.auth.mockResolvedValue({ principal: 'session' })
    mocks.actor.mockResolvedValue(actor)
    mocks.bucket.mockResolvedValue({ count: 1 })
    mocks.comment.mockResolvedValue({ postId })
    mocks.detail.mockResolvedValue(page([comment]))
    mocks.translate.mockResolvedValue({ contentJson: document })
  })
  it('refuses a portal the viewer cannot enter', async () => {
    mocks.access.mockResolvedValue({ granted: false, reason: 'unauthorized' })
    expect((await handlePortalTranslate({ request: request('post', postId) })).status).toBe(404)
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(mocks.translate).not.toHaveBeenCalled()
  })
  it('refuses a post on an inaccessible board', async () => {
    mocks.detail.mockResolvedValue(null)
    expect((await handlePortalTranslate({ request: request('post', postId) })).status).toBe(404)
    expect(mocks.detail).toHaveBeenCalledWith(postId, actor, expect.any(Object))
    expect(mocks.translate).not.toHaveBeenCalled()
  })
  it.each([
    ['private', { isPrivate: true }],
    ['deleted', { deletedAt: new Date() }],
    ['pending moderation', { moderationState: 'pending' }],
  ])('refuses a %s comment even if it appears in a privileged viewer response', async (_name, changes) => {
    mocks.detail.mockResolvedValue(page([{ ...comment, ...changes }]))
    expect((await handlePortalTranslate({ request: request('comment', commentId) })).status).toBe(404)
    expect(mocks.translate).not.toHaveBeenCalled()
  })
  it('allows an authorized viewer to translate a post on their accessible board', async () => {
    const response = await handlePortalTranslate({ request: request('post', postId) })
    expect(response.status).toBe(200)
    expect(mocks.actor).toHaveBeenCalledWith({ principal: 'session' })
    expect(mocks.detail).toHaveBeenCalledWith(postId, actor, expect.any(Object))
    expect(mocks.translate).toHaveBeenCalledWith(document, 'Title', 'ja')
  })
  it('allows a published comment visible to the viewer', async () => {
    const response = await handlePortalTranslate({ request: request('comment', commentId) })
    expect(response.status).toBe(200)
    expect(mocks.translate).toHaveBeenCalledWith(document, undefined, 'ja')
  })
})
