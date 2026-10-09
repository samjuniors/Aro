import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'

import {
  IconBranch,
  IconChevronDown,
  IconFile,
  IconFilePlus,
  IconList,
  IconMore,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSplitVertical,
  IconUndo,
  IconWrapText,
  IconX
} from '@/aro/Icons'
import { FileDiffPanel } from '@/components/chat/diff-lines'
import { DiffSkeleton } from '@/components/chat/skeletons'
import { Codicon } from '@/components/ui/codicon'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { HermesReviewScope } from '@/global'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tip } from '@/components/ui/tooltip'
import { useDelayedTrue } from '@/hooks/use-delayed-true'
import { useI18n } from '@/i18n'
import { displayPath } from '@/lib/display-path'
import { cn } from '@/lib/utils'
import { repoStatusForCwd } from '@/store/coding-status'
import { $panesFlipped } from '@/store/layout'
import { notifyError } from '@/store/notifications'
import {
  $reviewDiff,
  $reviewDiffLoading,
  $reviewFiles,
  $reviewIsRepo,
  $reviewLoading,
  $reviewRevertTarget,
  $reviewScope,
  $reviewSelectedPath,
  cancelRevert,
  clearReviewSelection,
  confirmRevert,
  refreshReview,
  requestRevert,
  reviewRepoCwd,
  selectReviewFile,
  stageReviewFile,
  unstageReviewFile
} from '@/store/review'

import { ReviewShipBar } from './ship-bar'

