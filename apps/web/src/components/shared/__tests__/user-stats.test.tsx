// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IntlProvider } from 'react-intl'
import { UserStatsBar } from '../user-stats'
import ja from '@/locales/ja.json'
import en from '@/locales/en.json'
import zhTW from '@/locales/zh-tw.json'
import zhCN from '@/locales/zh-cn.json'

afterEach(cleanup)

describe('UserStatsBar', () => {
  it.each([
    ['ja', ja, ['投稿', '投票', 'コメント']],
    ['en', en, ['Posts', 'Votes', 'Comments']],
    ['zh-TW', zhTW, ['貼文', '投票', '留言']],
    ['zh-CN', zhCN, ['帖子', '投票', '评论']],
  ])('keeps labels together in %s', (locale, messages, labels) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={client}>
        <IntlProvider locale={locale} messages={messages}>
          <UserStatsBar fetchStats={async () => ({ ideas: 0, votes: 0, comments: 0 })} />
        </IntlProvider>
      </QueryClientProvider>
    )
    expect(container.firstElementChild?.className).toContain('minmax(max-content,1fr)')
    for (const label of labels) {
      expect(screen.getByText(label).className).toContain('whitespace-nowrap')
    }
  })
})
