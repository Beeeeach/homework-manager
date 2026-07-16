/**
 * 反復型（RepetitionAssignment）の「頻度（N日に1回）」に関する計算。
 *
 * 【背景】
 * 「20日間の休みで1000単語を毎日3周したい」→ 1日150単語、のように
 * 頻度と周回数から日々の必要量を動的に計算するための補助関数群。
 * 進捗が遅れていれば、残り実施可能回数で残り必要量を再計算するため、
 * 呼び出すたびに「今その時点でやるべき量」が動的に変わる。
 */

import type { DateString, RepetitionAssignment } from '../domain'
import { diffDays } from './date-utils'
import { getFrequencyDays } from '../domain/assignment'
import { getRemainingItems } from './remaining-time'

/**
 * 基準日（currentDate）から締切（deadline）までの間に、
 * 頻度パターン（frequencyDays）に従って何回「実施日」が訪れるかを数える。
 * 当日を1回目の実施日候補として含める（締切当日も実施可能日とみなす）。
 * 締切を過ぎている場合でも、最低1回は返す（ゼロ除算防止）。
 */
export function countRemainingOccurrences(
  assignment: RepetitionAssignment,
  currentDate: DateString,
): number {
  const frequencyDays = getFrequencyDays(assignment)
  const totalDaysRemaining = Math.max(0, diffDays(currentDate, assignment.deadline) + 1)
  const occurrences = Math.ceil(totalDaysRemaining / frequencyDays)
  return Math.max(1, occurrences)
}

/**
 * 今日が実施日にあたるかどうかを判定する。
 * 登録日（createdAt）を起点に、frequencyDays間隔で実施日が訪れると仮定する。
 * 例: frequencyDays=2で登録日が7/20なら、7/20, 7/22, 7/24...が実施日。
 */
export function isOccurrenceDay(
  assignment: RepetitionAssignment,
  currentDate: DateString,
): boolean {
  const frequencyDays = getFrequencyDays(assignment)
  if (frequencyDays <= 1) return true
  const daysSinceStart = diffDays(assignment.createdAt, currentDate)
  if (daysSinceStart < 0) return false
  return daysSinceStart % frequencyDays === 0
}

/**
 * 「今、この時点でやるべき1回あたりの量」を動的に計算する。
 * 残り必要量（周回込みの総必要量 - 累積実施量） ÷ 残り実施可能回数。
 * 進捗が遅れているほど、残り実施回数が減るため1回あたりの量が自動的に増える
 * （＝追い上げペースに動的に調整される）。
 */
export function calculateItemsPerOccurrence(
  assignment: RepetitionAssignment,
  currentDate: DateString,
): number {
  const remainingItems = getRemainingItems(assignment)
  if (remainingItems <= 0) return 0

  const remainingOccurrences = countRemainingOccurrences(assignment, currentDate)
  return remainingItems / remainingOccurrences
}
