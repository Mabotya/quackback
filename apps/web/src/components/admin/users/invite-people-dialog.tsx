import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export interface InvitePeopleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailsInput: string
  messageInput: string
  emailError: string | null
  batchResults: null | { sent: number; failed: Array<{ email: string; error: string }> }
  sendBusy: boolean
  onEmailsChange: (value: string) => void
  onMessageChange: (value: string) => void
  onSend: () => void
}

/**
 * The portal-invite send form, lifted into a Dialog. State is owned by the
 * parent (PortalInvitesSection or InvitationsView) so the dialog can stay
 * open on partial failure (showing the per-address error list) and reset
 * cleanly on close.
 *
 * Shared between:
 *  - Portal Settings ▸ Email invites (PortalAuthTab)
 *  - /admin/users ▸ Invitations view (InvitationsView)
 */
export function InvitePeopleDialog({
  open,
  onOpenChange,
  emailsInput,
  messageInput,
  emailError,
  batchResults,
  sendBusy,
  onEmailsChange,
  onMessageChange,
  onSend,
}: InvitePeopleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ユーザーをサイトに招待</DialogTitle>
          <DialogDescription>
            パスワードなしでログインできる招待リンクを送信します。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSend()
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium">メールアドレス</span>
            <Textarea
              value={emailsInput}
              onChange={(e) => onEmailsChange(e.target.value)}
              placeholder={'alice@acme.com, bob@acme.com\ncarol@acme.com'}
              rows={4}
              className="mt-1.5 font-mono text-sm"
              disabled={sendBusy}
              aria-label="招待するメールアドレス"
              aria-invalid={!!emailError}
              autoFocus
            />
            <span className="text-xs text-muted-foreground mt-1 block">
              カンマ・スペース・改行で区切ってください。一度に最大50件まで指定できます。
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">メッセージ（任意）</span>
            <Textarea
              value={messageInput}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="ぜひフィードバックをお寄せください。"
              rows={3}
              className="mt-1.5 text-sm"
              maxLength={500}
              disabled={sendBusy}
              aria-label="メッセージ（任意）"
            />
          </label>

          {emailError && (
            <p className="text-xs text-destructive" role="alert">
              {emailError}
            </p>
          )}

          {/* Only partial-failure results land here — full-success closes
              the dialog before this can render. */}
          {batchResults && batchResults.failed.length > 0 && (
            <div
              className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-800 dark:text-amber-400"
              role="status"
            >
              <p className="font-medium">
                {batchResults.sent}件送信、{batchResults.failed.length}件失敗しました。
              </p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {batchResults.failed.map((f) => (
                  <li key={f.email}>
                    <span className="font-mono">{f.email}</span>: {f.error}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5">
                送信に失敗したアドレスを入力欄に残しています。確認して再度お試しください。
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={sendBusy || !emailsInput.trim()}>
              {sendBusy ? <ArrowPathIcon className="mr-2 h-3 w-3 animate-spin" /> : null}
              招待を送信
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
