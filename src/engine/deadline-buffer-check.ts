/**
 * 締切バッファの動的判定（新機能）。
 *
 * 【背景】
 * 締切バッファ（settings.deadlineBuffer）は本来、実際の締切より前倒しした
 * 「実効締切」までに余裕を持って終わらせるための仕組みだったが、
 * 優先度スコアの計算にしか反映されておらず、「実効締切より後（バッファ期間）には
 * 絶対に配分しない」という強制力がなかった。そのため、余裕があると
 * バッファ期間にもなだらかに配分され続け、本来の締切ぎりぎりまで使われてしまっていた。
 *
 * この関数は「その宿題が実効締切までに終わる見込みがあるか」を判定する。
 * 見込みがあれば、実効締切より後（バッファ期間）はスケジューリング対象から除外してよい。
 * 見込みがなければ（進捗が遅れている）、バッファを解放し、本来の締切まで使ってよい。
 *
 * 判定方法: 実効締切までの「残りcapacity合計」と、宿題の「残り必要時間」を比較する。
 * 残りcapacity合計 >= 残り必要時間 なら、実効締切までに間に合う見込みと判定する。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { dateRange, diffDays } from './date-utils'
import { getCapacityMinutes } from './day-weight'
import { getRemainingMinutes } from './remaining-time'
import { getEffectiveRemainingDays } from './priority'

/**
 * 指定した宿題の「実効締切」の日付を計算する。
 * getEffectiveRemainingDaysは「日数」を返すため、これを実際の日付に変換する。
 */
export function getEffectiveDeadline(
  currentDate: DateString,
  deadline: DateString,
  settings: UserSettings,
): DateString {
  const effectiveRemainingDays = getEffectiveRemainingDays(currentDate, deadline, settings)
  // 実効残り日数は「当日を含めた残り日数」なので、実効締切 = currentDate + (日数 - 1)
  const daysToAdd = effectiveRemainingDays - 1
  const dates = dateRange(currentDate, deadline)
  const index = Math.min(daysToAdd, dates.length - 1)
  return dates[Math.max(0, index)] ?? deadline
}

/**
 * 指定した宿題が、実効締切までに終わる見込みがあるかどうかを判定する。
 * 見込みがある（capacity合計 >= 残り必要時間）ならtrue。
 * この場合、実効締切より後（バッファ期間）はスケジューリング対象外にしてよい。
 * 見込みがない（進捗が遅れている）ならfalse。この場合はバッファを解放し、
 * 本来の締切まで使ってよいと判定する。
 */
export function isOnTrackForEffectiveDeadline(
  assignment: Assignment,
  currentDate: DateString,
  settings: UserSettings,
): boolean {
  const remainingMinutes = getRemainingMinutes(assignment)
  if (remainingMinutes <= 0) return true

  const effectiveDeadline = getEffectiveDeadline(currentDate, assignment.deadline, settings)

  // 実効締切が今日より前（バッファがすでに残り日数を使い切っている等）の場合は、
  // 判定不能とみなし「間に合わない」扱いにして安全側に倒す
  if (diffDays(currentDate, effectiveDeadline) < 0) return false

  const datesUntilEffectiveDeadline = dateRange(currentDate, effectiveDeadline)
  const totalCapacity = datesUntilEffectiveDeadline.reduce(
    (sum, date) => sum + getCapacityMinutes(date, settings),
    0,
  )

  return totalCapacity >= remainingMinutes
}

/**
 * 指定日が、対象宿題にとって「スケジューリング対象になりうる日」かどうかを判定する。
 * - 実効締切までに間に合う見込みがある場合: 指定日が実効締切以前ならtrue（バッファ期間は対象外）
 * - 実効締切までに間に合う見込みがない場合（遅れている）: 指定日が本来の締切以前ならtrue（バッファ解放）
 */
export function isDateWithinSchedulableRange(
  assignment: Assignment,
  date: DateString,
  currentDate: DateString,
  settings: UserSettings,
): boolean {
  const onTrack = isOnTrackForEffectiveDeadline(assignment, currentDate, settings)

  if (onTrack) {
    const effectiveDeadline = getEffectiveDeadline(currentDate, assignment.deadline, settings)
    return diffDays(date, effectiveDeadline) >= 0
  }

  // 遅れている場合はバッファを解放し、本来の締切まで対象にする
  return diffDays(date, assignment.deadline) >= 0
}
