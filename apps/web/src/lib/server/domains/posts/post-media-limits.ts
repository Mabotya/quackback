import { getS3Object } from '@/lib/server/storage/s3'
import { storedAssetKeyFromSrc, trustedStorageHosts } from '@/lib/server/storage/asset-url'
import { ValidationError } from '@/lib/shared/errors'

const FILE_LIMIT = 10 * 1024 * 1024
const TOTAL_LIMIT = 40 * 1024 * 1024
const MEDIA_TYPES = new Set(['image', 'resizableImage', 'video'])

/** Collect storage references from the canonical TipTap document, not from a client-supplied byte count. */
export function storedMediaKeys(document: unknown): Set<string> {
  const keys = new Set<string>()
  const stack: unknown[] = [document]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue
    const record = node as { type?: unknown; attrs?: { src?: unknown }; content?: unknown }
    if (typeof record.type === 'string' && MEDIA_TYPES.has(record.type) && typeof record.attrs?.src === 'string') {
      const src = record.attrs.src
      try {
        const url = new URL(src, 'https://relative.invalid')
        if (url.hostname === 'relative.invalid' || trustedStorageHosts().has(url.hostname.toLowerCase())) {
          const key = storedAssetKeyFromSrc(src)
          if (key) keys.add(key)
        }
      } catch { /* invalid media URLs are handled by content sanitization */ }
    }
    if (Array.isArray(record.content)) stack.push(...record.content)
  }
  return keys
}

/** Verify actual object sizes for a single public post. Existing unchanged attachments remain editable. */
export async function validatePublicPostMedia(document: unknown, previousDocument?: unknown): Promise<void> {
  const keys = storedMediaKeys(document)
  if (previousDocument !== undefined) {
    const previous = storedMediaKeys(previousDocument)
    if (keys.size === previous.size && [...keys].every((key) => previous.has(key))) return
  }
  let total = 0
  for (const key of keys) {
    let size: number
    try {
      const object = await getS3Object(key, 'bytes=0-0')
      const match = object.contentRange?.match(/^bytes \d+-\d+\/(\d+)$/)
      size = match ? Number(match[1]) : Number.NaN
      await object.body.cancel()
      if (!Number.isSafeInteger(size) || size < 0) throw new Error('missing object size')
    } catch {
      throw new ValidationError('MEDIA_SIZE_UNAVAILABLE', 'Unable to verify attachment size')
    }
    if (size > FILE_LIMIT) throw new ValidationError('MEDIA_TOO_LARGE', 'Each attachment must be 10 MB or smaller')
    total += size
    if (total > TOTAL_LIMIT) throw new ValidationError('MEDIA_TOTAL_TOO_LARGE', 'Attachments must total 40 MB or less')
  }
}