export function ReviewPane() {
  const { t } = useI18n()
  const c = t.statusStack.coding
  const panesFlipped = useStore($panesFlipped)
  const files = useStore($reviewFiles)
  const loading = useStore($reviewLoading)
  const isRepo = useStore($reviewIsRepo)
  const selectedPath = useStore($reviewSelectedPath)
  const diff = useStore($reviewDiff)
  const diffLoading = useStore($reviewDiffLoading)
  const revertTarget = useStore($reviewRevertTarget)
  const scope = useStore($reviewScope)
  const isUncommitted = scope === 'uncommitted'

  const [filterQuery, setFilterQuery] = useState('')
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('unified')
  const [wrapText, setWrapText] = useState(false)
  const [showRightFiles, setShowRightFiles] = useState(true)

  const cwd = reviewRepoCwd()
  const repoStatus = useStore(repoStatusForCwd(cwd || ''))
  const currentBranch = repoStatus?.branch || 'main'

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return files
    const query = filterQuery.toLowerCase()
    return files.filter(f => f.path.toLowerCase().includes(query))
  }, [files, filterQuery])

  const activePath = selectedPath ?? (files.length > 0 ? files[0].path : null)
  const selectedFile = files.find(file => file.path === activePath)
  const hasFiles = files.length > 0
  const revertingAll = revertTarget?.path == null
  const showDiffSkeleton = useDelayedTrue(diffLoading)

  return (
    <aside
      aria-label={c.review}
      className={cn(
        'codex-changes-container before:pointer-events-none relative flex h-full w-full min-w-0 flex-col overflow-hidden border-(--ui-stroke-secondary) bg-aro-base text-(--ui-text-tertiary)',
        panesFlipped
          ? 'border-r shadow-[inset_-0.0625rem_0_0_color-mix(in_srgb,white_18%,transparent)]'
          : 'border-l shadow-[inset_0.0625rem_0_0_color-mix(in_srgb,white_18%,transparent)]'
      )}
    >
      {/* 1. Subheader: Scope SegmentedControl & Branch pill + Quick actions */}
      <div className="codex-changes-subheader">
        <div className="codex-changes-subheader-left">
          <SegmentedControl<HermesReviewScope>
            onChange={id => {
              $reviewScope.set(id)
              clearReviewSelection()
              void refreshReview()
            }}
            options={[
              { id: 'uncommitted', label: c.scopeUncommitted },
              { id: 'branch', label: c.scopeBranch },
              { id: 'lastTurn', label: c.scopeLastTurn }
            ]}
            value={scope}
          />

          {/* Target branch pill */}
          <button type="button" className="codex-changes-pill-btn codex-branch-target">
            <IconBranch size={10} />
            <span>{currentBranch}</span>
            <span className="opacity-50">→</span>
            <span>origin/{currentBranch}</span>
          </button>
        </div>

        {/* Action icons on right */}
        <div className="codex-changes-subheader-right">
          <Tip label={diffMode === 'split' ? 'Unified diff' : 'Side-by-side diff'}>
            <button
              type="button"
              className={cn('codex-changes-action-icon', diffMode === 'split' && 'text-aro-iris-soft')}
              onClick={() => setDiffMode(m => (m === 'unified' ? 'split' : 'unified'))}
              aria-label="Toggle diff mode"
            >
              <IconSplitVertical size={13} />
            </button>
          </Tip>

          <Tip label={wrapText ? 'Disable word wrap' : 'Enable word wrap'}>
            <button
              type="button"
              className={cn('codex-changes-action-icon', wrapText && 'text-aro-iris-soft bg-aro-hover/80')}
              onClick={() => setWrapText(w => !w)}
              aria-label="Toggle word wrap"
            >
              <IconWrapText size={13} />
            </button>
          </Tip>

          <Tip label={c.stageAll}>
            <button
              type="button"
              aria-label={c.stageAll}
              disabled={!hasFiles || !isUncommitted}
              onClick={() => void stageReviewFile(null).catch(err => notifyError(err, c.stageAll))}
              className={cn('codex-changes-action-icon', (!hasFiles || !isUncommitted) && 'opacity-40 cursor-not-allowed')}
            >
              <IconPlus size={13} />
            </button>
          </Tip>

          <Tip label={c.revertAll}>
            <button
              type="button"
              aria-label={c.revertAll}
              disabled={!hasFiles || !isUncommitted}
              onClick={() => requestRevert(null)}
              className={cn('codex-changes-action-icon', (!hasFiles || !isUncommitted) && 'opacity-40 cursor-not-allowed')}
            >
              <IconUndo size={13} />
            </button>
          </Tip>

          <Tip label={t.rightSidebar.refreshTree}>
            <button
              type="button"
              className="codex-changes-action-icon"
              onClick={() => void refreshReview()}
              aria-label={t.rightSidebar.refreshTree}
            >
              <IconRefresh size={13} />
            </button>
          </Tip>

          <Tip label={showRightFiles ? 'Hide file list' : 'Show file list'}>
            <button
              type="button"
              className={cn('codex-changes-action-icon', !showRightFiles && 'opacity-50')}
              onClick={() => setShowRightFiles(v => !v)}
              aria-label="Toggle file list"
            >
              <IconList size={13} />
            </button>
          </Tip>
        </div>
      </div>

      {/* 2. Main Split View: Left Diff & Empty Stage | Right Filter Files Panel */}
      <div className="codex-changes-split-body">
        {/* Left column: Diff Viewport */}
        <div className="codex-changes-diff-viewport scroll-thin">
          {!hasFiles ? (
            <div className="codex-changes-empty-stage">
              <div className="codex-empty-file-icon-box">
                <IconFilePlus size={36} className="text-aro-ink-4 opacity-75" />
              </div>
              <h3 className="codex-empty-title">No file changes yet</h3>
              <p className="codex-empty-subtitle">Changes in this project will appear here.</p>
            </div>
          ) : selectedFile ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-aro-line-soft px-3 py-2 bg-aro-raise/40">
                <div className="flex items-center gap-2 font-mono text-[12px] text-aro-ink font-medium min-w-0">
                  <IconFile size={13} className="text-aro-ink-4 shrink-0" />
                  <span className="truncate" title={displayPath(selectedFile.path)}>
                    {displayPath(selectedFile.path)}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span className="text-emerald-500 font-semibold">+{selectedFile.added}</span>
                  <span className="text-rose-500 font-semibold">−{selectedFile.removed}</span>
                  {isUncommitted && (
                    <Tip label={selectedFile.staged ? c.unstage : c.stage}>
                      <button
                        type="button"
                        className="codex-changes-action-icon"
                        onClick={() =>
                          void (
                            selectedFile.staged
                              ? unstageReviewFile(selectedFile.path)
                              : stageReviewFile(selectedFile.path)
                          ).catch(err => notifyError(err, c.stage))
                        }
                      >
                        <Codicon name={selectedFile.staged ? 'remove' : 'add'} size="0.75rem" />
                      </button>
                    </Tip>
                  )}
                  {isUncommitted && (
                    <Tip label={c.revert}>
                      <button
                        type="button"
                        className="codex-changes-action-icon hover:text-rose-500"
                        onClick={() => requestRevert(selectedFile.path)}
                      >
                        <Codicon name="discard" size="0.75rem" />
                      </button>
                    </Tip>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                {diffLoading ? (
                  showDiffSkeleton ? <DiffSkeleton /> : null
                ) : diff ? (
                  <FileDiffPanel
                    className="mx-0 mb-0 h-full max-h-none"
                    diff={diff}
                    path={selectedFile.path}
                    virtualized
                  />
                ) : (
                  <div className="py-6 text-center text-[0.66rem] text-muted-foreground/60">{c.noDiff}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="codex-changes-empty-stage">
              <div className="codex-empty-file-icon-box">
                <IconFile size={32} className="text-aro-ink-4 opacity-60" />
              </div>
              <h3 className="codex-empty-title">Select a file to inspect</h3>
              <p className="codex-empty-subtitle">Click on any file in the right list to view its diff.</p>
            </div>
          )}
        </div>

        {/* Right column: Filter files sidebar */}
        {showRightFiles && (
          <div className="codex-changes-files-sidebar">
            <div className="codex-changes-filter-box">
              <IconSearch size={12} className="text-aro-ink-4 shrink-0" />
              <input
                type="text"
                placeholder="Filter files…"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="codex-changes-filter-input"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="text-aro-ink-4 hover:text-aro-ink text-[11px]"
                >
                  <IconX size={11} />
                </button>
              )}
            </div>

            <div className="codex-changes-file-list scroll-thin">
              {filteredFiles.length === 0 ? (
                <div className="codex-no-matching-files">
                  {filterQuery ? `No files match “${filterQuery}”` : 'No modified files'}
                </div>
              ) : (
                filteredFiles.map(file => {
                  const isSelected = activePath === file.path
                  const fileName = file.path.split(/[\\/]+/).pop() || file.path
                  const statusLetter = file.status || 'M'
                  const statusColor =
                    statusLetter === 'A'
                      ? 'text-emerald-500'
                      : statusLetter === 'D'
                        ? 'text-rose-500'
                        : 'text-amber-500'

                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => void selectReviewFile(file)}
                      className={cn('codex-file-row-btn', isSelected && 'is-selected')}
                      title={displayPath(file.path)}
                    >
                      <span className={cn('codex-file-status-letter', statusColor)}>
                        {statusLetter}
                      </span>
                      <span className="codex-file-row-name truncate">{fileName}</span>
                      <span className="codex-file-row-diff font-mono">
                        <span className="text-emerald-500">+{file.added}</span>{' '}
                        <span className="text-rose-500">−{file.removed}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer summary */}
            {files.length > 0 && (
              <div className="codex-files-footer">
                <span className="text-aro-ink-4">{files.length} changed</span>
                {isUncommitted && (
                  <button
                    type="button"
                    onClick={() => void stageReviewFile(null).catch(err => notifyError(err, c.stageAll))}
                    className="text-[11px] font-medium text-aro-iris-soft hover:underline cursor-pointer"
                  >
                    {c.stageAll}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Ship Bar */}
      <ReviewShipBar />

      <ConfirmDialog
        confirmLabel={revertingAll ? c.revertAll : c.revert}
        description={
          <>
            {revertingAll ? c.revertAllConfirm : c.revertConfirm}
            {!revertingAll && revertTarget?.path && (
              <span
                className="mt-2 block truncate font-mono text-[0.7rem] text-(--ui-text-secondary)"
                title={displayPath(revertTarget.path)}
              >
                {displayPath(revertTarget.path)}
              </span>
            )}
          </>
        }
        destructive
        dismissOnConfirm
        onClose={cancelRevert}
        onConfirm={() => confirmRevert().catch(err => void notifyError(err, c.revert))}
        open={revertTarget !== undefined}
        title={revertingAll ? c.revertAll : c.revert}
      />
    </aside>
  )
}
