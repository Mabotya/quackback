import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter, useNavigate } from '@tanstack/react-router'
import { useDeleteBoard } from '@/lib/client/mutations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SettingRow, SettingRows } from '@/components/admin/settings/setting-row'
import type { BoardId } from '@quackback/ids'

interface Board {
  id: BoardId
  name: string
  slug: string
}

interface DeleteBoardFormProps {
  board: Board
}

/** The danger zone row: one outline-red button, with the board name asked for in the dialog. */
export function DeleteBoardForm({ board }: DeleteBoardFormProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const mutation = useDeleteBoard()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setConfirmName('')
  }

  function onConfirm() {
    if (confirmName !== board.name) return
    mutation.mutate(
      { id: board.id },
      {
        onSuccess: () => {
          setOpen(false)
          void navigate({ to: '/admin/settings/boards', search: {} })
          router.invalidate()
        },
        onError: () => toast.error("ボードを削除できませんでした。もう一度お試しください。"),
      }
    )
  }

  return (
    <>
      <SettingRows>
        <SettingRow
          label="このボードを削除"
          description="ボードと投稿、投票、コメントを削除します。"
          control={
            <Button
              type="button"
              variant="outline-destructive"
              size="sm"
              onClick={() => setOpen(true)}
            >
              ボードを削除
            </Button>
          }
        />
      </SettingRows>
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="ボードを削除しますか？"
        description="ボードとその内容を完全に削除します。この操作は取り消せません。"
        variant="destructive"
        confirmLabel="ボードを削除"
        confirmDisabled={confirmName !== board.name}
        isPending={mutation.isPending}
        onConfirm={onConfirm}
      >
        <div className="space-y-2">
          <Label htmlFor="confirm-board-name">
            確認のため <span className="font-mono font-semibold">{board.name}</span> と入力してください
          </Label>
          <Input
            id="confirm-board-name"
            placeholder={board.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>
    </>
  )
}
