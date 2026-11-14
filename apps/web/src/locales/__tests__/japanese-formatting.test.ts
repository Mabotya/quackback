import { describe, expect, it } from 'vitest'
import { createIntl, createIntlCache } from 'react-intl'
import ja from '../ja.json'

describe('Japanese message formatting', () => {
  it('does not contain machine-translation placeholder markup', () => {
    expect(Object.values(ja).filter((message) => /<\/?b\s*translate\s*=/i.test(message))).toEqual([])
  })

  it('formats counters and activity messages with multiple values', () => {
    const intl = createIntl({ locale: 'ja', messages: ja, onError: (error) => { throw error } }, createIntlCache())
    expect(intl.formatMessage({ id: 'files.viewer.counter' }, { current: 2, total: 10 })).toBe('10件中2件目')
    expect(intl.formatMessage({ id: 'files.find.matchCount' }, { current: 2, total: 10 })).toBe('10件中2件目')
    expect(intl.formatMessage({ id: 'files.find.matchCountCapped' }, { current: 2, total: 10 })).toBe('10件以上中2件目')
    expect(intl.formatMessage({ id: 'portal.status.uptime.dayTooltip' }, { day: '月曜', label: '稼働', pct: 99 })).toBe('月曜: 稼働、99%')
    expect(intl.formatMessage({ id: 'admin.ticketActivity.priorityChanged' }, { actor: 'A', priority: '高' })).toBe('Aが優先度を高に設定しました')
    expect(intl.formatMessage({ id: 'admin.ticketActivity.fromTo' }, { from: '旧', to: '新' })).toBe('旧 → 新')
    expect(intl.formatMessage({ id: 'onboarding.tour.count' }, { step: 2, total: 10 })).toBe('10ステップ中2番目')
    expect(intl.formatMessage({ id: 'onboarding.win.who.nameDomain' }, { name: 'A', domain: 'example.com' })).toBe('A（example.com）')
    expect(intl.formatMessage({ id: 'portal.postCard.vote.ariaVote' }, { count: 3 })).toBe('この投稿に投票する（3票）')
  })
})
