import type { IntlShape } from 'react-intl'

/** Only recognize explicit error codes and known messages. Unknown errors may
 * contain internal details and are replaced by the caller's localized fallback. */
export function accountErrorMessage(error: unknown, intl: IntlShape, fallback: string): string {
  const record = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
  const code = typeof record.code === 'string' ? record.code : ''
  const message = typeof record.message === 'string' ? record.message : ''
  if (code === 'INVALID_PASSWORD' || message === 'Invalid password') {
    return intl.formatMessage({ id: 'portal.settings.accountError.invalidPassword', defaultMessage: 'Your current password is incorrect.' })
  }
  if (code === 'RATE_LIMITED' || message === 'Too many attempts. Try again a little later.') {
    return intl.formatMessage({ id: 'portal.settings.accountError.rateLimited', defaultMessage: 'Too many attempts. Please try again later.' })
  }
  if (code === 'SAME_EMAIL' || message === 'That is already your email address.') {
    return intl.formatMessage({ id: 'portal.settings.accountError.sameEmail', defaultMessage: 'That is already your email address.' })
  }
  if (code === 'INVALID_CODE' || message === 'That code is not right or has expired.') {
    return intl.formatMessage({ id: 'portal.settings.accountError.invalidCode', defaultMessage: 'That code is incorrect or has expired.' })
  }
  if (code === 'CURRENT_CODE_REQUIRED' || message === 'Confirm your current address first.') {
    return intl.formatMessage({ id: 'portal.settings.accountError.currentCodeRequired', defaultMessage: 'First confirm your current email address.' })
  }
  if (message === 'Enter a valid email address.') {
    return intl.formatMessage({ id: 'portal.settings.accountError.invalidEmail', defaultMessage: 'Enter a valid email address.' })
  }
  return fallback
}
