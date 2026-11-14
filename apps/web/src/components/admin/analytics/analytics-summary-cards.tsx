import { AnalyticsMetricStrip } from './analytics-metric-strip'

export type MetricKey = 'posts' | 'votes' | 'postComments' | 'users'

export const METRICS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: 'posts', label: '投稿', color: 'var(--metric-posts)' },
  { key: 'votes', label: '投票', color: 'var(--metric-votes)' },
  { key: 'postComments', label: 'コメント', color: 'var(--metric-comments)' },
  { key: 'users', label: 'ユーザー', color: 'var(--metric-users)' },
]

interface MetricBarProps {
  summary: {
    posts: { total: number; delta: number }
    votes: { total: number; delta: number }
    postComments: { total: number; delta: number }
    users: { total: number; delta: number }
  }
  activeMetric: MetricKey
  onMetricChange: (key: MetricKey) => void
}

export function AnalyticsSummaryCards({ summary, activeMetric, onMetricChange }: MetricBarProps) {
  return (
    <AnalyticsMetricStrip
      items={METRICS.map(({ key, label, color }) => ({
        key,
        label,
        color,
        value: summary[key].total,
        delta: summary[key].delta,
      }))}
      activeKey={activeMetric}
      onChange={(key) => onMetricChange(key as MetricKey)}
      gridClassName="grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x"
    />
  )
}
