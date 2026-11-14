import { AnalyticsBarList } from './analytics-bar-list'
import { AnalyticsEmpty } from './analytics-empty'

interface SignupSourcesProps {
  sources: Array<{ source: string; count: number }>
}

/** Acquisition-channel breakdown of new signups in the period (Email, Google,
 *  SSO, …), as a proportional bar list. */
export function AnalyticsSignupSources({ sources }: SignupSourcesProps) {
  if (sources.length === 0) {
    return <AnalyticsEmpty message="この期間の新規登録はありません" />
  }

  return (
    <AnalyticsBarList
      header={{ label: '登録元', value: '新規登録' }}
      rows={sources.map((s) => ({ key: s.source, label: s.source, value: s.count }))}
    />
  )
}
