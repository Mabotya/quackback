import { ValidationError } from '@/lib/shared/errors'

const MB = 1024 * 1024
export const USER_FILE_LIMIT = 10 * MB
export const TEAM_FILE_LIMIT = 100 * MB
export const USER_MESSAGE_LIMIT = 40 * MB

/** Sizes here come only from persisted file rows, never from the request. */
export function checkAttachmentLimits(sizes: number[], team: boolean): void {
  const fileCap = team ? TEAM_FILE_LIMIT : USER_FILE_LIMIT
  let total = 0
  for (const size of sizes) {
    if (!Number.isSafeInteger(size) || size < 0 || size > fileCap) {
      throw new ValidationError('VALIDATION_ERROR', 'Attachment too large')
    }
    total += size
    if (!team && total > USER_MESSAGE_LIMIT) {
      throw new ValidationError('VALIDATION_ERROR', 'Attachments exceed 40 MB')
    }
  }
}
