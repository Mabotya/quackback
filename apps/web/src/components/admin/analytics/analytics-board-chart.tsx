import { useMemo } from 'react'
import { AnalyticsBarList } from './analytics-bar-list'
import { AnalyticsEmpty } from './analytics-empty'

interface BoardChartProps {
  data: Array<{ board: string; count: number }>
}

export function AnalyticsBoardChart({ data }: BoardChartProps) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.count - a.count), [data])

  if (sorted.length === 0) {
    return <AnalyticsEmpty message="この期間のデータはありません" />
  }

  return (
    <AnalyticsBarList
      header={{ label: 'ボード', value: '投稿' }}
      rows={sorted.map((item, i) => ({
        // Board names aren't guaranteed unique, so disambiguate with the index.
        key: `${item.board}-${i}`,
        label: item.board,
        value: item.count,
      }))}
    />
  )
}
