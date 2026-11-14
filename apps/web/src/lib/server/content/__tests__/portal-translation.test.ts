import { describe, expect, it, vi, afterEach } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { translateDocument } from '../portal-translation'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('public content translation', () => {
  it('translates Korean while preserving structure, media, code and URLs', async () => {
    const doc: JSONContent = { type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'text', text: '안녕하세요', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'https://example.com' },
        { type: 'text', text: 'someCode()', marks: [{ type: 'code' }] },
        { type: 'mention', attrs: { id: 'user1', label: 'Alex' } },
      ] },
      { type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1' }] },
      { type: 'image', attrs: { src: 'https://example.com/a.png' } },
    ] }
    const translate = vi.fn(async (items: string[], language: string) => {
      expect(items).toEqual(['제목', '안녕하세요'])
      expect(language).toBe('ja')
      return ['タイトル', 'こんにちは']
    })
    const result = await translateDocument(doc, '제목', 'ja', translate)
    expect(result.title).toBe('タイトル')
    expect(result.contentJson.content?.[0].content?.[0]).toEqual({ type: 'text', text: 'こんにちは', marks: [{ type: 'bold' }] })
    expect(result.contentJson.content?.[0].content?.slice(1)).toEqual(doc.content?.[0].content?.slice(1))
    expect(result.contentJson.content?.slice(1)).toEqual(doc.content?.slice(1))
    expect(doc.content?.[0].content?.[0].text).toBe('안녕하세요')
  })
  it('rejects a malformed model response', async () => {
    await expect(translateDocument({ type: 'doc', content: [{ type: 'text', text: 'hello' }] }, undefined, 'ja', async () => [])).rejects.toThrow()
  })
  it('checks installed languages and detects each source separately', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://libretranslate:5000')
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json([{ code: 'zh-Hant' }]))
      .mockResolvedValueOnce(Response.json({ translatedText: '標題' }))
      .mockResolvedValueOnce(Response.json({ translatedText: '你好' }))
    vi.stubGlobal('fetch', fetcher)
    const result = await translateDocument({ type: 'doc', content: [{ type: 'text', text: 'hello' }] }, '제목', 'zh-tw')
    expect(result.title).toBe('標題')
    expect(String(fetcher.mock.calls[0][0])).toBe('http://libretranslate:5000/languages')
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ q: '제목', source: 'auto', target: 'zh-Hant', format: 'text' })
    expect(JSON.parse(fetcher.mock.calls[2][1].body).q).toBe('hello')
  })
  it('rejects non-internal translation URLs', async () => {
    vi.stubEnv('LIBRETRANSLATE_URL', 'http://example.com:5000')
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    await expect(translateDocument({ type: 'doc', content: [{ type: 'text', text: 'hello' }] }, undefined, 'ja')).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
