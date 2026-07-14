/**
 * 宿題優先度（Task Priority）の計算（仕様書 10.2①）
 *
 *   優先度 = (残り予想時間 ÷ 残り日数) × タイプ係数
 *
 * ベースはEDF（Earliest Deadline First）の考え方。
 */

import type { Assignment, DateString } from '../domain'
import { TYPE_COEFFICIENT } from '../config/constants'
import { getRemainingMinutes } from './remaining-time'
import { diffDays } from './date-utils'

/**
 * 残り日数を算出する。締切当日も作業可能とみなし、当日を含めて数える。
 * 例: currentDate === deadline の場合、残り日数は1（今日1日だけ残っている）。
 * 締切を過ぎている場合でも最低1を返し、ゼロ除算や優先度の発散を防ぐ。
 */
export function getRemainingDays(
  currentDate: DateString,
  deadline: DateString,
): number {
  const diff = diffDays(currentDate, deadline) + 1
  return Math.max(1, diff)
}

/**
 * 宿題1件の優先度スコアを算出する。
 * 残り予想時間が0（＝完了扱い）の場合は0を返す。
 */
export function calculatePriority(
  assignment: Assignment,
  currentDate: DateString,
): number {
  const remainingMinutes = getRemainingMinutes(assignment)
  if (remainingMinutes <= 0) return 0

  const remainingDays = getRemainingDays(currentDate, assignment.deadline)
  const typeCoefficient = TYPE_COEFFICIENT[assignment.type]

  return (remainingMinutes / remainingDays) * typeCoefficient
}
