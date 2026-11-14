import { AnalyticsBarList } from './analytics-bar-list'
import { AnalyticsEmpty } from './analytics-empty'

interface ChangelogCardProps {
  topEntries: Array<{ id: string; title: string; viewCount: number }>
}

export function AnalyticsChangelogCard({ topEntries }: ChangelogCardProps) {
  if (topEntries.length === 0) {
    return <AnalyticsEmpty message="更新履歴はまだありません" />
  }

  return (
    <AnalyticsBarList
      header={{ label: '項目', value: '閲覧数' }}
      rows={topEntries.map((entry) => ({
        key: entry.id,
        label: entry.title,
        value: entry.viewCount,
      }))}
    />
  )
}
