import { useEffect, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { TiptapContent } from '@/lib/shared/db-types'

type TranslationTarget = 'ja' | 'en' | 'zh-tw' | 'zh-cn'
export interface TranslatedContent {
  content: string
  contentJson?: TiptapContent | null
  title?: string
}

/** Only the languages offered by this site's language menu are valid targets. */
export function translationTarget(locale: string): TranslationTarget {
  const normalized = locale.toLowerCase()
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja'
  if (normalized === 'zh-tw' || normalized.startsWith('zh-hant')) return 'zh-tw'
  if (normalized === 'zh-cn' || normalized.startsWith('zh-hans') || normalized === 'zh') return 'zh-cn'
  return 'en'
}

export function useContentTranslation({ kind, id, sourceKey }: {
  kind: 'post' | 'comment'
  id: string
  /** Reset stale translations when the author edits the underlying content. */
  sourceKey: string
}) {
  const intl = useIntl()
  const target = translationTarget(intl.locale)
  const [translated, setTranslated] = useState<TranslatedContent | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const language = useMemo(() => {
    try {
      return new Intl.DisplayNames([intl.locale], { type: 'language' }).of(target) ?? target
    } catch {
      return target
    }
  }, [intl.locale, target])

  useEffect(() => {
    controller.current?.abort()
    controller.current = null
    setTranslated(null)
    setShowTranslation(false)
    setLoading(false)
    setError(false)
    return () => { controller.current?.abort() }
  }, [kind, id, target, sourceKey])

  async function toggle() {
    if (loading) return
    if (showTranslation) {
      setShowTranslation(false)
      return
    }
    if (translated) {
      setShowTranslation(true)
      return
    }
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/portal/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, target }),
        signal: request.signal,
      })
      if (!response.ok) throw new Error('Translation failed')
      const result: unknown = await response.json()
      if (!result || typeof result !== 'object' || typeof (result as TranslatedContent).content !== 'string') {
        throw new Error('Invalid translation')
      }
      if (!request.signal.aborted) {
        setTranslated(result as TranslatedContent)
        setShowTranslation(true)
      }
    } catch {
      if (!request.signal.aborted) setError(true)
    } finally {
      if (!request.signal.aborted) {
        setLoading(false)
        controller.current = null
      }
    }
  }

  const control = (
    <div className="mt-2 text-xs">
      <button type="button" className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm disabled:opacity-60" onClick={() => void toggle()} disabled={loading} aria-busy={loading}>
        {loading
          ? intl.formatMessage({ id: 'portal.translation.loading', defaultMessage: 'Translating…' })
          : showTranslation
            ? intl.formatMessage({ id: 'portal.translation.original', defaultMessage: 'See original' })
            : intl.formatMessage({ id: 'portal.translation.translate', defaultMessage: 'Translate to {language}' }, { language })}
      </button>
      {showTranslation && (
        <span className="ms-1 text-muted-foreground">
          {intl.formatMessage({ id: 'portal.translation.disclaimer', defaultMessage: '(Note: translation accuracy may be limited.)' })}
        </span>
      )}
      {error && <p role="alert" className="mt-1 text-destructive">{intl.formatMessage({ id: 'portal.translation.error', defaultMessage: 'Could not translate. Please try again.' })}</p>}
    </div>
  )

  return { translated: showTranslation ? translated : null, control }
}
