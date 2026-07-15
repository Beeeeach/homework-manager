/**
 * 全宿題の進捗状況確認ビュー。
 * 宿題ごとに進捗率（progress.ts）と締切までの残日数を一覧表示する。
 */

import type { Assignment } from '../domain'
import type { HomeworkType } from '../config/constants'
import { getProgressRatio, getDaysUntilDeadline } from '../engine/progress'

interface ProgressViewProps {
  date: string
  assignments: Assignment[]
}

const TYPE_LABELS: Record<HomeworkType, string> = {
  page: 'ページ型',
  repetition: '反復型',
  creative: '創作型',
  project: 'プロジェクト型',
}

function DeadlineLabel({ days }: { days: number }) {
  if (days < 0) {
    return <span className="text-red-500">締切超過（{Math.abs(days)}日前）</span>
  }
  if (days === 0) {
    return <span className="text-amber-600">今日が締切</span>
  }
  return <span className="text-slate-400">残り{days}日</span>
}

export function ProgressView({ date, assignments }: ProgressViewProps) {
  // 締切が近い順に並べる
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  )

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">全ての宿題の進捗状況</h2>
      </div>

      {sorted.length === 0 && (
        <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-500">
          登録されている宿題はありません。
        </p>
      )}

      {sorted.map((assignment) => {
        const progress = getProgressRatio(assignment)
        const daysLeft = getDaysUntilDeadline(assignment.deadline, date)
        const percent = Math.round(progress * 100)

        return (
          <div
            key={assignment.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{assignment.title}</h3>
                <p className="text-xs text-slate-400">
                  {assignment.subject} ・ {TYPE_LABELS[assignment.type]}
                </p>
              </div>
              <DeadlineLabel days={daysLeft} />
            </div>

            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    assignment.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>{percent}%完了</span>
                {assignment.isCompleted && (
                  <span className="text-emerald-600">完了済み</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
