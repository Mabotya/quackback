import { describe, expect, it, vi } from 'vitest'
import type { ChangelogPublishedEvent, PostCreatedEvent } from '@/lib/server/events/types'
import { buildDiscordMessage } from '../message'
import { canNotifyDiscordPost } from '../visibility'

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/lib/server/integrations/sync/transport', () => ({ integrationFetch: mocks.fetch }))
import { discordHook } from '../hook'

describe('Discord site notifications', () => {
  it('links a published update to its own page', () => {
    const event: ChangelogPublishedEvent = {
      id: 'event-1', type: 'changelog.published', timestamp: '2026-01-01T00:00:00Z',
      actor: { type: 'user', email: 'private@example.com' },
      data: { changelog: { id: 'changelog_1', title: '更新情報', contentPreview: '新機能', contentHtml: '', publishedAt: '2026-01-01T00:00:00Z', linkedPostCount: 0 } },
    }
    const message = buildDiscordMessage(event, 'https://td-dev.o-nnect.com')
    expect(message.embeds?.[0].url).toBe('https://td-dev.o-nnect.com/changelog/changelog_1')
    expect(message.embeds?.[0].author?.name).toContain('更新履歴')
    expect(JSON.stringify(message)).not.toContain('private@example.com')
  })

  it('does not substitute the author email for a missing display name', () => {
    const event: PostCreatedEvent = {
      id: 'event-2', type: 'post.created', timestamp: '2026-01-01T00:00:00Z',
      actor: { type: 'user' },
      data: { post: { id: 'post_1', title: '投稿', content: '本文', boardId: 'board_1', boardSlug: 'bugs', voteCount: 0, authorEmail: 'private@example.com' } },
    }
    expect(JSON.stringify(buildDiscordMessage(event, 'https://td-dev.o-nnect.com'))).not.toContain('private@example.com')
  })

  it('rejects private, deleted, and unpublished posts', () => {
    const board = { deletedAt: null, access: { view: 'anonymous' } }
    const post = { deletedAt: null, moderationState: 'published' }
    expect(canNotifyDiscordPost(board, post)).toBe(true)
    expect(canNotifyDiscordPost({ ...board, access: { view: 'team' } }, post)).toBe(false)
    expect(canNotifyDiscordPost({ ...board, deletedAt: new Date() }, post)).toBe(false)
    expect(canNotifyDiscordPost(board, { ...post, deletedAt: new Date() })).toBe(false)
    expect(canNotifyDiscordPost(board, { ...post, moderationState: 'pending' })).toBe(false)
  })

  it('suppresses mentions in user-supplied text', async () => {
    mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'message-1' }) })
    const event: PostCreatedEvent = {
      id: 'event-3', type: 'post.created', timestamp: '2026-01-01T00:00:00Z', actor: { type: 'user' },
      data: { post: { id: 'post_1', title: '@everyone', content: '@everyone', boardId: 'board_1', boardSlug: 'bugs', voteCount: 0 } },
    }
    await discordHook.run(event, { channelId: 'test' }, { accessToken: 'test', rootUrl: 'https://td-dev.o-nnect.com' })
    const body = JSON.parse(mocks.fetch.mock.calls.at(-1)?.[1].body)
    expect(body.allowed_mentions).toEqual({ parse: [] })
  })
})
