'use client'

import { useQuery } from '@tanstack/react-query'
import { useIntl } from 'react-intl'
import { getUserStatsFn, type UserEngagementStats } from '@/lib/server/functions/user'
import { cn } from '@/lib/shared/utils'

function StatItem({
  value,
  label,
  compact,
}: {
  value: number | undefined
  label: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center rounded-md bg-muted/40',
        compact ? 'px-1 py-1.5' : 'px-1.5 py-2'
      )}
    >
      <span
        className={cn('font-bold tabular-nums text-foreground', compact ? 'text-sm' : 'text-lg')}
      >
        {value ?? '-'}
      </span>
      <span className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

interface UserStatsBarProps {
  compact?: boolean
  className?: string
  headers?: Record<string, string>
  fetchStats?: () => Promise<UserEngagementStats>
}

export function UserStatsBar({ compact, className, headers, fetchStats }: UserStatsBarProps) {
  const intl = useIntl()
  const { data } = useQuery({
    queryKey:
      fetchStats || headers ? ['widget', 'user', 'engagement-stats'] : ['user', 'engagement-stats'],
    queryFn: () => (fetchStats ? fetchStats() : getUserStatsFn(headers ? { headers } : undefined)),
    staleTime: 60 * 1000,
  })

  return (
    <div className={cn('grid grid-cols-[repeat(3,minmax(max-content,1fr))] gap-1', className)}>
      <StatItem
        value={data?.ideas}
        label={intl.formatMessage({ id: 'common.userStats.ideas', defaultMessage: 'Posts' })}
        compact={compact}
      />
      <StatItem
        value={data?.votes}
        label={intl.formatMessage({ id: 'common.userStats.votes', defaultMessage: 'Votes' })}
        compact={compact}
      />
      <StatItem
        value={data?.comments}
        label={intl.formatMessage({ id: 'common.userStats.comments', defaultMessage: 'Comments' })}
        compact={compact}
      />
    </div>
  )
}
