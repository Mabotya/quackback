import { describe, expect, it } from 'vitest'
import { checkAttachmentLimits, USER_FILE_LIMIT, TEAM_FILE_LIMIT } from '../attachment-limits'

describe('attachment limits', () => {
  it('accepts exactly 10 MB per file and 40 MB per message for a user', () => {
    expect(() => checkAttachmentLimits(Array(4).fill(USER_FILE_LIMIT), false)).not.toThrow()
    expect(() => checkAttachmentLimits([USER_FILE_LIMIT + 1], false)).toThrow()
    expect(() => checkAttachmentLimits([...Array(4).fill(USER_FILE_LIMIT), 1], false)).toThrow()
  })
  it('accepts up to 100 MB per team file without a total-byte limit', () => {
    expect(() => checkAttachmentLimits([TEAM_FILE_LIMIT, TEAM_FILE_LIMIT], true)).not.toThrow()
    expect(() => checkAttachmentLimits([TEAM_FILE_LIMIT + 1], true)).toThrow()
  })
  it('rejects invalid stored sizes', () => {
    expect(() => checkAttachmentLimits([NaN], false)).toThrow()
    expect(() => checkAttachmentLimits([-1], false)).toThrow()
  })
})
