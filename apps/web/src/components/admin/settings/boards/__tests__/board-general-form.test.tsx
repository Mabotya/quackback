// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { BoardId } from '@quackback/ids'

const mutate = vi.fn()
vi.mock('@/lib/client/mutations', () => ({
  useUpdateBoard: () => ({
    mutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

import { BoardGeneralForm } from '../board-general-form'

const board = {
  id: 'board_01test' as BoardId,
  name: 'Bug Reports',
  slug: 'bugs',
  description: 'Track issues',
}

beforeEach(() => {
  mutate.mockReset()
  navigate.mockReset()
})

async function edit(label: string, value: string) {
  const field = screen.getByLabelText(label)
  fireEvent.change(field, { target: { value } })
  await act(async () => {
    fireEvent.blur(field)
  })
}

describe('<BoardGeneralForm> autosave', () => {
  it('has no Save button', () => {
    render(<BoardGeneralForm board={board} />)
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
  })

  it('saves when a field loses focus after an edit', async () => {
    render(<BoardGeneralForm board={board} />)
    await edit('説明', 'Updated description')
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0]![0]).toEqual({
      id: board.id,
      name: 'Bug Reports',
      description: 'Updated description',
    })
  })

  it('does not save when nothing changed', async () => {
    render(<BoardGeneralForm board={board} />)
    await act(async () => {
      fireEvent.blur(screen.getByLabelText('名前'))
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('does not save an empty name', async () => {
    render(<BoardGeneralForm board={board} />)
    await edit('名前', '')
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe('<BoardGeneralForm> rename navigation', () => {
  it('navigates to the new slug when a rename changes it', async () => {
    render(<BoardGeneralForm board={board} />)
    await edit('名前', 'Issue Tracker')

    expect(mutate).toHaveBeenCalledTimes(1)
    const opts = mutate.mock.calls[0]![1] as { onSuccess: (b: { slug: string }) => void }
    act(() => {
      opts.onSuccess({ slug: 'issue-tracker' })
    })

    expect(navigate).toHaveBeenCalledWith({
      to: '/admin/settings/boards/$slug',
      params: { slug: 'issue-tracker' },
      search: {},
      replace: true,
    })
  })

  it('does not navigate when the slug is unchanged', async () => {
    render(<BoardGeneralForm board={board} />)
    await edit('説明', 'Updated description')

    const opts = mutate.mock.calls[0]![1] as { onSuccess: (b: { slug: string }) => void }
    act(() => {
      opts.onSuccess({ slug: 'bugs' })
    })

    expect(navigate).not.toHaveBeenCalled()
  })
})

it('hides a board from feedback without overwriting its other settings', () => {
  render(<BoardGeneralForm board={board} />)
  fireEvent.click(screen.getByRole('switch', { name: 'フィードバック一覧に表示しない' }))
  expect(mutate).toHaveBeenCalledWith({
    id: board.id,
    settings: { hideFromFeedback: true },
  })
})
