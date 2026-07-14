/**
 * ホーム画面（仕様書16章）が必要とするデータをまとめて算出する。
 * scheduleForDay（フェーズ2）の結果をUI表示用に整形する薄い層。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { scheduleForDay } from './schedule-day'

export interface TodayTaskView {
  assignmentId: string
  title: string
  subject: string
  plannedMinutes: number
}

export interface HomeScreenData {
  /** 今日やる宿題（おすすめ順 = スコアの高い順） */
  todayTasks: TodayTaskView[]
  /** 今日の予定時間（合計、分） */
  totalPlannedMinutes: number
  /** 今日の残り時間（capacity - 予定時間の合計。予定が既にcapacity全体を使い切っていれば0） */
  remainingCapacityMinutes: number
  /** 全体進捗（0〜1）。残り予想時間ベースの単純な完了率 */
  overallProgress: number
}

/** 全宿題のうち、完了している割合（残り予想時間が0になった宿題の割合）を大まかな進捗として算出する */
function calculateOverallProgress(assignments: Assignment[]): number {
  if (assignments.length === 0) return 0
  const completedCount = assignments.filter((a) => a.isCompleted).length
  return completedCount / assignments.length
}

export function getHomeScreenData(
  date: DateString,
  assignments: Assignment[],
  settings: UserSettings,
): HomeScreenData {
  const daySchedule = scheduleForDay(date, assignments, settings)

  const todayTasks: TodayTaskView[] = daySchedule.allocations
    .filter((a) => !a.excludedByMinimum && a.allocatedMinutes > 0)
    // おすすめ順 = スコアの高い順
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((a) => {
      const assignment = assignments.find((x) => x.id === a.assignmentId)!
      return {
        assignmentId: a.assignmentId,
        title: assignment.title,
        subject: assignment.subject,
        plannedMinutes: a.allocatedMinutes,
      }
    })

  const totalPlannedMinutes = todayTasks.reduce((sum, t) => sum + t.plannedMinutes, 0)
  const remainingCapacityMinutes = Math.max(
    0,
    daySchedule.capacityMinutes - totalPlannedMinutes,
  )

  return {
    todayTasks,
    totalPlannedMinutes,
    remainingCapacityMinutes,
    overallProgress: calculateOverallProgress(assignments),
  }
}
