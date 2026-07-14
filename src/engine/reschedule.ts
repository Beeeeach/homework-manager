/**
 * リスケジュールエンジン（仕様書 第12章）
 *
 * 発生タイミング（12.1、UIレイヤーの責務）：
 *   - その日の学習を終える操作（アプリを閉じる／「今日はここまで」ボタン）
 *   - 日付が変わったとき
 * 上記のタイミングでのみ、このモジュールの関数を呼び出す想定。
 *
 * レベル判定（12.2〜12.4）：
 *   1. NearRange（初期値3日）: Σ(NearRange内の空きcapacity) ≥ 未完了残タスク時間 なら収まる
 *   2. 収まらなければMediumRange（初期値7日）まで拡大して同様に判定
 *   3. それでも収まらなければ全期間を対象に再計算
 *
 * 「未完了残タスク時間」は、Taskがその日ごとに動的生成される設計（scheduleForDay）のため、
 * 実質的に「全Assignmentの残り予想時間の合計」と同一に扱う（オーバーロード検出と同じ考え方）。
 * 「空きcapacity」は対象範囲の各日のcapacity合計。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { NEAR_RANGE_DAYS, MEDIUM_RANGE_DAYS } from '../config/constants'
import { getTotalRemainingMinutes } from './overload-check'
import { getCapacityMinutes } from './day-weight'
import { addDays, dateRange, isOnOrBefore } from './date-utils'

export type RescheduleLevel = 'level1_near' | 'level2_medium' | 'level3_full'

export interface RescheduleRangeDecision {
  level: RescheduleLevel
  /** 実際に再配分の対象となる日付範囲 */
  targetDates: DateString[]
  totalRemainingMinutes: number
  totalAvailableMinutes: number
}

/**
 * 指定範囲［currentDate, currentDate+rangeDays-1］と休暇終了日のうち、
 * より短い方までの日付リストを返す（休暇終了日を超えて延長はしない）。
 */
function getBoundedRange(
  currentDate: DateString,
  rangeDays: number,
  vacationEnd: DateString,
): DateString[] {
  const naiveEnd = addDays(currentDate, rangeDays - 1)
  const rangeEnd = isOnOrBefore(naiveEnd, vacationEnd) ? naiveEnd : vacationEnd
  if (currentDate > rangeEnd) return []
  return dateRange(currentDate, rangeEnd)
}

function sumCapacity(dates: DateString[], settings: UserSettings): number {
  return dates.reduce((sum, d) => sum + getCapacityMinutes(d, settings), 0)
}

/**
 * リスケジュールのレベル（対象範囲）を判定する。
 * 仕様書12.2〜12.4の3段階判定をそのまま実装する。
 */
export function decideRescheduleRange(
  assignments: Assignment[],
  currentDate: DateString,
  settings: UserSettings,
): RescheduleRangeDecision {
  const totalRemainingMinutes = getTotalRemainingMinutes(assignments)
  const vacationEnd = settings.vacationPeriod.endDate

  // レベル1: NearRange
  const nearDates = getBoundedRange(currentDate, NEAR_RANGE_DAYS, vacationEnd)
  const nearCapacity = sumCapacity(nearDates, settings)
  if (nearCapacity >= totalRemainingMinutes) {
    return {
      level: 'level1_near',
      targetDates: nearDates,
      totalRemainingMinutes,
      totalAvailableMinutes: nearCapacity,
    }
  }

  // レベル2: MediumRange
  const mediumDates = getBoundedRange(currentDate, MEDIUM_RANGE_DAYS, vacationEnd)
  const mediumCapacity = sumCapacity(mediumDates, settings)
  if (mediumCapacity >= totalRemainingMinutes) {
    return {
      level: 'level2_medium',
      targetDates: mediumDates,
      totalRemainingMinutes,
      totalAvailableMinutes: mediumCapacity,
    }
  }

  // レベル3: 全期間再計算
  const fullDates =
    currentDate <= vacationEnd ? dateRange(currentDate, vacationEnd) : []
  const fullCapacity = sumCapacity(fullDates, settings)

  return {
    level: 'level3_full',
    targetDates: fullDates,
    totalRemainingMinutes,
    totalAvailableMinutes: fullCapacity,
  }
}
