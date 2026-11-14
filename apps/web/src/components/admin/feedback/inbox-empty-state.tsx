import { MagnifyingGlassIcon, DocumentIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { useActivationAction } from '@/lib/client/hooks/use-activation-action'
import { ActivationActionButton } from '@/components/admin/activation-action-button'
import { useUserRole } from '@/lib/client/hooks/use-root-context'

interface InboxEmptyStateProps {
  type: 'no-posts' | 'no-results' | 'no-selection'
  onClearFilters?: () => void
}

export function InboxEmptyState({ type, onClearFilters }: InboxEmptyStateProps) {
  const intl = useIntl()
  const isJapanese = intl.locale.toLowerCase().startsWith('ja')
  const userRole = useUserRole()
  const activationAction = useActivationAction('feedback_empty')
  const isAdmin = userRole === 'admin'

  if (type === 'no-results') {
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title={isJapanese ? '条件に一致する投稿がありません' : 'No results for these filters'}
        description={
          isJapanese
            ? '検索条件や絞り込みを変更してください。'
            : 'Try adjusting your search or filter criteria.'
        }
        action={
          onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              {isJapanese ? '絞り込みをすべて解除' : 'Clear all filters'}
            </Button>
          )
        }
      />
    )
  }

  if (type === 'no-posts') {
    return (
      <div data-tour="feedback-empty">
        <EmptyState
          icon={SparklesIcon}
          title={intl.formatMessage({
            id: 'onboarding.feedback.empty',
            defaultMessage: 'No posts yet',
          })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {isAdmin && activationAction && (
                <ActivationActionButton
                  action={activationAction}
                  surface="feedback_empty"
                  className="h-11 sm:h-9"
                />
              )}
            </div>
          }
        />
      </div>
    )
  }

  // no-selection
  return (
    <EmptyState
      icon={DocumentIcon}
      title={isJapanese ? '投稿を選択' : 'Select a post'}
      description={
        isJapanese
          ? '一覧から投稿を選ぶと詳細を表示します。'
          : 'Choose a post from the list to view its details.'
      }
      className="h-full"
    />
  )
}
