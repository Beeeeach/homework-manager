/**
 * 「明日以降の予定」ビュー（UpcomingView）が必要とする、複数日分の予測データを算出する。
 * 日をまたいで進捗を引き継ぐ（advanceAssignments）ことで、
 * 同じ宿題の残り時間が複数日に重複して配分されるのを防ぐ。
 *
 * UIコンポーネント（UpcomingView.tsx）からロジックを分離し、
 * 単体テストしやすくするために切り出した。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { getHomeScreenData } from './home-screen-data'
import type { TodayTaskView } from './home-screen-data'
import { advanceAssignments } from './apply-virtual-progress'

export interface UpcomingDayView {
  date: DateString
  tasks: TodayTaskView[]
}

/** YYYY-MM-DD文字列に days 日を加算した YYYY-MM-DD文字列を返す */
export function addDays(dateStr: DateString, days: number): DateString {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 全Assignmentの締切のうち、基準日から最も遠い日までの日数を返す（1未満なら0に補正） */
export function getMaxHorizonDays(date: DateString, assignments: Assignment[]): number {
  if (assignments.length === 0) return 0
  const baseMs = new Date(date).getTime()
  const maxDeadlineMs = Math.max(
    ...assignments.map((a) => new Date(a.deadline).getTime()),
  )
  const diffDays = Math.round((maxDeadlineMs - baseMs) / (24 * 60 * 60 * 1000))
  return Math.max(0, diffDays)
}

/**
 * 基準日の翌日から締切までの各日について、タスクが存在する日だけを抽出して返す。
 * 日をまたぐ進捗の引き継ぎにより、同じ宿題が複数日に重複して満額配分されることはない
 * （1日で終わる宿題は、終わった日以降は登場しなくなる）。
 */
export function buildUpcomingSchedule(
  date: DateString,
  assignments: Assignment[],
  settings: UserSettings,
): UpcomingDayView[] {
  const horizonDays = getMaxHorizonDays(date, assignments)

  const days: UpcomingDayView[] = []
  let workingAssignments = assignments

  for (let i = 1; i <= horizonDays; i++) {
    const targetDate = addDays(date, i)
    const data = getHomeScreenData(targetDate, workingAssignments, settings)

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

  return days
}
