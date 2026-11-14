import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { AttributeList, type AttributeListItem } from './attribute-list'

const ATTRIBUTE_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
] as const

export type ScalarAttributeType = (typeof ATTRIBUTE_TYPES)[number]['value']

const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'BRL',
] as const

export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export interface ScalarAttributeFormValues {
  key: string
  label: string
  description: string
  type: ScalarAttributeType
  currencyCode: string
  externalKey: string
}

/** The fields the shared list reads from a stored attribute definition. */
export interface ScalarAttribute {
  id: string
  key: string
  label: string
  description: string | null
  type: string
  currencyCode: string | null
  externalKey: string | null
}

/** A fixed field listed ahead of the custom attributes. */
export interface BuiltinAttributeField {
  key: string
  label: string
  type: string
  description?: string
}

/** The copy that differs between the entities a list serves. */
export interface ScalarAttributeCopy {
  /** Dialog title when creating, e.g. "New user attribute". */
  createTitle: string
  keyHint: string
  keyPlaceholder: string
  labelPlaceholder: string
  descriptionPlaceholder: string
  /** The external system the mapping field names, e.g. "CDP". */
  externalSystem: string
  externalPlaceholder: string
  externalHint: string
  deleteDescription: string
}

interface ScalarAttributeListProps<T extends ScalarAttribute> {
  initialAttributes: T[]
  builtinFields: readonly BuiltinAttributeField[]
  copy: ScalarAttributeCopy
  emptyDescription?: string
  onCreate: (values: ScalarAttributeFormValues) => Promise<T>
  onUpdate: (id: T['id'], values: ScalarAttributeFormValues) => Promise<T>
  onDelete: (id: T['id']) => Promise<unknown>
  isCreating?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
  locale?: string
}

function typeLabel(type: string, currencyCode?: string | null, ja = false): string {
  const translations: Record<string, string> = {
    string: 'テキスト',
    number: '数値',
    boolean: '真偽値',
    date: '日付',
    currency: '通貨',
  }
  const base =
    (ja && translations[type]) || ATTRIBUTE_TYPES.find((t) => t.value === type)?.label || type
  return type === 'currency' && currencyCode ? `${base} · ${currencyCode}` : base
}

interface AttributeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  copy: ScalarAttributeCopy
  initialValues?: Partial<ScalarAttributeFormValues>
  isEditing?: boolean
  onSubmit: (values: ScalarAttributeFormValues) => Promise<void>
  isPending?: boolean
  ja?: boolean
}

