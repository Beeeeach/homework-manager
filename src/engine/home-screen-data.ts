/**
 * ホーム画面（仕様書16章）が必要とするデータをまとめて算出する。
 * scheduleForDay（フェーズ2）の結果をUI表示用に整形する薄い層。
 *
 * 変更点: plannedAmount（1日の作業量。ページ型ならページ数、反復型なら項目数）を
 * 追加した。時間（分）だけでなく「何ページ/何個やるか」をUIで表示できるようにするため。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { scheduleForDay } from './schedule-day'

export interface TodayTaskView {
  assignmentId: string
  title: string
  subject: string
  plannedMinutes: number
  /**
   * 1日の作業量。宿題タイプにより意味が異なる:
   *   page: ページ数（小数の場合は端数ページを意味する）
   *   repetition: 項目数
   *   creative/project: undefined（工程比率ベースのため、量による表示は行わない）
   */
  plannedAmount?: number
  /** page型の場合の単位ラベル（例:「ページ」「章」）。repetition型は常に「個」 */
  unitLabel?: string
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

/** 配分された時間（分）から、宿題タイプに応じた作業量（ページ数・項目数）を算出する */
function calculatePlannedAmount(
  assignment: Assignment,
  plannedMinutes: number,
): { amount?: number; unitLabel?: string } {
  switch (assignment.type) {
    case 'page':
      return {
        amount:
          assignment.estimatedMinutesPerPage > 0
            ? plannedMinutes / assignment.estimatedMinutesPerPage
            : undefined,
        unitLabel: assignment.unitLabel?.trim() || 'ページ',
      }
    case 'repetition':
      return {
        amount:
          assignment.estimatedMinutesPerItem > 0
            ? plannedMinutes / assignment.estimatedMinutesPerItem
            : undefined,
        unitLabel: '個',
      }
    case 'creative':
    case 'project':
      return {}
  }
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
      const { amount, unitLabel } = calculatePlannedAmount(assignment, a.allocatedMinutes)
      return {
        assignmentId: a.assignmentId,
        title: assignment.title,
        subject: assignment.subject,
        plannedMinutes: a.allocatedMinutes,
        plannedAmount: amount,
        unitLabel,
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
