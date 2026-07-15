/**
 * 宿題優先度（Task Priority）の計算（仕様書 10.2①）
 *
 *   優先度 = (残り予想時間 ÷ 実効残り日数) × タイプ係数
 *
 * ベースはEDF（Earliest Deadline First）の考え方。
 *
 * 「実効残り日数」は、本来の締切から一定のバッファ（settings.deadlineBuffer）を
 * 前倒しした日数。これにより、締切ぎりぎりまで使い切るスケジュールではなく、
 * 数日分の余裕を残して終わるペースで配分されるようになる。
 */

import type { Assignment, DateString, UserSettings } from '../domain'
import { TYPE_COEFFICIENT } from '../config/constants'
import { getRemainingMinutes } from './remaining-time'
import { diffDays } from './date-utils'

/**
 * 残り日数を算出する（バッファ適用前の素の値）。
 * 締切当日も作業可能とみなし、当日を含めて数える。
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
 * 締切バッファを適用した「実効残り日数」を算出する。
 * fixedモード: 残り日数からfixedDays分を差し引く
 * percentageモード: 残り日数にpercentage分を掛けて差し引く
 * いずれも最低1日を下回らない。
 */
export function getEffectiveRemainingDays(
  currentDate: DateString,
  deadline: DateString,
  settings: UserSettings,
): number {
  const rawRemainingDays = getRemainingDays(currentDate, deadline)
  const buffer = settings.deadlineBuffer

  const bufferDays =
    buffer.mode === 'fixed'
      ? buffer.fixedDays
      : rawRemainingDays * buffer.percentage

  return Math.max(1, rawRemainingDays - bufferDays)
}

/**
 * 宿題1件の優先度スコアを算出する。
 * 残り予想時間が0（＝完了扱い）の場合は0を返す。
 */
export function calculatePriority(
  assignment: Assignment,
  currentDate: DateString,
  settings: UserSettings,
): number {
  const remainingMinutes = getRemainingMinutes(assignment)
  if (remainingMinutes <= 0) return 0

  const effectiveRemainingDays = getEffectiveRemainingDays(
    currentDate,
    assignment.deadline,
    settings,
  )
  const typeCoefficient = TYPE_COEFFICIENT[assignment.type]

  return (remainingMinutes / effectiveRemainingDays) * typeCoefficient
}

/**
 * 「今日やらないと終わらない」緊急判定に使う、バッファ適用前の素の残り日数。
 * 集中配分ロジック（allocate-capacity.ts）で、下限ブロックに満たない宿題を
 * スキップしてよいか（＝まだ余裕があるか）を判断するために使う。
 */
export function isUrgent(
  currentDate: DateString,
  deadline: DateString,
): boolean {
  return getRemainingDays(currentDate, deadline) <= 1
}
