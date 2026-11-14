// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import ja from '@/locales/ja.json'
import tw from '@/locales/zh-tw.json'

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: showError } }))
const { RichTextEditor } = await import('../rich-text-editor')

afterEach(() => { cleanup(); showError.mockReset(); vi.restoreAllMocks() })

describe('editor upload error messages', () => {
  it.each([
    ['ja', ja, '動画を挿入', '動画をアップロードできませんでした。もう一度お試しください。'],
    ['zh-TW', tw, '插入影片', '無法上傳影片，請再試一次。'],
  ])('shows the video failure in %s when a toolbar upload fails', async (locale, messages, label, expected) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', { configurable: true, value: [new File(['test'], 'test.mp4', { type: 'video/mp4' })] })
      this.dispatchEvent(new Event('change'))
    })
    const { container } = render(
      <IntlProvider locale={locale} messages={messages}>
        <RichTextEditor features={{ videos: true }} onVideoUpload={async () => { throw new Error('failed') }} />
      </IntlProvider>
    )
    const editor = await waitFor(() => {
      const element = container.querySelector('.ProseMirror')
      expect(element).not.toBeNull()
      return element!
    })
    expect(editor).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(showError).toHaveBeenCalledWith(expected))
  })
})
