/**
 * 明日以降の予定確認ビュー。
 * 締切までの全期間について、日付ごとに割り当てられたTaskを一覧表示する。
 * 複数日分の予測ロジック（日をまたぐ進捗の引き継ぎ含む）はengine/upcoming-schedule.tsに分離し、
 * このコンポーネントは表示に専念する。
 */

import type { Assignment, UserSettings } from '../domain'
import { buildUpcomingSchedule } from '../engine/upcoming-schedule'

interface UpcomingViewProps {
  /** 基準日（今日）。この翌日から表示する */
  date: string
  assignments: Assignment[]
  settings: UserSettings
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}（${weekday}）`
}

export function UpcomingView({ date, assignments, settings }: UpcomingViewProps) {
  const days = buildUpcomingSchedule(date, assignments, settings)

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">明日以降の予定</h2>
        <p className="mt-1 text-xs text-slate-400">
          締切までの予定を日付ごとに表示しています
        </p>
      </div>

      {days.length === 0 && (
        <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-500">
          今後の予定はありません。
        </p>
      )}

      {days.map((day) => (
        <div key={day.date} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">
            {formatDateLabel(day.date)}
          </h3>
          <ul className="mt-2 space-y-1">
            {day.tasks.map((task) => (
              <li
                key={task.assignmentId}
                className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
              >
                <span>
                  {task.subject} ・ {task.title}
                </span>
                <span className="text-slate-400">
                  {Math.round(task.plannedMinutes)}分
                  {task.plannedAmount !== undefined && task.unitLabel && (
                    <> （約{Math.ceil(task.plannedAmount)}{task.unitLabel}）</>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
