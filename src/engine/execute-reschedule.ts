/**
 * リスケジュールの実行（仕様書12.2「再配分：NearRange内の対象日について、
 * 10.2③の割当ロジックを再実行する」に対応）
 *
 * decideRescheduleRangeで決定した対象日について、scheduleForDay（10.2①〜③）を
 * 再実行し、AllocationLog生成に必要な情報も含めて返す。
 */

import type { Assignment, DateString, UserSettings, AllocationTrigger } from '../domain'
import { scheduleForDay } from './schedule-day'
import type { DayScheduleResult } from './schedule-day'
import { decideRescheduleRange } from './reschedule'
import type { RescheduleLevel } from './reschedule'

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

  const daySchedules = decision.targetDates.map((date) =>
    scheduleForDay(date, assignments, settings),
  )

  return {
    level: decision.level,
    trigger: levelToTrigger(decision.level),
    daySchedules,
  }
}
