// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { translationTarget, useContentTranslation } from '../content-translation'
import japanese from '@/locales/ja.json'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function Example({ content = 'Hello' }: { content?: string }) {
  const translation = useContentTranslation({ kind: 'comment', id: 'comment-1', sourceKey: content })
  return <><p>{translation.translated?.content ?? content}</p>{translation.control}</>
}

function show(content = 'Hello') {
  return render(<IntlProvider locale="ja" messages={japanese}><Example content={content} /></IntlProvider>)
}

describe('public content translation', () => {
  it('uses only the supported target language', () => {
    expect(translationTarget('zh-Hant')).toBe('zh-tw')
    expect(translationTarget('zh-CN')).toBe('zh-cn')
    expect(translationTarget('ja-JP')).toBe('ja')
    expect(translationTarget('en-US')).toBe('en')
  })

  it('translates by ID on demand and restores the original without a second request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ content: 'こんにちは', contentJson: null }) })
    vi.stubGlobal('fetch', fetchMock)
    show()
    fireEvent.click(screen.getByRole('button', { name: '日本語に翻訳' }))
    expect(await screen.findByText('こんにちは')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/portal/translate')
    expect(JSON.parse(options.body)).toEqual({ kind: 'comment', id: 'comment-1', target: 'ja' })
    fireEvent.click(screen.getByRole('button', { name: '原文を見る' }))
    expect(screen.getByText('Hello')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '日本語に翻訳' }))
    expect(screen.getByText('こんにちは')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps the original and offers retry after a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    show()
    fireEvent.click(screen.getByRole('button', { name: '日本語に翻訳' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('翻訳できませんでした')
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '日本語に翻訳' })).toBeEnabled()
  })

  it('discards a stale response when the source changes during translation', async () => {
    let finish!: (result: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finish = resolve })))
    const rendered = show()
    fireEvent.click(screen.getByRole('button', { name: '日本語に翻訳' }))
    rendered.rerender(<IntlProvider locale="ja" messages={japanese}><Example content="Updated" /></IntlProvider>)
    finish({ ok: true, json: async () => ({ content: '古い翻訳' }) })
    await waitFor(() => expect(screen.getByText('Updated')).toBeInTheDocument())
    expect(screen.queryByText('古い翻訳')).not.toBeInTheDocument()
  })
})
