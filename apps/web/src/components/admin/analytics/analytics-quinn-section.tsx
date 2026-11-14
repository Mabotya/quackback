import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormatNumber } from '@/components/ui/format-number'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { quinnPerformanceQuery } from '@/lib/client/queries/assistant-analytics'
import { quinnToolMetricsQuery } from '@/lib/client/queries/assistant-tools-analytics'
import { copilotUsageMetricsQuery } from '@/lib/client/queries/assistant-copilot-analytics'
import type { DateRange } from '@/lib/client/queries/analytics'
import { cn } from '@/lib/shared/utils'
import { AnalyticsEmpty } from './analytics-empty'
import { LoadError } from './analytics-load-error'
import { AnalyticsStatRow } from './analytics-stat-row'
import { SectionSkeleton } from './analytics-skeletons'

const ACTION_LABELS: Record<string, string> = {
  search: 'Find an answer',
  // Historical ledger rows predate the tool's rename to `search`.
  search_knowledge: 'Find an answer',
  set_attribute: 'Update customer details',
  end_conversation: 'End a conversation',
  create_ticket: 'Create a ticket',
  capture_feedback: 'Capture feedback',
  share_post: 'Share a feedback post',
}

function ActionLabel({ toolName }: { toolName: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help font-medium">{ACTION_LABELS[toolName] ?? 'Action'}</span>
      </TooltipTrigger>
      <TooltipContent>Technical name: {toolName}</TooltipContent>
    </Tooltip>
  )
}

/** Quinn's outcome split as a proportional bar. System errors (a hand-off the
 *  platform forced, not Quinn's judgment) get a segment only when there were any. */
function OutcomeBar({
  confirmed,
  assumed,
  escalated,
  pending,
  systemErrors,
}: {
  confirmed: number
  assumed: number
  escalated: number
  pending: number
  systemErrors: number
}) {
  const formatNumber = useFormatNumber()
  const items = [
    { label: '解決を確認', value: confirmed, className: 'bg-success' },
    { label: '解決と推定', value: assumed, className: 'bg-success/50' },
    { label: '担当者へ引き継ぎ', value: escalated, className: 'bg-warning' },
    { label: '保留中', value: pending, className: 'bg-primary' },
    ...(systemErrors > 0
      ? [{ label: 'システムエラー', value: systemErrors, className: 'bg-destructive' }]
      : []),
  ]
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {items.map((i) => (
          <div
            key={i.label}
            className={i.className}
            style={{ width: `${(i.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-1.5 text-xs">
            <span className={cn('h-2 w-2 rounded-full', i.className)} />
            <span className="text-muted-foreground">{i.label}</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatNumber(i.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** The Quinn section: headline figures, the outcome split, what Quinn did with
 *  its tools, and how the team used Copilot, all over one range. */
export function AnalyticsQuinnSection({
  range,
  periodLabel,
}: {
  range: DateRange
  periodLabel: string
}) {
  const formatNumber = useFormatNumber()
  const performance = useQuery(quinnPerformanceQuery(range.from, range.to))
  const tools = useQuery(quinnToolMetricsQuery(range.from, range.to))
  const copilot = useQuery(copilotUsageMetricsQuery(range.from, range.to))

  const quinn = performance.data
  const toolList = tools.data ?? []
  const usage = copilot.data

  return (
    <div className="flex flex-col gap-6">
      {performance.isError ? (
        <Card className="overflow-hidden py-0">
          <LoadError
            message="AIエージェントの結果を読み込めませんでした。"
            onRetry={() => void performance.refetch()}
          />
        </Card>
      ) : !quinn ? (
        <SectionSkeleton section="ai" />
      ) : quinn.involvements === 0 ? (
        <Card className="overflow-hidden">
          <AnalyticsEmpty message="この期間にAIエージェントが対応した会話はありません" />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden py-0 gap-0">
            <AnalyticsStatRow
              stats={[
                {
                  label: '対応した会話',
                  value: formatNumber(quinn.involvements),
                  caption: `会話全体の${quinn.involvementRate}%`,
                },
                {
                  label: '解決済み',
                  value: `${quinn.resolutionRate}%`,
                  caption: `確認済み ${formatNumber(quinn.resolvedConfirmed)}件、推定 ${formatNumber(quinn.resolvedAssumed)}件`,
                },
                {
                  label: '担当者へ引き継ぎ',
                  value: `${quinn.escalationRate}%`,
                  caption: `${formatNumber(quinn.handedOff)}件を引き継ぎ`,
                },
                {
                  label: 'AI CSAT',
                  value: quinn.csat.responseCount > 0 ? quinn.csat.avgRating.toFixed(1) : '-',
                  suffix: quinn.csat.responseCount > 0 ? '/ 5' : undefined,
                  caption:
                    quinn.csat.responseCount > 0
                      ? `${formatNumber(quinn.csat.responseCount)}件の評価`
                      : undefined,
                },
              ]}
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>対応結果</CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeBar
                confirmed={quinn.resolvedConfirmed}
                assumed={quinn.resolvedAssumed}
                escalated={quinn.handedOff}
                pending={quinn.pending}
                systemErrors={quinn.systemErrors}
              />
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <Card>
          <CardHeader>
            <CardTitle>アクション</CardTitle>
          </CardHeader>
          <CardContent>
            {tools.isError ? (
              <LoadError
                message="アクションを読み込めませんでした。"
                onRetry={() => void tools.refetch()}
              />
            ) : tools.isSuccess && toolList.length === 0 ? (
              <AnalyticsEmpty message="この期間のアクションはありません" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>アクション</TableHead>
                    <TableHead className="text-right">実行数</TableHead>
                    <TableHead className="text-right">完了</TableHead>
                    <TableHead className="text-right">失敗</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toolList.map((tool) => (
                    <TableRow key={tool.toolName}>
                      <TableCell>
                        <ActionLabel toolName={tool.toolName} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tool.succeeded + tool.failed + tool.denied}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{tool.succeeded}</TableCell>
                      <TableCell className="text-right tabular-nums">{tool.failed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copilot</CardTitle>
          </CardHeader>
          <CardContent>
            {copilot.isError ? (
              <LoadError
                message="Copilotの利用状況を読み込めませんでした。"
                onRetry={() => void copilot.refetch()}
              />
            ) : usage &&
              usage.totalQuestions +
                usage.totalTransforms +
                usage.totalSummaries +
                usage.actionsProposed ===
                0 ? (
              <AnalyticsEmpty message="この期間のCopilotの利用はありません" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>アクティビティ</TableHead>
                    <TableHead className="text-right">{periodLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ['回答した質問', usage?.totalQuestions],
                    ['使用された提案', usage?.totalInserted],
                    ['提案されたアクション', usage?.actionsProposed],
                    ['承認されたアクション', usage?.actionsApproved],
                  ].map(([label, value]) => (
                    <TableRow key={label}>
                      <TableCell>{label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {typeof value === 'number' ? formatNumber(value) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
