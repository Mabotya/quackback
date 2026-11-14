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
import { ArchiveBoxIcon } from '@heroicons/react/24/solid'
import { settingsQueries } from '@/lib/client/queries/settings'
import type { ImportRunListItem } from '@/lib/server/functions/data-runs'

const IN_FLIGHT_STATUSES = new Set(['pending', 'dry_run', 'running'])

const STATUS_LABEL: Record<ImportRunListItem['status'], string> = {
  pending: '待機中',
  dry_run: '検証中',
  running: 'インポート中',
  completed: '完了',
  failed: '失敗',
}

const STATUS_VARIANT: Record<
  ImportRunListItem['status'],
  'secondary' | 'default' | 'destructive' | 'success'
> = {
  pending: 'secondary',
  dry_run: 'secondary',
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
}

const SOURCE_LABEL: Record<ImportRunListItem['source'], string> = {
  csv: 'CSV',
  uservoice: 'UserVoice',
  canny: 'Canny',
  api: 'API',
}

function downloadErrorReport(run: ImportRunListItem): void {
  const blob = new Blob([JSON.stringify(run.errorReport ?? [], null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `import-errors-${run.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportHistoryList() {
  const { data: runs, isLoading } = useQuery({
    ...settingsQueries.importRuns(),
    refetchInterval: (query) => {
      const rows = query.state.data
      return rows?.some((r) => IN_FLIGHT_STATUSES.has(r.status)) ? 2000 : false
    },
  })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">インポート履歴を読み込み中...</p>
  }

  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        icon={ArchiveBoxIcon}
        title="インポート履歴はありません"
        description="インポートを開始すると、ここに状態と件数が表示されます。"
        className="py-8"
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>インポート元</TableHead>
            <TableHead>ファイル</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>件数</TableHead>
            <TableHead>開始日時</TableHead>
            <TableHead className="text-right">エラー</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>{SOURCE_LABEL[run.source]}</TableCell>
              <TableCell className="max-w-[220px] truncate" title={run.fileName}>
                {run.fileName}
              </TableCell>
              <TableCell>
                {run.status === 'completed' ? (
                  <span className="text-sm text-muted-foreground">{STATUS_LABEL[run.status]}</span>
                ) : (
                  <Badge variant={STATUS_VARIANT[run.status]}>{STATUS_LABEL[run.status]}</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {run.totals ? (
                  <>
                    {run.totals.created}件作成
                    {run.totals.updated > 0 && `、${run.totals.updated}件更新`}
                    {run.totals.skipped > 0 && `、${run.totals.skipped}件スキップ`}
                  </>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <TimeAgo date={run.createdAt} />
              </TableCell>
              <TableCell className="text-right">
                {run.errorReport && run.errorReport.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => downloadErrorReport(run)}>
                    <ArrowDownTrayIcon className="size-4" />
                    {run.errorReport.length}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
