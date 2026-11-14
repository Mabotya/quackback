'use client'

import {
  useCreateCompanyAttribute,
  useUpdateCompanyAttribute,
  useDeleteCompanyAttribute,
} from '@/lib/client/mutations'
import type { CompanyAttributeItem } from '@/lib/client/hooks/use-company-attributes-queries'
import type { CompanyAttributeId } from '@quackback/ids'
import {
  ScalarAttributeList,
  type BuiltinAttributeField,
  type CurrencyCode,
  type ScalarAttributeCopy,
} from '@/components/admin/settings/scalar-attribute-list'

/** The standard company columns, listed for discoverability beside the custom rows. */
const COMPANY_STANDARD_FIELDS: BuiltinAttributeField[] = [
  { key: 'name', label: 'Name', type: 'string', description: 'The company name.' },
  {
    key: 'domain',
    label: 'Email domain',
    type: 'string',
    description: 'The email domain that identifies this company (unique).',
  },
  {
    key: 'plan',
    label: 'Plan',
    type: 'string',
    description: 'Free-text plan label shown in the agent sidebar.',
  },
  {
    key: 'mrr',
    label: 'Monthly spend',
    type: 'number',
    description: 'Monthly recurring revenue, stored in cents and shown as currency.',
  },
  { key: 'size', label: 'Size', type: 'string', description: 'Company size, e.g. "11-50".' },
  { key: 'website', label: 'Website', type: 'string', description: 'The company website URL.' },
  {
    key: 'industry',
    label: 'Industry',
    type: 'string',
    description: 'The industry the company operates in.',
  },
]

const COPY: ScalarAttributeCopy = {
  createTitle: 'New company attribute',
  keyHint: 'matches a field in company custom attributes',
  keyPlaceholder: 'contract_value',
  labelPlaceholder: 'Contract value',
  descriptionPlaceholder: 'Annual contract value in USD',
  externalSystem: 'CRM',
  externalPlaceholder: 'annual_contract_value',
  externalHint:
    "Maps an external attribute name to this attribute's internal key. Leave blank to use the key above.",
  deleteDescription:
    'This removes the attribute definition. Existing values on companies are kept but lose their friendly label.',
}

const COPY_JA: ScalarAttributeCopy = {
  createTitle: '企業属性を追加',
  keyHint: '企業のカスタム属性フィールドに対応',
  keyPlaceholder: 'contract_value',
  labelPlaceholder: '契約額',
  descriptionPlaceholder: '米ドルでの年間契約額',
  externalSystem: 'CRM',
  externalPlaceholder: 'annual_contract_value',
  externalHint:
    '外部の属性名をこの属性の内部キーに対応付けます。空欄の場合は上記のキーを使います。',
  deleteDescription:
    '属性の定義を削除します。既存の企業データの値は保持されますが、表示名は使われなくなります。',
}

const COMPANY_FIELDS_JA: Record<string, { label: string; description: string }> = {
  name: { label: '名前', description: '企業名。' },
  domain: { label: 'メールドメイン', description: '企業を識別するメールドメイン（一意）。' },
  plan: { label: 'プラン', description: 'エージェントのサイドバーに表示されるプラン名。' },
  mrr: {
    label: '月額支出',
    description: '月間経常収益。セント単位で保存し、通貨として表示します。',
  },
  size: { label: '規模', description: '企業の規模（例：11〜50人）。' },
  website: { label: 'ウェブサイト', description: '企業のウェブサイトURL。' },
  industry: { label: '業種', description: '企業が事業を行う業種。' },
}

interface CompanyAttributesListProps {
  initialAttributes: CompanyAttributeItem[]
  locale?: string
}

export function CompanyAttributesList({ initialAttributes, locale }: CompanyAttributesListProps) {
  const ja = locale?.startsWith('ja') ?? false
  const createAttr = useCreateCompanyAttribute()
  const updateAttr = useUpdateCompanyAttribute()
  const deleteAttr = useDeleteCompanyAttribute()

  return (
    <ScalarAttributeList
      initialAttributes={initialAttributes}
      builtinFields={
        ja
          ? COMPANY_STANDARD_FIELDS.map((field) => ({
              ...field,
              ...(COMPANY_FIELDS_JA[field.key] ?? {}),
            }))
          : COMPANY_STANDARD_FIELDS
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
          id: id as CompanyAttributeId,
          label: values.label,
          description: values.description || null,
          type: values.type,
          currencyCode: values.type === 'currency' ? (values.currencyCode as CurrencyCode) : null,
          externalKey: values.externalKey || null,
        })
      }
      onDelete={(id) => deleteAttr.mutateAsync(id as CompanyAttributeId)}
    />
  )
}
