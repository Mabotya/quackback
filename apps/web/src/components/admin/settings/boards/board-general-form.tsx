import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateBoardSchema, type UpdateBoardInput } from '@/lib/shared/schemas/boards'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useNavigate } from '@tanstack/react-router'
import { useUpdateBoard } from '@/lib/client/mutations'
import type { BoardId } from '@quackback/ids'

interface Board {
  id: BoardId
  name: string
  slug: string
  description: string | null
  settings?: { hideFromFeedback?: boolean }
}

interface BoardGeneralFormProps {
  board: Board
}

export function BoardGeneralForm({ board }: BoardGeneralFormProps) {
  const mutation = useUpdateBoard()
  const navigate = useNavigate()

  const form = useForm<UpdateBoardInput>({
    resolver: standardSchemaResolver(updateBoardSchema),
    defaultValues: {
      name: board.name,
      description: board.description || '',
    },
  })

  // Name and description save when a field loses focus (or on Enter), so a
  // rename never changes the URL while it is still being typed.
  function onSubmit(data: UpdateBoardInput) {
    mutation.mutate(
      {
        id: board.id,
        name: data.name,
        description: data.description,
      },
      {
        onSuccess: (updated) => {
          if (updated.slug !== board.slug) {
            void navigate({
              to: '/admin/settings/boards/$slug',
              params: { slug: updated.slug },
              search: {},
              replace: true,
            })
          }
        },
      }
    )
  }

  const saveIfChanged = form.handleSubmit((data) => {
    if (data.name !== board.name || (data.description ?? '') !== (board.description ?? '')) {
      onSubmit(data)
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={saveIfChanged} onBlur={() => void saveIfChanged()} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名前</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <label htmlFor="hide-from-feedback" className="text-sm font-medium">
              フィードバック一覧に表示しない
            </label>
            <p className="text-sm text-muted-foreground">
              ロードマップや投稿の詳細は、閲覧権限に応じて表示されます。投稿をチームのみに制限する場合は「アクセス」で設定してください。
            </p>
          </div>
          <Switch
            id="hide-from-feedback"
            checked={board.settings?.hideFromFeedback === true}
            onCheckedChange={(checked) =>
              mutation.mutate({ id: board.id, settings: { hideFromFeedback: checked } })
            }
          />
        </div>
      </form>
    </Form>
  )
}
