/** Client-side feedback. The server enforces the authoritative limits. */
export const MIB = 1024 * 1024
export type AttachmentLimits = { maxFileBytes: number; maxTotalBytes: number | null }
export const VISITOR_ATTACHMENT_LIMITS: AttachmentLimits = { maxFileBytes: 10 * MIB, maxTotalBytes: 40 * MIB }
export const TEAM_ATTACHMENT_LIMITS: AttachmentLimits = { maxFileBytes: 100 * MIB, maxTotalBytes: null }

/** A localized limit explanation which the rich-text editor may display. */
export class AttachmentLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AttachmentLimitError'
  }
}
