// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceDataCard } from '../workspace-data-card'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

describe('WorkspaceDataCard source link', () => {
  it('offers the source from the data section', () => {
    render(<WorkspaceDataCard locale="ja" />)
    expect(screen.getByRole('link', { name: 'ソースコード・ライセンス' })).toHaveAttribute(
      'href',
      'https://github.com/Mabotya/quackback'
    )
  })
})
