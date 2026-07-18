/**
 * オーバーロード検出（仕様書 第9章）
 *
 *   if (Σ全宿題の残り予想時間 > Σ残り期間の勉強可能時間 × 安全係数) {
 *     警告を表示
 *   }
 *
 * 宿題を1件登録するたびに実行する簡易チェック。
 * ブロッキングではなく、あくまで注意喚起（登録自体は継続できる）。
 *
 * 変更点: 安全係数（overloadSafetyFactor）はこれまでconfig/constants.tsの
 * 固定値だったが、UserSettings.advancedSchedulingから取得するようにした。
 * ユーザーが「詳細設定」で調整できる。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { getAdvancedSchedulingSettings } from '../domain/settings'
import { getRemainingMinutes } from './remaining-time'
import { getCapacityMinutes } from './day-weight'
import { dateRange } from './date-utils'

export interface OverloadCheckResult {
  isOverloaded: boolean
  totalRemainingMinutes: number
  totalAvailableMinutes: number
  /** 安全係数適用後の閾値（この値を超えると警告） */
  threshold: number
}

/**
 * 現在日から休暇終了日までの、実際に勉強可能な時間の合計（分）。
 * 固定予定・特別予定による減算も反映される（day-weight.tsのgetCapacityMinutesを利用）。
 * currentDateが休暇期間外（開始前）の場合は休暇開始日から数える。
 */
export function getTotalAvailableMinutes(
  currentDate: DateString,
  settings: UserSettings,
): number {
  const { startDate, endDate } = settings.vacationPeriod
  const rangeStart = currentDate > startDate ? currentDate : startDate

  if (rangeStart > endDate) return 0

  return dateRange(rangeStart, endDate).reduce(
    (sum, date) => sum + getCapacityMinutes(date, settings),
    0,
  )
}

/**
 * 全宿題の残り予想時間の合計（分）。
 * 完了済みの宿題は除外する（残り時間が既に0になるため実質影響しないが、明示的にフィルタする）。
 */
export function getTotalRemainingMinutes(assignments: Assignment[]): number {
  return assignments
    .filter((a) => !a.isCompleted)
    .reduce((sum, a) => sum + getRemainingMinutes(a), 0)
}

/**
 * オーバーロードチェックを実行する。
 * 宿題登録時（新規追加後の全宿題リストを渡す）に呼び出す想定。
 */
export function checkOverload(
  assignments: Assignment[],
  currentDate: DateString,
  settings: UserSettings,
): OverloadCheckResult {
  const totalRemainingMinutes = getTotalRemainingMinutes(assignments)
  const totalAvailableMinutes = getTotalAvailableMinutes(currentDate, settings)
  const overloadSafetyFactor = getAdvancedSchedulingSettings(settings).overloadSafetyFactor
  const threshold = totalAvailableMinutes * overloadSafetyFactor

  return {
    isOverloaded: totalRemainingMinutes > threshold,
    totalRemainingMinutes,
    totalAvailableMinutes,
    threshold,
  }
}
