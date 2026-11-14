import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { commentIdSchema, postIdSchema } from '@quackback/ids/zod'
import { db, eq, postComments } from '@/lib/server/db'
import { getPublicPostDetail } from '@/lib/server/domains/posts/post.public.detail'
import type { PublicComment } from '@/lib/server/domains/posts/post.types'
import { getOptionalAuth, policyActorFromAuth } from '@/lib/server/functions/auth-helpers'
import { resolvePortalAccessForRequest } from '@/lib/server/functions/portal-access'
import { markdownToTiptapJson, tiptapJsonToMarkdown } from '@/lib/server/markdown-tiptap'
import { translateDocument } from '@/lib/server/content/portal-translation'
import { getClientIp } from '@/lib/server/domains/api/rate-limit'
import { incrementBucket, bucketRetryAfter } from '@/lib/server/utils/rate-bucket'

const input = z.object({
  kind: z.enum(['post', 'comment']),
  id: z.string().max(80),
  target: z.enum(['ja', 'en', 'zh-tw', 'zh-cn']),
}).strict()

export async function handlePortalTranslate({ request }: { request: Request }): Promise<Response> {
  const access = await resolvePortalAccessForRequest()
  if (!access.granted) return Response.json({ error: 'Not found' }, { status: 404 })
  const bucket = { key: `portal-translate:ip:${getClientIp(request)}`, windowSeconds: 60 }
  const { count } = await incrementBucket(bucket)
  if (count === null || count > 30) {
    return Response.json({ error: 'Please try again later' }, { status: 429, headers: { 'Retry-After': String(await bucketRetryAfter(bucket)) } })
  }
  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > 1024) return Response.json({ error: 'Invalid request' }, { status: 400 })
  let data: z.infer<typeof input>
  try {
    const text = await request.text()
    if (text.length > 1024) throw new Error('too large')
    data = input.parse(JSON.parse(text))
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    let postId
    if (data.kind === 'post') {
      const parsed = postIdSchema.safeParse(data.id)
      if (!parsed.success) return Response.json({ error: 'Not found' }, { status: 404 })
      postId = parsed.data
    } else {
      const parsed = commentIdSchema.safeParse(data.id)
      if (!parsed.success) return Response.json({ error: 'Not found' }, { status: 404 })
      const comment = await db.query.postComments.findFirst({ where: eq(postComments.id, parsed.data), columns: { postId: true } })
      if (!comment) return Response.json({ error: 'Not found' }, { status: 404 })
      postId = comment.postId
    }
    // Use the same server-resolved actor and board policy as the portal itself.
    // The translation service is private to this server's internal network.
    const actor = await policyActorFromAuth(await getOptionalAuth())
    let cursor: string | null = null
    let page = await getPublicPostDetail(postId, actor, { limit: 100, cursor })
    if (!page) return Response.json({ error: 'Not found' }, { status: 404 })
    let source: { content: string; contentJson?: typeof page.contentJson; title?: string } | undefined
    if (data.kind === 'post') {
      source = page
    } else {
      const find = (comments: PublicComment[]): PublicComment | undefined => {
        for (const comment of comments) {
          if (comment.isPrivate || comment.moderationState !== 'published') continue
          if (comment.id === data.id && !comment.deletedAt) return comment
          const child = find(comment.replies)
          if (child) return child
        }
      }
      while (page) {
        const comment = find(page.comments)
        if (comment) { source = comment; break }
        cursor = page.commentsNextCursor
        if (!cursor) break
        page = await getPublicPostDetail(postId, actor, { limit: 100, cursor })
      }
    }
    if (!source) return Response.json({ error: 'Not found' }, { status: 404 })
    const translated = await translateDocument(source.contentJson ?? markdownToTiptapJson(source.content), source.title, data.target)
    return Response.json({ ...translated, content: tiptapJsonToMarkdown(translated.contentJson) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Translation unavailable' }, { status: 503 })
  }
}

export const Route = createFileRoute('/api/portal/translate')({
  server: { handlers: { POST: handlePortalTranslate } },
})
