import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { countryName, countryFlag } from '@/lib/shared/country'
import { AnalyticsBarList, type BarListRow } from './analytics-bar-list'
import { AnalyticsEmpty } from './analytics-empty'

type TopBreakdowns = Record<string, Array<{ label: string; count: number }>>
const japaneseRegions = new Intl.DisplayNames(['ja'], { type: 'region' })

function japaneseCountryName(code: string): string {
  try {
    return japaneseRegions.of(code.toUpperCase()) ?? countryName(code)
  } catch {
    return countryName(code)
  }
}

const PANELS: Array<{
  dimension: string
  title: string
  header: string
  format?: (label: string) => BarListRow['label']
}> = [
  { dimension: 'page', title: '人気のページ', header: 'ページ' },
  { dimension: 'source', title: '流入元', header: '流入元' },
  {
    dimension: 'country',
    title: '国',
    header: '国',
    format: (code) => `${countryFlag(code)} ${japaneseCountryName(code)}`,
  },
  { dimension: 'device', title: 'デバイス', header: 'デバイス' },
  { dimension: 'browser', title: 'ブラウザー', header: 'ブラウザー' },
  { dimension: 'os', title: 'OS', header: 'OS' },
]

/** The breakdown grid: six visitor-ranked bar lists fed by the rollup
 *  snapshots (top 10 per dimension for the selected period + surface). */
export function AnalyticsVisitorPanels({ top }: { top: TopBreakdowns }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 md:items-start">
      {PANELS.map(({ dimension, title, header, format }) => {
        const rows = top[dimension] ?? []
        return (
          <Card key={dimension}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[320px] overflow-y-auto scrollbar-thin">
              {rows.length === 0 ? (
                <AnalyticsEmpty message="この期間のデータはありません" />
              ) : (
                <AnalyticsBarList
                  header={{ label: header, value: '訪問者' }}
                  rows={rows.map((row) => ({
                    key: row.label,
                    label: format ? format(row.label) : row.label,
                    value: row.count,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
