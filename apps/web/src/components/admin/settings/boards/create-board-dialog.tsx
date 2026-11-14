import { useState } from 'react'
import { useRouter, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  createBoardSchema,
  type BoardPreset,
  type CreateBoardOutput,
} from '@/lib/shared/schemas/boards'
import { useCreateBoard } from '@/lib/client/mutations'
import { FormError } from '@/components/shared/form-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NewButton } from '@/components/shared/new-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/shared/utils/cn'

interface CreateBoardDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  redirectOnCreate?: boolean
  onCreated?: () => void
}

export function CreateBoardDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  redirectOnCreate = true,
  onCreated,
}: CreateBoardDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen
  const router = useRouter()
  const navigate = useNavigate()
  const mutation = useCreateBoard()
  // "Customize after create" is a UX-only toggle — not part of the
  // submitted payload. Lives outside the form so it doesn't show up in
  // the validation schema (or in mutation input).
  const [customize, setCustomize] = useState(false)

  const form = useForm({
    resolver: standardSchemaResolver(createBoardSchema),
    defaultValues: {
      name: '',
      description: '',
      preset: 'public' as BoardPreset,
    },
  })

  function onSubmit(data: CreateBoardOutput) {
    mutation.mutate(data, {
      onSuccess: (board) => {
        setIsOpen(false)
        form.reset()
        onCreated?.()
        if (redirectOnCreate) {
          // When the admin opted in, deep-link straight to the Access tab
          // for the new board so they can fine-tune the matrix without
          // hunting through the boards list.
          void navigate({
            to: '/admin/settings/boards/$slug',
            params: { slug: board.slug },
            search: customize ? { tab: 'access' } : {},
          })
        }
        setCustomize(false)
        router.invalidate()
      },
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      form.reset()
      setCustomize(false)
      mutation.reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>{trigger ?? <NewButton noun="board">ボードを追加</NewButton>}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>新しいボード</DialogTitle>
              <DialogDescription>
                ユーザーからアイデアを集めるボードを作成します。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {mutation.isError && (
                <FormError message={mutation.error?.message ?? 'エラーが発生しました'} />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ボード名</FormLabel>
                    <FormControl>
                      <Input placeholder="機能リクエスト" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="アイデアを共有し、機能に投票できます"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>アクセス</FormLabel>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <PresetTile
                        active={field.value === 'public'}
                        label="全員"
                        description="誰でも閲覧できます。投票・コメント・投稿にはログインが必要です。"
                        icon={<GlobeAltIcon className="h-3.5 w-3.5" />}
                        onClick={() => field.onChange('public')}
                      />
                      <PresetTile
                        active={field.value === 'private'}
                        label="チームのみ"
                        description="ワークスペースのメンバーのみ。ポータルには表示されません。"
                        icon={<LockClosedIcon className="h-3.5 w-3.5" />}
                        onClick={() => field.onChange('private')}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                <Checkbox
                  id="customize-access"
                  checked={customize}
                  onCheckedChange={(v) => setCustomize(v === true)}
                  aria-label="作成後にアクセス権限を設定する"
                />
                <Label
                  htmlFor="customize-access"
                  className="cursor-pointer text-xs font-normal text-muted-foreground"
                >
                  作成後にアクセス権限を設定する
                  <span className="ml-1">アクセス設定画面を開きます。</span>
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? '作成中...' : 'ボードを作成'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface PresetTileProps {
  active: boolean
  label: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}

/**
 * Preset selector tile — matches the visual vocabulary of the Access
 * tab's preset row (board-access-form.tsx → PresetCard) so the two
 * surfaces feel like the same decision in different contexts.
 */
function PresetTile({ active, label, description, icon, onClick }: PresetTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-stretch gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted/30 hover:bg-muted/60 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        <span className={cn('text-sm font-semibold', active && 'text-primary')}>{label}</span>
      </div>
      <span className="text-xs text-muted-foreground leading-snug">{description}</span>
    </button>
  )
}
