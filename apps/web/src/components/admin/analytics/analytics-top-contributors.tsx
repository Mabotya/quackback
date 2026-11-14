import { Avatar } from '@/components/ui/avatar'
import { AnalyticsBarList } from './analytics-bar-list'
import { AnalyticsEmpty } from './analytics-empty'

interface TopContributorsProps {
  contributors: Array<{
    principalId: string
    displayName: string | null
    avatarUrl: string | null
    posts: number
    votes: number
    comments: number
    total: number
  }>
}

export function AnalyticsTopContributors({ contributors }: TopContributorsProps) {
  if (contributors.length === 0) {
    return <AnalyticsEmpty message="この期間に貢献者の活動はありません" />
  }

  return (
    <AnalyticsBarList
      header={{ label: '貢献者', value: 'アクティビティ' }}
      rows={contributors.map((c) => ({
        key: c.principalId,
        value: c.total,
        leading: (
          <Avatar
            src={c.avatarUrl}
            name={c.displayName}
            className="relative size-5 shrink-0 text-xs"
          />
        ),
        label: c.displayName ?? '匿名',
      }))}
    />
  )
}
