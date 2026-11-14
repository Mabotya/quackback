// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionSkeleton } from '../analytics-skeletons'

describe('<SectionSkeleton>', () => {
  it('feedback: matches the two-card Boards / Top posts layout', () => {
    render(<SectionSkeleton section="feedback" />)
    expect(screen.getByText('ボード')).toBeInTheDocument()
    expect(screen.getByText('人気の投稿')).toBeInTheDocument()
  })

  it('users: matches the signups-source card layout', () => {
    render(<SectionSkeleton section="users" />)
    expect(screen.getByText('登録元別の新規登録')).toBeInTheDocument()
  })

  it('overview and changelog do not render the feedback list cards', () => {
    const { rerender } = render(<SectionSkeleton section="overview" />)
    expect(screen.queryByText('ボード')).toBeNull()
    expect(screen.queryByText('登録元別の新規登録')).toBeNull()
    rerender(<SectionSkeleton section="changelog" />)
    expect(screen.queryByText('ボード')).toBeNull()
  })
})
