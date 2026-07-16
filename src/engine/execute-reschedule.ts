/**
 * リスケジュールの実行（仕様書12.2「再配分：NearRange内の対象日について、
 * 10.2③の割当ロジックを再実行する」に対応）
 *
 * decideRescheduleRangeで決定した対象日について、scheduleForDay（10.2①〜③）を
 * 再実行し、AllocationLog生成に必要な情報も含めて返す。
 *
 * 【日をまたぐ進捗の扱い】
 * 複数日分をまとめて予測するため、ある日に配分された分（allocatedMinutes）は
 * 翌日の計算に進む前に、仮想的にAssignmentの進捗として反映する
 * （advanceAssignments）。これをしないと、同じ残り時間が日をまたいで
 * 重複配分されてしまう。これはあくまで予測用の仮想進捗であり、
 * 実際のAssignmentデータやユーザーの学習記録は変更しない。
 */

import type { Assignment, DateString, UserSettings, AllocationTrigger } from '../domain'
import { scheduleForDay } from './schedule-day'
import type { DayScheduleResult } from './schedule-day'
import { decideRescheduleRange } from './reschedule'
import type { RescheduleLevel } from './reschedule'
import { advanceAssignments } from './apply-virtual-progress'

export interface RescheduleResult {
  level: RescheduleLevel
  trigger: AllocationTrigger
  daySchedules: DayScheduleResult[]
}

/** レベルに対応するAllocationTriggerへの変換 */
function levelToTrigger(level: RescheduleLevel): AllocationTrigger {
  switch (level) {
    case 'level1_near':
      return 'reschedule_l1'
    case 'level2_medium':
      return 'reschedule_l2'
    case 'level3_full':
      return 'reschedule_l3'
  }
}

/**
 * リスケジュールを実行する。
 * 呼び出し元（UI/ストア層）は、これを12.1の発生タイミング
 * （「今日はここまで」操作／日付変更）でのみ呼び出す責務を持つ。
 */
export function executeReschedule(
  assignments: Assignment[],
  currentDate: DateString,
  settings: UserSettings,
): RescheduleResult {
  const decision = decideRescheduleRange(assignments, currentDate, settings)

  // 日をまたいで進捗を引き継ぐため、mapではなくforループで
  // 「その日の計算に使うAssignment一覧」を毎回更新しながら進める
  let workingAssignments = assignments
  const daySchedules: DayScheduleResult[] = []

  for (const date of decision.targetDates) {
    const daySchedule = scheduleForDay(date, workingAssignments, settings)
    daySchedules.push(daySchedule)
    workingAssignments = advanceAssignments(workingAssignments, daySchedule.allocations)
  }

  return {
    level: decision.level,
    trigger: levelToTrigger(decision.level),
    daySchedules,
  }
}
