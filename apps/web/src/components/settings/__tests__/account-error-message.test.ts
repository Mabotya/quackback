import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import ja from '@/locales/ja.json'
import tw from '@/locales/zh-tw.json'
import { accountErrorMessage } from '../account-error-message'

describe('account error translation', () => {
  const jp = createIntl({ locale: 'ja', messages: ja })
  const taiwan = createIntl({ locale: 'zh-TW', messages: tw })
  it('recognizes a password error code', () => {
    expect(accountErrorMessage({ code: 'INVALID_PASSWORD', message: 'Invalid password' }, jp, 'fallback'))
      .toBe('現在のパスワードが正しくありません。')
  })
  it('recognizes exact email verification and rate limit errors', () => {
    expect(accountErrorMessage(new Error('That code is not right or has expired.'), jp, 'fallback'))
      .toBe('確認コードが正しくないか、有効期限が切れています。')
    expect(accountErrorMessage({ code: 'RATE_LIMITED' }, taiwan, 'fallback'))
      .toBe('嘗試次數過多，請稍後再試。')
  })
  it('does not expose unknown server details', () => {
    expect(accountErrorMessage(new Error('Internal server details'), jp, '変更できませんでした。'))
      .toBe('変更できませんでした。')
  })
})
