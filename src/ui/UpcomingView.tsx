/**
 * 明日以降の予定確認ビュー。
 * 締切までの全期間について、日付ごとに割り当てられたTaskを一覧表示する。
 * getHomeScreenDataと同じロジック（scheduleForDay）を日付をずらして呼び出す薄いラッパー。
 */

import type { Assignment, UserSettings } from '../domain'
import { getHomeScreenData } from '../engine/home-screen-data'
import type { TodayTaskView } from '../engine/home-screen-data'
import { advanceAssignments } from '../engine/apply-virtual-progress'

interface UpcomingViewProps {
  /** 基準日（今日）。この翌日から表示する */
  date: string
  assignments: Assignment[]
  settings: UserSettings
}

interface DayView {
  date: string
  tasks: TodayTaskView[]
}

/** YYYY-MM-DD文字列に days 日を加算した YYYY-MM-DD文字列を返す */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 全Assignmentの締切のうち、基準日から最も遠い日までの日数を返す（1未満なら1に補正） */
function getMaxHorizonDays(date: string, assignments: Assignment[]): number {
  if (assignments.length === 0) return 0
  const baseMs = new Date(date).getTime()
  const maxDeadlineMs = Math.max(
    ...assignments.map((a) => new Date(a.deadline).getTime()),
  )
  const diffDays = Math.round((maxDeadlineMs - baseMs) / (24 * 60 * 60 * 1000))
  return Math.max(0, diffDays)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}（${weekday}）`
}

export function UpcomingView({ date, assignments, settings }: UpcomingViewProps) {
  const horizonDays = getMaxHorizonDays(date, assignments)

  const days: DayView[] = []
  // 日をまたいで進捗を引き継ぐため、ループの中で使うassignmentsを都度更新していく。
  // これをしないと、同じ宿題の残り時間が締切までの全日程に重複して配分されてしまう。
  let workingAssignments = assignments
  for (let i = 1; i <= horizonDays; i++) {
    const targetDate = addDays(date, i)
    const data = getHomeScreenData(targetDate, workingAssignments, settings)
    // タスクがある日だけ表示する（宿題がない日を延々と並べても意味がないため）
    if (data.todayTasks.length > 0) {
      days.push({ date: targetDate, tasks: data.todayTasks })
    }
    workingAssignments = advanceAssignments(
      workingAssignments,
      data.todayTasks.map((t) => ({
        assignmentId: t.assignmentId,
        allocatedMinutes: t.plannedMinutes,
      })),
    )
  }

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
                <span className="text-slate-400">{Math.round(task.plannedMinutes)}分</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
