// @vitest-environment happy-dom
/**
 * <BoardModerationForm> — R4 per-board moderation overrides.
 *
 * Covers:
 *   - Renders all three rule rows
 *   - Inheritance banner reflects override state
 *   - Inherit option mirrors the workspace default ("none" → Off,
 *     "all" → On, axis-aware mapping otherwise)
 *   - A rule change autosaves a payload that overwrites only the moderation
 *     slice and preserves the rest of `board.access` verbatim
 *
 * The mutation and portalConfig queries are mocked. portalConfig is
 * mutable so tests can flip workspace defaults between renders.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardModerationForm } from '../board-moderation-form'
import { DEFAULT_BOARD_ACCESS, type BoardAccess } from '@/lib/shared/db-types'
import type { BoardId } from '@quackback/ids'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const mutate = vi.fn()
vi.mock('@/lib/client/mutations', () => ({
  useUpdateBoardAccess: () => ({
    mutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const wsFlagsState = {
  requireApproval: 'none' as 'none' | 'anonymous' | 'authenticated' | 'all',
}
function setWsFlags(next: Partial<typeof wsFlagsState>) {
  Object.assign(wsFlagsState, next)
}

vi.mock('@/lib/client/queries/settings', () => ({
  settingsQueries: {
    portalConfig: () => ({
      queryKey: ['settings', 'portalConfig'],
      queryFn: async () => ({
        features: {
          allowAnonymous: true,
          allowEditAfterEngagement: false,
          allowDeleteAfterEngagement: false,
          showPublicEditHistory: false,
        },
        moderationDefault: { requireApproval: wsFlagsState.requireApproval },
        oauth: {},
        access: {
          visibility: 'public' as const,
          allowedDomains: [],
          widgetSignIn: false,
          allowedSegmentIds: [],
        },
      }),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOARD_ID = 'brd_test' as BoardId

const MOD_RULE_LABELS = {
  anonPosts: '匿名の投稿に承認を必須にする',
  signedPosts: 'ログイン済みユーザーの投稿に承認を必須にする',
  comments: '新しいコメントに承認を必須にする',
} as const

/** Default-public BoardAccess matching the new "Public" preset. */
const PUBLIC_ACCESS: BoardAccess = {
  view: 'anonymous',
  vote: 'authenticated',
  comment: 'authenticated',
  submit: 'authenticated',
  segments: { view: [], vote: [], comment: [], submit: [] },
  moderation: { anonPosts: 'inherit', signedPosts: 'inherit', comments: 'inherit' },
}

/** One option of a rule's segmented control. */
function radio(rule: keyof typeof MOD_RULE_LABELS, name: string | RegExp) {
  return within(screen.getByRole('radiogroup', { name: MOD_RULE_LABELS[rule] })).getByRole(
    'radio',
    {
      name,
    }
  )
}

function renderForm(access: BoardAccess = DEFAULT_BOARD_ACCESS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BoardModerationForm board={{ id: BOARD_ID, access }} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mutate.mockReset()
  setWsFlags({ requireApproval: 'none' })
})

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('<BoardModerationForm> rendering', () => {
  it('renders the three rule rows', () => {
    renderForm(PUBLIC_ACCESS)
    expect(screen.getByText(MOD_RULE_LABELS.anonPosts)).toBeInTheDocument()
    expect(screen.getByText(MOD_RULE_LABELS.signedPosts)).toBeInTheDocument()
    expect(screen.getByText(MOD_RULE_LABELS.comments)).toBeInTheDocument()
  })

  it('renders the "inheriting" banner when every rule is inherit', () => {
    renderForm(PUBLIC_ACCESS)
    expect(screen.getByText(/ワークスペースの既定値をすべて継承/)).toBeInTheDocument()
    expect(screen.queryByText(/上書き/)).not.toBeInTheDocument()
  })

  it('renders the "overrides" banner + Override badge when a rule is set', () => {
    renderForm({
      ...PUBLIC_ACCESS,
      moderation: { anonPosts: 'on', signedPosts: 'inherit', comments: 'inherit' },
    })
    expect(screen.getByText('個別設定')).toBeInTheDocument()
    const banners = screen.getAllByText(
      (_, el) =>
        el?.tagName === 'DIV' &&
        !!el.textContent &&
        /ワークスペースの既定値の一部を上書き/.test(el.textContent)
    )
    expect(banners.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Inheritance option
// ---------------------------------------------------------------------------

describe('<BoardModerationForm> inheritance option', () => {
  it('Inherit option reflects workspace default ("none" → all Off)', async () => {
    setWsFlags({ requireApproval: 'none' })
    renderForm(PUBLIC_ACCESS)
    await waitFor(() => {
      const anonInherit = radio('anonPosts', /^継承/)
      expect(anonInherit.textContent).toMatch(/オフ/)
    })
    expect(radio('signedPosts', /^継承/).textContent).toMatch(/オフ/)
    expect(radio('comments', /^継承/).textContent).toMatch(/オフ/)
  })

  it('Inherit option reflects workspace default ("all" → all On)', async () => {
    setWsFlags({ requireApproval: 'all' })
    renderForm(PUBLIC_ACCESS)
    await waitFor(() => {
      const anonInherit = radio('anonPosts', /^継承/)
      expect(anonInherit.textContent).toMatch(/オン/)
    })
    expect(radio('signedPosts', /^継承/).textContent).toMatch(/オン/)
    expect(radio('comments', /^継承/).textContent).toMatch(/オン/)
  })
})

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

describe('<BoardModerationForm> autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders no save dock or Save button', () => {
    renderForm(PUBLIC_ACCESS)
    expect(screen.queryByRole('region', { name: /save changes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('does not save until a rule changes', () => {
    renderForm(PUBLIC_ACCESS)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('saves a payload that overwrites only moderation and preserves the rest of access', () => {
    // Non-default access shape: every field must round-trip unchanged.
    const access: BoardAccess = {
      view: 'anonymous',
      vote: 'segments',
      comment: 'team',
      submit: 'authenticated',
      segments: {
        view: [],
        vote: ['seg_alpha'],
        comment: [],
        submit: [],
      },
      moderation: { anonPosts: 'inherit', signedPosts: 'inherit', comments: 'inherit' },
    }
    renderForm(access)

    fireEvent.click(radio('anonPosts', 'オン'))
    fireEvent.click(radio('comments', 'オフ'))
    expect(mutate).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({
      boardId: BOARD_ID,
      access: {
        view: 'anonymous',
        vote: 'segments',
        comment: 'team',
        submit: 'authenticated',
        segments: {
          view: [],
          vote: ['seg_alpha'],
          comment: [],
          submit: [],
        },
        moderation: { anonPosts: 'on', signedPosts: 'inherit', comments: 'off' },
      },
    })
  })

  it('does not save when a rule is set and set back before the pause ends', () => {
    renderForm(PUBLIC_ACCESS)
    fireEvent.click(radio('anonPosts', 'オン'))
    fireEvent.click(radio('anonPosts', /^継承/))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows the Override badge as soon as a rule is set', () => {
    renderForm(PUBLIC_ACCESS)
    fireEvent.click(radio('anonPosts', 'オン'))
    expect(screen.getByText('個別設定')).toBeInTheDocument()
  })
})
