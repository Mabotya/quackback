// @vitest-environment happy-dom
/**
 * The Quinn section reads its headline figures, outcome bar, actions and
 * Copilot rows from the same server results, over the one range the page's
 * period names.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const hoisted = vi.hoisted(() => ({ quinn: vi.fn(), tools: vi.fn(), copilot: vi.fn() }))

vi.mock('@/lib/server/functions/assistant-analytics', () => ({
  getQuinnPerformanceFn: hoisted.quinn,
}))
vi.mock('@/lib/server/functions/assistant-tools-analytics', () => ({
  getQuinnToolMetricsFn: hoisted.tools,
}))
vi.mock('@/lib/server/functions/assistant-copilot-analytics', () => ({
  getCopilotUsageMetricsFn: hoisted.copilot,
}))

import { AnalyticsQuinnSection } from '../analytics-quinn-section'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const RANGE = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' }

function renderSection(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const QUINN = {
  involvements: 40,
  conversations: 100,
  involvementRate: 40,
  resolvedConfirmed: 12,
  resolvedAssumed: 8,
  resolutionRate: 50,
  handedOff: 10,
  systemErrors: 0,
  escalationRate: 25,
  pending: 10,
  actionsTaken: 17,
  dailyTrend: [],
  csat: { avgRating: 4.25, responseCount: 6 },
}

const TOOLS = [
  { toolName: 'create_ticket', succeeded: 5, failed: 2, denied: 1, skippedDuplicate: 0 },
  { toolName: 'search', succeeded: 30, failed: 0, denied: 0, skippedDuplicate: 0 },
]

const COPILOT = {
  totalQuestions: 21,
  totalTransforms: 4,
  totalSummaries: 2,
  actionsProposed: 9,
  actionsApproved: 6,
  actionsRejected: 2,
  actionsExpired: 1,
  totalInserted: 13,
}

describe('AnalyticsQuinnSection', () => {
  it('shows the headline figures from the Quinn performance result', async () => {
    hoisted.quinn.mockResolvedValue(QUINN)
    hoisted.tools.mockResolvedValue(TOOLS)
    hoisted.copilot.mockResolvedValue(COPILOT)
    const { container } = renderSection(
      <AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />
    )
    await screen.findByText('対応した会話')
    // The headline row is the first card; "Escalated" also labels an outcome below it.
    const headline = container.querySelector('[data-slot="card"]') as HTMLElement
    const tile = (label: string) => within(headline).getByText(label).parentElement!
    const involved = tile('対応した会話')
    expect(within(involved).getByText('40')).toBeInTheDocument()
    expect(within(involved).getByText('会話全体の40%')).toBeInTheDocument()
    const resolved = tile('解決済み')
    expect(within(resolved).getByText('50%')).toBeInTheDocument()
    expect(within(resolved).getByText('確認済み 12件、推定 8件')).toBeInTheDocument()
    const escalated = tile('担当者へ引き継ぎ')
    expect(within(escalated).getByText('25%')).toBeInTheDocument()
    const csat = tile('AI CSAT')
    expect(within(csat).getByText('4.3')).toBeInTheDocument()
    expect(within(csat).getByText('6件の評価')).toBeInTheDocument()
  })

  it('draws the outcome bar from the same counts as the headline', async () => {
    hoisted.quinn.mockResolvedValue(QUINN)
    hoisted.tools.mockResolvedValue([])
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />)

    const outcomes = (await screen.findByText('対応結果')).closest('[data-slot="card"]')!
    const legend = (label: string) =>
      within(outcomes as HTMLElement).getByText(label).parentElement!.textContent
    expect(legend('解決を確認')).toContain('12')
    expect(legend('解決と推定')).toContain('8')
    expect(legend('担当者へ引き継ぎ')).toContain('10')
    expect(legend('保留中')).toContain('10')
    expect(within(outcomes as HTMLElement).queryByText('システムエラー')).toBeNull()
  })

  it('lists system errors in the outcomes only when there were some', async () => {
    hoisted.quinn.mockResolvedValue({ ...QUINN, systemErrors: 3, pending: 7 })
    hoisted.tools.mockResolvedValue([])
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />)
    const outcomes = (await screen.findByText('対応結果')).closest('[data-slot="card"]')!
    expect(
      within(outcomes as HTMLElement).getByText('システムエラー').parentElement!.textContent
    ).toContain('3')
  })

  it('tables the actions per tool and the Copilot activity under the period label', async () => {
    hoisted.quinn.mockResolvedValue(QUINN)
    hoisted.tools.mockResolvedValue(TOOLS)
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 7 days" />)

    const ticketRow = (await screen.findByText('Create a ticket')).closest('tr')!
    // attempted = succeeded + failed + denied
    expect(Array.from(ticketRow.querySelectorAll('td')).map((c) => c.textContent)).toEqual([
      'Create a ticket',
      '8',
      '5',
      '2',
    ])

    const copilot = screen.getByText('Copilot').closest('[data-slot="card"]') as HTMLElement
    expect(within(copilot).getByText('Last 7 days')).toBeInTheDocument()
    const rowOf = (label: string) => within(copilot).getByText(label).closest('tr')!.textContent
    expect(rowOf('回答した質問')).toContain('21')
    expect(rowOf('使用された提案')).toContain('13')
    expect(rowOf('提案されたアクション')).toContain('9')
    expect(rowOf('承認されたアクション')).toContain('6')
  })

  it('asks every server function for the one range', async () => {
    hoisted.quinn.mockResolvedValue(QUINN)
    hoisted.tools.mockResolvedValue(TOOLS)
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />)
    await screen.findByText('Create a ticket')
    for (const fn of [hoisted.quinn, hoisted.tools, hoisted.copilot]) {
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn.mock.calls[0][0]).toEqual({ data: RANGE })
    }
  })

  it('says so when Quinn handled nothing, and still shows the other cards', async () => {
    hoisted.quinn.mockResolvedValue({
      ...QUINN,
      involvements: 0,
      resolvedConfirmed: 0,
      resolvedAssumed: 0,
      handedOff: 0,
      pending: 0,
      csat: { avgRating: 0, responseCount: 0 },
    })
    hoisted.tools.mockResolvedValue([])
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />)
    expect(
      await screen.findByText("この期間にAIエージェントが対応した会話はありません")
    ).toBeInTheDocument()
    expect(screen.queryByText('対応結果')).toBeNull()
    expect(await screen.findByText('この期間のアクションはありません')).toBeInTheDocument()
    expect(screen.getByText('回答した質問')).toBeInTheDocument()
  })

  it('reads a missing CSAT as a hyphen', async () => {
    hoisted.quinn.mockResolvedValue({ ...QUINN, csat: { avgRating: 0, responseCount: 0 } })
    hoisted.tools.mockResolvedValue([])
    hoisted.copilot.mockResolvedValue(COPILOT)
    renderSection(<AnalyticsQuinnSection range={RANGE} periodLabel="Last 30 days" />)
    const csat = (await screen.findByText('AI CSAT')).parentElement!
    expect(within(csat).getByText('-')).toBeInTheDocument()
  })
})