function AttributeFormDialog({
  open,
  onOpenChange,
  copy,
  initialValues,
  isEditing = false,
  onSubmit,
  isPending,
  ja = false,
}: AttributeFormDialogProps) {
  const [key, setKey] = useState(initialValues?.key ?? '')
  const [label, setLabel] = useState(initialValues?.label ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [type, setType] = useState<ScalarAttributeType>(initialValues?.type ?? 'string')
  const [currencyCode, setCurrencyCode] = useState(initialValues?.currencyCode ?? 'USD')
  const [externalKey, setExternalKey] = useState(initialValues?.externalKey ?? '')

  useEffect(() => {
    if (open) {
      setKey(initialValues?.key ?? '')
      setLabel(initialValues?.label ?? '')
      setDescription(initialValues?.description ?? '')
      setType(initialValues?.type ?? 'string')
      setCurrencyCode(initialValues?.currencyCode ?? 'USD')
      setExternalKey(initialValues?.externalKey ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ key, label, description, type, currencyCode, externalKey })
  }

  const canSubmit = key.trim().length > 0 && label.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (ja ? '属性を編集' : 'Edit attribute') : copy.createTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="attr-key">
              {ja ? 'キー' : 'Key'}{' '}
              <span className="text-muted-foreground font-normal text-xs">({copy.keyHint})</span>
            </Label>
            <Input
              id="attr-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder={copy.keyPlaceholder}
              disabled={isEditing}
              className={isEditing ? 'text-muted-foreground' : ''}
              required
            />
            {!isEditing && (
              <p className="text-[11px] text-muted-foreground">
                {ja
                  ? '半角小文字、数字、アンダースコアのみ使用できます。作成後は変更できません。'
                  : 'Lowercase letters, numbers, underscores only. Cannot be changed after creation.'}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attr-label">{ja ? '表示名' : 'Display label'}</Label>
            <Input
              id="attr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={copy.labelPlaceholder}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>{ja ? '種類' : 'Type'}</Label>
            <Select value={type} onValueChange={(v) => setType(v as ScalarAttributeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {ja ? typeLabel(t.value, null, true) : t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'currency' && (
            <div className="space-y-1.5">
              <Label>{ja ? '通貨' : 'Currency'}</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="attr-desc">
              {ja ? '説明' : 'Description'}{' '}
              <span className="text-muted-foreground font-normal">
                {ja ? '（任意）' : '(optional)'}
              </span>
            </Label>
            <Textarea
              id="attr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={copy.descriptionPlaceholder}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attr-external-key">
              {copy.externalSystem} {ja ? '属性名' : 'attribute name'}{' '}
              <span className="text-muted-foreground font-normal text-xs">
                {ja ? '（任意）' : '(optional)'}
              </span>
            </Label>
            <Input
              id="attr-external-key"
              value={externalKey}
              onChange={(e) => setExternalKey(e.target.value)}
              placeholder={copy.externalPlaceholder}
            />
            <p className="text-[11px] text-muted-foreground">{copy.externalHint}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {ja ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {ja
                ? isPending
                  ? '保存中…'
                  : isEditing
                    ? '変更を保存'
                    : '属性を作成'
                : isPending
                  ? 'Saving...'
                  : isEditing
                    ? 'Save changes'
                    : 'Create attribute'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)

/**
 * The attribute list behind Users and Companies: built-in fields first, then
 * the custom attributes, with create, edit and confirmed delete. Each entity
 * passes its own built-in fields, copy and mutations.
 */
export function ScalarAttributeList<T extends ScalarAttribute>({
  initialAttributes,
  builtinFields,
  copy,
  emptyDescription,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
  isDeleting,
  locale,
}: ScalarAttributeListProps<T>) {
  const ja = locale?.startsWith('ja') ?? false
  const [attributes, setAttributes] = useState(initialAttributes)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<T | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)

  const handleCreate = async (values: ScalarAttributeFormValues) => {
    const created = await onCreate(values)
    setAttributes((prev) => [...prev, created].sort(byLabel))
    setCreateOpen(false)
  }

  const handleUpdate = async (values: ScalarAttributeFormValues) => {
    if (!editTarget) return
    const updated = await onUpdate(editTarget.id, values)
    setAttributes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)).sort(byLabel))
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await onDelete(deleteTarget.id)
    setAttributes((prev) => prev.filter((a) => a.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const items: AttributeListItem[] = [
    ...builtinFields.map((f) => ({
      id: `builtin:${f.key}`,
      label: f.label,
      attrKey: f.key,
      typeLabel: typeLabel(f.type, null, ja),
      description: f.description,
      builtin: true,
    })),
    ...attributes.map((a) => ({
      id: a.id,
      label: a.label,
      attrKey: a.key,
      typeLabel: typeLabel(a.type, a.currencyCode, ja),
      description: a.description,
      actions: [
        { label: ja ? '編集' : 'Edit', onSelect: () => setEditTarget(a) },
        { label: ja ? '削除' : 'Delete', onSelect: () => setDeleteTarget(a), destructive: true },
      ],
    })),
  ]

  return (
    <AttributeList
      items={items}
      onNew={() => setCreateOpen(true)}
      emptyDescription={emptyDescription}
      locale={locale}
    >
      <AttributeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        copy={copy}
        onSubmit={handleCreate}
        isPending={isCreating}
        ja={ja}
      />

      <AttributeFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        copy={copy}
        isEditing
        ja={ja}
        initialValues={
          editTarget
            ? {
                key: editTarget.key,
                label: editTarget.label,
                description: editTarget.description ?? '',
                type: editTarget.type as ScalarAttributeType,
                currencyCode: editTarget.currencyCode ?? 'USD',
                externalKey: editTarget.externalKey ?? '',
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isPending={isUpdating}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={ja ? '属性を削除しますか？' : 'Delete attribute?'}
        description={`"${deleteTarget?.label}": ${copy.deleteDescription}`}
        confirmLabel={ja ? '属性を削除' : 'Delete attribute'}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </AttributeList>
  )
}
