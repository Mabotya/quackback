import { useQuery } from '@tanstack/react-query'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared/empty-state'
import { TimeAgo } from '@/components/ui/time-ago'
import {
  formatNumberIn,
  useFormatNumber,
  type NumberFormatter,
} from '@/components/ui/format-number'
import { DEFAULT_LOCALE } from '@/lib/shared/i18n'
import { ArchiveBoxIcon } from '@heroicons/react/24/solid'
import { settingsQueries } from '@/lib/client/queries/settings'
import type { ExportRunListItem } from '@/lib/server/functions/data-runs'

const IN_FLIGHT_STATUSES = new Set<ExportRunListItem['status']>(['pending', 'running'])

const STATUS_LABEL: Record<ExportRunListItem['status'], string> = {
  pending: '待機中',
  running: 'エクスポート中',
  completed: '完了',
  failed: '失敗',
}

const STATUS_VARIANT: Record<
  ExportRunListItem['status'],
  'secondary' | 'default' | 'destructive' | 'success'
> = {
  pending: 'secondary',
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "1,204 posts · 86 companies · 5,632 votes +4 more" */
export function summarizeEntityCounts(
  counts: Record<string, number>,
  formatNumber: NumberFormatter = (n) => formatNumberIn(DEFAULT_LOCALE, n)
): string {
  const entries = Object.entries(counts)
  if (entries.length === 0) return '-'
  const shown = entries
    .slice(0, 3)
    .map(([key, count]) => `${formatNumber(count)} ${key.replace(/_/g, ' ')}`)
  const rest = entries.length - shown.length
  return rest > 0 ? `${shown.join(' · ')} +${rest} more` : shown.join(' · ')
}

function isExpired(run: ExportRunListItem): boolean {
  return run.expiresAt != null && new Date(run.expiresAt).getTime() < Date.now()
}

export function ExportHistoryList() {
  const formatNumber = useFormatNumber()
  const { data: runs, isLoading } = useQuery({
    ...settingsQueries.exportRuns(),
    refetchInterval: (query) => {
      const rows = query.state.data
      return rows?.some((r) => IN_FLIGHT_STATUSES.has(r.status)) ? 2000 : false
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">エクスポート履歴を読み込み中...</p>
  }

  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        icon={ArchiveBoxIcon}
        title="エクスポート履歴はありません"
        description="エクスポートを開始すると、ここにダウンロードリンクが表示されます。"
        className="py-8"
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>開始日時</TableHead>
            <TableHead>サイズ</TableHead>
            <TableHead>内容</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className="text-right">ダウンロード</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="text-sm text-muted-foreground">
                <TimeAgo date={run.createdAt} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {run.sizeBytes != null ? formatBytes(run.sizeBytes) : '-'}
              </TableCell>
              <TableCell
                className="max-w-[260px] truncate text-sm text-muted-foreground"
                title={
                  run.error ??
                  (run.entityCounts ? summarizeEntityCounts(run.entityCounts, formatNumber) : '')
                }
              >
                {run.status === 'failed'
                  ? (run.error ?? 'エクスポートに失敗しました')
                  : run.entityCounts
                    ? summarizeEntityCounts(run.entityCounts, formatNumber)
                    : '-'}
              </TableCell>
              <TableCell>
                {run.status === 'completed' ? (
                  <span className="text-sm text-muted-foreground">{STATUS_LABEL[run.status]}</span>
                ) : (
                  <Badge variant={STATUS_VARIANT[run.status]}>{STATUS_LABEL[run.status]}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {run.status === 'completed' && !isExpired(run) ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/api/export/runs/${run.id}/download`}>
                      <ArrowDownTrayIcon className="size-4" />
                      ZIP
                    </a>
                  </Button>
                ) : run.status === 'completed' && isExpired(run) ? (
                  <span className="text-sm text-muted-foreground">期限切れ</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
