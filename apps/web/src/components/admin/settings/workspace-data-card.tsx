import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@heroicons/react/16/solid'
import { Button } from '@/components/ui/button'
import { SettingRow, SettingRows } from '@/components/admin/settings/setting-row'
import { SettingsCard } from '@/components/admin/settings/settings-card'

/** Export lives on Imports & exports; this row points there. */
export function WorkspaceDataCard({ locale }: { locale?: string }) {
  const ja = locale?.startsWith('ja') ?? false
  return (
    <SettingsCard title={ja ? 'データ' : 'Data'}>
      <SettingRows>
        <SettingRow
          label={ja ? 'ワークスペースのデータをエクスポート' : 'Export workspace data'}
          description={
            ja
              ? 'ダウンロードはこのワークスペースに保存され、プラットフォームキーは含まれません。'
              : 'Downloads stay in this workspace. They never include platform keys.'
          }
          control={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/settings/imports">
                <ArrowRightIcon className="size-4" />
                {ja ? 'インポートとエクスポート' : 'Imports & exports'}
              </Link>
            </Button>
          }
        />
      </SettingRows>
      <div className="px-4 pb-4 text-xs text-muted-foreground">
        <a
          href="https://github.com/Mabotya/quackback"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {ja ? 'ソースコード・ライセンス' : 'Source code and license'}
        </a>
      </div>
    </SettingsCard>
  )
}
