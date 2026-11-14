/** Discord destinations may be visible to more people than a site's boards. */
export function canNotifyDiscordPost(
  board: { deletedAt: Date | null; access: { view?: string } | null },
  post: { deletedAt: Date | null; moderationState: string },
): boolean {
  return !board.deletedAt && board.access?.view === 'anonymous' && !post.deletedAt && post.moderationState === 'published'
}
