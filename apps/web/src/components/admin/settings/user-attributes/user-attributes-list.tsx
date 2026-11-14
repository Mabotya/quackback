'use client'

import {
  useCreateUserAttribute,
  useUpdateUserAttribute,
  useDeleteUserAttribute,
} from '@/lib/client/mutations'
import type { UserAttributeItem } from '@/lib/client/hooks/use-user-attributes-queries'
import type { UserAttributeId } from '@quackback/ids'
import { BUILTIN_FIELDS } from '@/lib/shared/segment-builtin-fields'
import {
  ScalarAttributeList,
  type CurrencyCode,
  type ScalarAttributeCopy,
} from '@/components/admin/settings/scalar-attribute-list'

const COPY: ScalarAttributeCopy = {
  createTitle: 'New user attribute',
  keyHint: 'matches user.metadata field',
  keyPlaceholder: 'mrr',
  labelPlaceholder: 'Monthly revenue',
  descriptionPlaceholder: 'Monthly recurring revenue in USD',
  externalSystem: 'CDP',
  externalPlaceholder: 'monthly_recurring_revenue',
  externalHint:
    "Maps an external attribute name to this attribute's internal key. Leave blank to use the key above.",
  deleteDescription:
    "This removes the attribute definition. Existing segment rules using this attribute key keep working but won't show the friendly label.",
}

const COPY_JA: ScalarAttributeCopy = {
  createTitle: 'ユーザー属性を追加',
  keyHint: 'user.metadataのフィールドに対応',
  keyPlaceholder: 'mrr',
  labelPlaceholder: '月間売上',
  descriptionPlaceholder: '米ドルでの月間経常収益',
  externalSystem: 'CDP',
  externalPlaceholder: 'monthly_recurring_revenue',
  externalHint:
    '外部の属性名をこの属性の内部キーに対応付けます。空欄の場合は上記のキーを使います。',
  deleteDescription:
    '属性の定義を削除します。このキーを使う既存のセグメントルールは機能し続けますが、表示名は使われなくなります。',
}

const BUILTIN_JA: Record<string, { label: string; description: string }> = {
  name: { label: '名前', description: 'プロフィールに表示されるユーザー名。' },
  email: { label: 'メールアドレス', description: 'ユーザーのメールアドレス。' },
  email_verified: {
    label: 'メール認証',
    description: 'ユーザーがメールアドレスを確認済みかどうか。',
  },
  locale: {
    label: 'ロケール',
    description:
      '認証プロバイダーが渡したBCP-47言語タグ（例：ja、en-US）。SSOやOAuthから提供された場合に設定されます。',
  },
}

const USER_BUILTIN_FIELDS = BUILTIN_FIELDS.filter((f) => f.group === 'attribute')

interface UserAttributesListProps {
  initialAttributes: UserAttributeItem[]
  locale?: string
}

export function UserAttributesList({ initialAttributes, locale }: UserAttributesListProps) {
  const ja = locale?.startsWith('ja') ?? false
  const createAttr = useCreateUserAttribute()
  const updateAttr = useUpdateUserAttribute()
  const deleteAttr = useDeleteUserAttribute()

  return (
    <ScalarAttributeList
      initialAttributes={initialAttributes}
      builtinFields={
        ja
          ? USER_BUILTIN_FIELDS.map((field) => ({ ...field, ...(BUILTIN_JA[field.key] ?? {}) }))
          : USER_BUILTIN_FIELDS
      }
      copy={ja ? COPY_JA : COPY}
      locale={locale}
      isCreating={createAttr.isPending}
      isUpdating={updateAttr.isPending}
      isDeleting={deleteAttr.isPending}
      onCreate={(values) =>
        createAttr.mutateAsync({
          key: values.key,
          label: values.label,
          description: values.description || undefined,
          type: values.type,
          currencyCode:
            values.type === 'currency' ? (values.currencyCode as CurrencyCode) : undefined,
          externalKey: values.externalKey || null,
        })
      }
      onUpdate={(id, values) =>
        updateAttr.mutateAsync({
          id: id as UserAttributeId,
          label: values.label,
          description: values.description || null,
          type: values.type,
          currencyCode: values.type === 'currency' ? (values.currencyCode as CurrencyCode) : null,
          externalKey: values.externalKey || null,
        })
      }
      onDelete={(id) => deleteAttr.mutateAsync(id as UserAttributeId)}
    />
  )
}
