/**
 * Assignmentの進捗率（0〜1）を算出する。
 * getRemainingMinutes（残り予想時間）と初期推定合計時間から逆算する。
 */

import type { Assignment } from '../domain'
import { getRemainingMinutes } from './remaining-time'
import { getTotalRequiredItems } from '../domain/assignment'

/** Assignmentの「初期時点での推定合計時間（分）」。進捗率の分母として使う */
export function getEstimatedTotalMinutesForAssignment(assignment: Assignment): number {
  switch (assignment.type) {
    case 'page':
      return assignment.totalPages * assignment.estimatedMinutesPerPage
    case 'repetition':
      // 周回込みの総必要量（totalItems × cycleCount）を分母とする
      return getTotalRequiredItems(assignment) * assignment.estimatedMinutesPerItem
    case 'creative':
    case 'project':
      return assignment.estimatedTotalMinutes
  }
}

/**
 * Assignmentの進捗率（0〜1）。
 * isCompletedがtrueなら常に1。
 * 総時間が0（不正な入力等）の場合は0を返す。
 */
export function getProgressRatio(assignment: Assignment): number {
  if (assignment.isCompleted) return 1

  const totalMinutes = getEstimatedTotalMinutesForAssignment(assignment)
  if (totalMinutes <= 0) return 0

  const remainingMinutes = getRemainingMinutes(assignment)
  const ratio = 1 - remainingMinutes / totalMinutes
  return Math.min(1, Math.max(0, ratio))
}

/** 締切までの残日数（当日を0とする）。マイナスなら締切超過 */
export function getDaysUntilDeadline(deadline: string, currentDate: string): number {
  const deadlineMs = new Date(deadline).getTime()
  const currentMs = new Date(currentDate).getTime()
  return Math.round((deadlineMs - currentMs) / (24 * 60 * 60 * 1000))
}
