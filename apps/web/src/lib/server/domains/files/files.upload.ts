/**
 * The HTTP half of a file upload, shared by the agent, widget, portal and
 * public API routes. Each route authenticates its own caller and says who the
 * sender is; this reads the body under the size cap and stores it.
 *
 * The body is the raw file (not multipart), named by `?name=`, so the server
 * reads it as a stream and stops at the cap instead of parsing a form that was
 * already buffered whole.
 */
import type { PrincipalId } from '@quackback/ids'
import { isS3Usable } from '@/lib/server/storage/s3'
import { readBodyWithLimit } from '@/lib/server/utils/read-body'
import { formatBytes } from '@/lib/shared/files/file-types'
import { db, eq, principal } from '@/lib/server/db'
import { logger } from '@/lib/server/logger'
import { storeFile, toUploadedFile, FileRejectedError, type FileSource } from './files.service'
import { TEAM_FILE_LIMIT, USER_FILE_LIMIT } from './attachment-limits'

const log = logger.child({ component: 'file-upload' })

export interface FileUploadSender {
  source: FileSource
  uploadedById: PrincipalId | null
  unverifiedSender: boolean
}

const REJECTION_STATUS = { empty: 400, too_large: 413, blocked: 415 } as const

export async function handleFileUploadRequest(
  request: Request,
  sender: FileUploadSender
): Promise<Response> {
  if (!isS3Usable()) {
    return Response.json({ error: 'File storage is not configured' }, { status: 503 })
  }
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  if (!name) return Response.json({ error: 'Missing file name' }, { status: 400 })
  const declaredType = request.headers.get('content-type')

  // Membership is derived from the database, never from the file name or client.
  const record = sender.uploadedById
    ? await db.query.principal.findFirst({ where: eq(principal.id, sender.uploadedById), columns: { role: true } })
    : null
  const readCap = record?.role === 'admin' || record?.role === 'member' ? TEAM_FILE_LIMIT : USER_FILE_LIMIT
  const bytes = await readBodyWithLimit(request, readCap)
  if (!bytes) {
    return Response.json(
      { error: `Over ${formatBytes(readCap)}`, reason: 'too_large' },
      { status: 413 }
    )
  }

  try {
    const row = await storeFile({
      bytes,
      name,
      declaredType,
      source: sender.source,
      uploadedById: sender.uploadedById,
      unverifiedSender: sender.unverifiedSender,
      maxBytes: readCap,
    })
    return Response.json(toUploadedFile(row), { status: 201 })
  } catch (err) {
    if (err instanceof FileRejectedError) {
      return Response.json(
        { error: err.message, reason: err.reason },
        { status: REJECTION_STATUS[err.reason] }
      )
    }
    log.error({ err, source: sender.source }, 'file upload failed')
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
