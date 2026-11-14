/**
 * Discord message building utilities.
 * Creates embed-formatted messages for different event types.
 */

import type { EventData } from '@/lib/server/events/types'
import { stripHtml, truncate, getStatusEmoji } from '@/lib/server/events/hook-utils'
import { commentPlainText } from '@/lib/server/markdown-tiptap'
import { buildPostUrl } from '@/lib/server/integrations/message-utils'

interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number
  author?: { name: string }
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string }
  timestamp?: string
}

interface DiscordMessage {
  content?: string
  embeds?: DiscordEmbed[]
}

/** Discord embed colors */
const COLORS = {
  blue: 0x5865f2,
  green: 0x57f287,
  yellow: 0xfee75c,
  orange: 0xf0b232,
  grey: 0x99aab5,
} as const

function getStatusColor(status: string): number {
  const map: Record<string, number> = {
    open: COLORS.blue,
    under_review: COLORS.yellow,
    planned: COLORS.orange,
    in_progress: COLORS.yellow,
    complete: COLORS.green,
    closed: COLORS.grey,
  }
  return map[status.toLowerCase().replace(/\s+/g, '_')] ?? COLORS.blue
}

/**
 * Build a Discord message for an event.
 */
export function buildDiscordMessage(event: EventData, rootUrl: string): DiscordMessage {
  switch (event.type) {
    case 'post.created': {
      const { post } = event.data
      const postUrl = buildPostUrl(rootUrl, post.boardSlug, post.id)
      const content = truncate(stripHtml(post.content), 300)
      const author = post.authorName || 'ユーザー'

      return {
        embeds: [
          {
            title: truncate(post.title, 256),
            url: postUrl,
            description: content || undefined,
            color: COLORS.blue,
            author: { name: `📬 新しい投稿：${author}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'post.status_changed': {
      const { post, previousStatus, newStatus } = event.data
      const postUrl = buildPostUrl(rootUrl, post.boardSlug, post.id)
      const emoji = getStatusEmoji(newStatus)
      const actor = event.actor.displayName || 'システム'

      return {
        embeds: [
          {
            title: truncate(post.title, 256),
            url: postUrl,
            description: `${previousStatus} → **${newStatus}**`,
            color: getStatusColor(newStatus),
            author: { name: `${emoji} ステータス変更：${actor}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'post.updated': {
      const { post, changedFields } = event.data
      const postUrl = buildPostUrl(rootUrl, post.boardSlug, post.id)
      const actor = event.actor.displayName || 'システム'
      const fields = changedFields.join(', ')

      return {
        embeds: [
          {
            title: truncate(post.title, 256),
            url: postUrl,
            description: `変更項目：${fields}`,
            color: COLORS.yellow,
            author: { name: `✏️ 投稿を更新：${actor}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'post.deleted': {
      const { post } = event.data
      const actor = event.actor.displayName || 'システム'

      return {
        embeds: [
          {
            title: truncate(post.title, 256),
            color: COLORS.grey,
            author: { name: `🗑️ 投稿を削除：${actor}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'post.merged': {
      const { duplicatePost, canonicalPost } = event.data
      const canonicalUrl = buildPostUrl(rootUrl, canonicalPost.boardSlug, canonicalPost.id)
      const actor = event.actor.displayName || 'システム'

      return {
        embeds: [
          {
            title: truncate(canonicalPost.title, 256),
            url: canonicalUrl,
            description: `「${duplicatePost.title}」をこの投稿に統合しました`,
            color: COLORS.orange,
            author: { name: `🔀 投稿を統合：${actor}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'comment.created': {
      const { comment, post } = event.data
      const postUrl = buildPostUrl(rootUrl, post.boardSlug, post.id)
      const content = truncate(commentPlainText(comment), 300)
      const author = comment.authorName || 'ユーザー'

      return {
        embeds: [
          {
            title: truncate(post.title, 256),
            url: postUrl,
            description: content || undefined,
            color: COLORS.blue,
            author: { name: `💬 新しいコメント：${author}` },
            timestamp: event.timestamp,
          },
        ],
      }
    }

    case 'changelog.published': {
      const { changelog } = event.data
      return {
        embeds: [{
          title: truncate(changelog.title, 256),
          url: `${rootUrl}/changelog/${encodeURIComponent(changelog.id)}`,
          description: truncate(stripHtml(changelog.contentPreview || ''), 300) || undefined,
          color: COLORS.green,
          author: { name: '📢 更新履歴を公開しました' },
          timestamp: event.timestamp,
        }],
      }
    }

    default:
      return { content: `Quackback event: ${(event as EventData).type}` }
  }
}
